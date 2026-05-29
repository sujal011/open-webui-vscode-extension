import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import {
	ChatCompletionRequest,
	ChatMessage,
	OpenWebuiClient,
	OpenWebuiModel,
	OpenWebuiSocketEvent
} from './openWebuiClient.js';
import { getWorkspaceToolDescriptors } from './workspaceTools.js';

const TOKEN_SECRET_KEY = 'openWebuiAgent.token';

type WebviewMessage =
	| { type: 'ready' }
	| { type: 'signIn'; email: string; password: string }
	| { type: 'refresh' }
	| { type: 'sendMessage'; content: string; model: string; chatId?: string; parentId?: string | null };

export function activate(context: vscode.ExtensionContext) {
	const provider = new OpenWebuiChatProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('openWebuiAgent.chat', provider, {
			webviewOptions: { retainContextWhenHidden: true }
		}),
		vscode.commands.registerCommand('openWebuiAgent.openChat', async () => {
			await vscode.commands.executeCommand('workbench.view.extension.openWebuiAgent');
		}),
		vscode.commands.registerCommand('openWebuiAgent.signOut', async () => {
			await context.secrets.delete(TOKEN_SECRET_KEY);
			provider.resetSession();
			vscode.window.showInformationMessage('Signed out of Open WebUI Agent.');
		})
	);
}

export function deactivate() {}

class OpenWebuiChatProvider implements vscode.WebviewViewProvider {
	private view: vscode.WebviewView | null = null;
	private client: OpenWebuiClient | null = null;
	private models: OpenWebuiModel[] = [];

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(view: vscode.WebviewView) {
		this.view = view;
		view.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')]
		};
		view.webview.html = this.getHtml(view.webview);
		view.webview.onDidReceiveMessage((message: WebviewMessage) => this.handleMessage(message));
	}

	resetSession() {
		this.client?.disconnectSocket();
		this.client = null;
		this.post({ type: 'signedOut' });
	}

	private async handleMessage(message: WebviewMessage) {
		try {
			if (message.type === 'ready') {
				await this.bootstrap();
				return;
			}

			if (message.type === 'signIn') {
				await this.signIn(message.email, message.password);
				return;
			}

			if (message.type === 'refresh') {
				await this.refreshState();
				return;
			}

			if (message.type === 'sendMessage') {
				await this.sendMessage(message);
			}
		} catch (error) {
			this.postError(error);
		}
	}

	private async bootstrap() {
		const token = await this.context.secrets.get(TOKEN_SECRET_KEY);
		if (!token) {
			this.post({ type: 'signedOut', baseUrl: this.baseUrl });
			return;
		}

		this.client = this.createClient(token);
		await this.refreshState();
		this.client.connectSocket();
	}

	private async signIn(email: string, password: string) {
		this.client = this.createClient('');
		const user = await this.client.signIn(email, password);
		if (!user.token) {
			throw new Error('Open WebUI sign-in did not return a token.');
		}
		await this.context.secrets.store(TOKEN_SECRET_KEY, user.token);
		this.client.setToken(user.token);
		await this.refreshState();
		this.client.connectSocket();
	}

	private async refreshState() {
		if (!this.client) {
			throw new Error('Not signed in.');
		}

		const [user, models, chats] = await Promise.all([
			this.client.getSessionUser(),
			this.client.getModels(),
			this.client.getChats(1)
		]);

		this.models = models;
		this.post({
			type: 'state',
			baseUrl: this.baseUrl,
			user,
			models,
			chats,
			workspaceTools: getWorkspaceToolDescriptors()
		});
	}

	private async sendMessage(message: Extract<WebviewMessage, { type: 'sendMessage' }>) {
		if (!this.client) {
			throw new Error('Not signed in.');
		}

		const model = this.models.find((item) => item.id === message.model);
		if (!model) {
			throw new Error('Select a valid model before sending.');
		}

		const userMessageId = uuidv4();
		const assistantMessageId = uuidv4();
		const now = Math.floor(Date.now() / 1000);
		const userMessage: ChatMessage = {
			id: userMessageId,
			parentId: message.parentId ?? null,
			childrenIds: [assistantMessageId],
			role: 'user',
			content: message.content,
			timestamp: now
		};

		const body: ChatCompletionRequest = {
			stream: true,
			model: model.id,
			messages: [{ role: 'user', content: message.content }],
			model_item: model,
			session_id: this.client.socketId,
			chat_id: message.chatId || undefined,
			id: assistantMessageId,
			parent_id: userMessage.parentId ?? null,
			user_message: userMessage,
			features: {
				memory: true
			},
			background_tasks: {
				title_generation: !message.chatId,
				tags_generation: !message.chatId,
				follow_up_generation: true
			}
		} as ChatCompletionRequest;

		this.post({
			type: 'messageStarted',
			chatId: message.chatId,
			userMessage,
			assistantMessage: {
				id: assistantMessageId,
				parentId: userMessageId,
				childrenIds: [],
				role: 'assistant',
				content: '',
				done: false,
				model: model.id,
				timestamp: now
			}
		});

		const result = await this.client.sendChatCompletion(body);
		this.post({ type: 'requestAccepted', result });
	}

	private createClient(token: string) {
		const client = new OpenWebuiClient(this.baseUrl, token);
		client.on('event', (event: OpenWebuiSocketEvent) => {
			this.post({ type: 'socketEvent', event });
		});
		client.on('socket:connect', (event: unknown) => {
			this.post({ type: 'socketConnected', event });
		});
		client.on('socket:disconnect', (event: unknown) => {
			this.post({ type: 'socketDisconnected', event });
		});
		client.on('socket:error', (event: unknown) => {
			this.post({ type: 'socketError', event });
		});
		return client;
	}

	private get baseUrl() {
		return vscode.workspace
			.getConfiguration('openWebuiAgent')
			.get<string>('baseUrl', 'http://localhost:8080')
			.replace(/\/$/, '');
	}

	private post(payload: Record<string, unknown>) {
		void this.view?.webview.postMessage(payload);
	}

	private postError(error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		this.post({ type: 'error', message });
	}

	private getHtml(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.js')
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.css')
		);
		const nonce = uuidv4();

		return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;" />
		<link rel="stylesheet" href="${styleUri}" />
		<title>Open WebUI Agent</title>
	</head>
	<body>
		<div id="app"></div>
		<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
	</body>
</html>`;
	}
}
