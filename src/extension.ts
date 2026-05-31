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
const output = vscode.window.createOutputChannel('Open WebUI Agent');

type WebviewMessage =
	| { type: 'ready' }
	| { type: 'signIn'; email: string; password: string }
	| { type: 'refresh' }
	| { type: 'sendMessage'; content: string; model: string; chatId?: string; parentId?: string | null };

export function activate(context: vscode.ExtensionContext) {
	log('Activating extension.');
	const provider = new OpenWebuiChatProvider(context);

	context.subscriptions.push(
		output,
		vscode.window.registerWebviewViewProvider('openWebuiAgent.chat', provider, {
			webviewOptions: { retainContextWhenHidden: true }
		}),
		vscode.commands.registerCommand('openWebuiAgent.openChat', async () => {
			log('Open chat command invoked.');
			await vscode.commands.executeCommand('workbench.view.extension.openWebuiAgent');
		}),
		vscode.commands.registerCommand('openWebuiAgent.showLogs', () => {
			output.show();
		}),
		vscode.commands.registerCommand('openWebuiAgent.signOut', async () => {
			log('Sign out command invoked.');
			await context.secrets.delete(TOKEN_SECRET_KEY);
			provider.resetSession();
			vscode.window.showInformationMessage('Signed out of Open WebUI Agent.');
		})
	);

	log('Extension activated.');
}

export function deactivate() {
	log('Deactivating extension.');
}

class OpenWebuiChatProvider implements vscode.WebviewViewProvider {
	private view: vscode.WebviewView | null = null;
	private client: OpenWebuiClient | null = null;
	private models: OpenWebuiModel[] = [];

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(view: vscode.WebviewView) {
		log('Resolving chat webview.');
		this.view = view;
		view.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')]
		};
		view.webview.html = this.getHtml(view.webview);
		log('Chat webview HTML assigned.');
		view.webview.onDidReceiveMessage((message: WebviewMessage) => {
			log(`Received webview message: ${message.type}`);
			void this.handleMessage(message);
		});
	}

	resetSession() {
		log('Resetting Open WebUI session.');
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
		log('Bootstrapping webview state.');
		const token = await this.context.secrets.get(TOKEN_SECRET_KEY);
		if (!token) {
			log('No saved token found. Showing signed-out state.');
			this.post({ type: 'signedOut', baseUrl: this.baseUrl });
			return;
		}

		log('Saved token found. Creating Open WebUI client.');
		this.client = this.createClient(token);
		await this.refreshState();
		this.client.connectSocket();
	}

	private async signIn(email: string, password: string) {
		log(`Signing in to ${this.baseUrl} as ${email}.`);
		this.client = this.createClient('');
		const user = await this.client.signIn(email, password);
		if (!user.token) {
			throw new Error('Open WebUI sign-in did not return a token.');
		}
		await this.context.secrets.store(TOKEN_SECRET_KEY, user.token);
		this.client.setToken(user.token);
		await this.refreshState();
		this.client.connectSocket();
		log('Sign-in completed.');
	}

	private async refreshState() {
		if (!this.client) {
			throw new Error('Not signed in.');
		}

		log('Refreshing Open WebUI state.');
		const [user, models, chats] = await Promise.all([
			this.client.getSessionUser(),
			this.client.getModels(),
			this.client.getChats(1)
		]);

		this.models = models;
		log(`State refreshed. Models: ${models.length}. Chats: ${chats.length}.`);
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

		log(`Sending chat message. Chat: ${message.chatId || 'new'}. Model: ${message.model}.`);
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
		log('Chat completion request accepted by Open WebUI.');
		this.post({ type: 'requestAccepted', result });
	}

	private createClient(token: string) {
		log(`Creating Open WebUI client for ${this.baseUrl}. Token present: ${Boolean(token)}.`);
		const client = new OpenWebuiClient(this.baseUrl, token);
		client.on('event', (event: OpenWebuiSocketEvent) => {
			log(`Socket event received: ${event.data?.type ?? 'unknown'}.`);
			this.post({ type: 'socketEvent', event });
		});
		client.on('socket:connect', (event: unknown) => {
			log(`Socket connected: ${JSON.stringify(event)}.`);
			this.post({ type: 'socketConnected', event });
		});
		client.on('socket:disconnect', (event: unknown) => {
			log(`Socket disconnected: ${JSON.stringify(event)}.`);
			this.post({ type: 'socketDisconnected', event });
		});
		client.on('socket:error', (event: unknown) => {
			log(`Socket error: ${JSON.stringify(event)}.`);
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
		log(`Posting message to webview: ${String(payload.type)}`);
		void this.view?.webview.postMessage(payload);
	}

	private postError(error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		log(`Error: ${message}`);
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
		log(`Webview assets: script=${scriptUri.toString()}, style=${styleUri.toString()}.`);

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

function log(message: string) {
	const line = `[${new Date().toISOString()}] ${message}`;
	output.appendLine(line);
	console.log(`[Open WebUI Agent] ${message}`);
}
