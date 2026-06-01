<script lang="ts">
	import { onMount } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import Navbar from './Navbar.svelte';
	import Messages from './Messages.svelte';
	import MessageInput from './MessageInput.svelte';
	import Markdown from './Markdown.svelte';
	import { vscode } from './vscode';

	type Model = { id: string; name?: string };
	type Chat = { id: string; title: string };
	type Message = {
		id: string;
		role: 'system' | 'user' | 'assistant';
		content: string | Array<Record<string, unknown>>;
		done?: boolean;
		parentId?: string | null;
		model?: string;
	};

	let signedIn = false;
	let baseUrl = '';
	let email = '';
	let password = '';
	let status = 'Disconnected';
	let error = '';
	let models: Model[] = [];
	let chats: Chat[] = [];
	let selectedModel = '';
	let selectedChatId = '';
	let selectedChatTitle = 'New Chat';
	let parentId: string | null = null;
	let prompt = '';
	let messages: Message[] = [];
	let pendingAssistantId = '';
	let loadingChat = false;
	let showSidebar = true;

	const post = (message: Record<string, unknown>) => vscode.postMessage(message);
	$: activeModelName = models.find((model) => model.id === selectedModel)?.name ?? selectedModel;
	$: canSend = Boolean(prompt.trim() && selectedModel && !pendingAssistantId && !loadingChat);

	onMount(() => {
		console.log('[Open WebUI Agent Webview] mounted');
		window.addEventListener('message', (event) => handleHostMessage(event.data));
		post({ type: 'ready' });
	});

	function handleHostMessage(message: any) {
		if (message.type === 'config') {
			baseUrl = message.baseUrl ?? baseUrl;
			return;
		}

		if (message.type === 'signedOut') {
			signedIn = false;
			baseUrl = message.baseUrl ?? baseUrl;
			status = 'Signed out';
			return;
		}

		if (message.type === 'state') {
			signedIn = true;
			baseUrl = message.baseUrl;
			models = message.models ?? [];
			chats = message.chats ?? [];
			selectedModel = selectedModel || models[0]?.id || '';
			status = `Connected as ${message.user?.name ?? message.user?.email ?? 'user'}`;
			error = '';
			return;
		}

		if (message.type === 'socketConnected') {
			status = 'Live socket connected';
			return;
		}

		if (message.type === 'socketDisconnected') {
			status = 'Socket disconnected';
			return;
		}

		if (message.type === 'socketError') {
			status = message.event?.message ?? 'Socket error';
			return;
		}

		if (message.type === 'messageStarted') {
			messages = [...messages, message.userMessage, message.assistantMessage];
			pendingAssistantId = message.assistantMessage.id;
			parentId = message.assistantMessage.id;
			prompt = '';
			return;
		}

		if (message.type === 'requestAccepted') {
			if (message.result?.chat_id && !selectedChatId) {
				selectedChatId = String(message.result.chat_id);
				refreshChats();
			}
			return;
		}

		if (message.type === 'chatLoaded') {
			loadingChat = false;
			selectedChatId = message.chatId ?? '';
			selectedChatTitle = message.title ?? 'New Chat';
			messages = message.messages ?? [];
			parentId = message.parentId ?? messages.at(-1)?.id ?? null;
			const chatModel = message.models?.[0];
			if (chatModel && models.some((model) => model.id === chatModel)) {
				selectedModel = chatModel;
			}
			error = '';
			return;
		}

		if (message.type === 'socketEvent') {
			applySocketEvent(message.event);
			return;
		}

		if (message.type === 'error') {
			baseUrl = message.baseUrl ?? baseUrl;
			status = signedIn ? status : 'Signed out';
			error = message.message;
		}
	}

	function applySocketEvent(event: any) {
		const eventType = event?.data?.type;
		const data = event?.data?.data;
		if (!eventType || !event.message_id) return;

		const idx = messages.findIndex((item) => item.id === event.message_id);
		if (idx === -1) return;

		const next = [...messages];
		const current = { ...next[idx] };
		const currentContent = () => messageText(current.content);

		if (eventType === 'chat:completion') {
			if (data?.choices?.[0]?.delta?.content) {
				current.content = currentContent() + data.choices[0].delta.content;
			}
			if (data?.choices?.[0]?.message?.content) {
				current.content = currentContent() + data.choices[0].message.content;
			}
			if (data?.content) {
				current.content = data.content;
			}
			if (data?.done) {
				current.done = true;
				pendingAssistantId = '';
				parentId = current.id;
				refreshChats();
			}
		}

		if (eventType === 'chat:message:error') {
			current.content = data?.error?.content ?? 'Open WebUI returned an error.';
			current.done = true;
			pendingAssistantId = '';
		}

		if (eventType === 'message') {
			current.content = currentContent() + (data?.content ?? '');
		}

		if (eventType === 'replace') {
			current.content = data?.content ?? current.content;
		}

		next[idx] = current;
		messages = next;
	}

	function signIn() {
		error = '';
		status = 'Signing in...';
		post({ type: 'signIn', email, password, baseUrl });
	}

	function sendMessage() {
		const content = prompt.trim();
		if (!content || !selectedModel || pendingAssistantId) return;
		error = '';
		post({
			type: 'sendMessage',
			content,
			model: selectedModel,
			chatId: selectedChatId || undefined,
			parentId
		});
	}

	function selectChat(chatId: string) {
		selectedChatId = chatId;
		loadingChat = true;
		pendingAssistantId = '';
		post({ type: 'selectChat', chatId });
	}

	function newChat() {
		selectedChatId = '';
		selectedChatTitle = 'New Chat';
		parentId = null;
		messages = [];
		pendingAssistantId = '';
		loadingChat = false;
	}

	function refreshChats() {
		post({ type: 'refresh' });
	}

	function messageText(content: Message['content']) {
		if (typeof content === 'string') return content;
		return content
			.map((part) => {
				if (typeof part.text === 'string') return part.text;
				if (typeof part.content === 'string') return part.content;
				return '';
			})
			.filter(Boolean)
			.join('\n');
	}
</script>

<main class="flex h-screen bg-background">
	{#if !signedIn}
		<!-- Login Screen -->
		<div class="w-full flex items-center justify-center p-4 bg-background">
			<div class="w-full max-w-sm bg-panel-bg border border-panel-border rounded-lg p-6 shadow-lg">
				<div class="mb-6">
					<h1 class="text-2xl font-bold text-foreground mb-1">Open WebUI Agent</h1>
					<p class="text-description-fg text-sm">{status}</p>
				</div>

				<form on:submit|preventDefault={signIn} class="space-y-4">
					<div>
						<label for="server" class="block text-foreground text-sm font-medium mb-2">Server</label>
						<input
							id="server"
							type="url"
							bind:value={baseUrl}
							placeholder="http://localhost:8080"
							class="w-full px-3 py-2 bg-input-bg text-input-fg border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-border"
						/>
					</div>

					<div>
						<label for="email" class="block text-foreground text-sm font-medium mb-2">Email</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							autocomplete="username"
							class="w-full px-3 py-2 bg-input-bg text-input-fg border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-border"
						/>
					</div>

					<div>
						<label for="password" class="block text-foreground text-sm font-medium mb-2">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							autocomplete="current-password"
							class="w-full px-3 py-2 bg-input-bg text-input-fg border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-border"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-2 bg-button-bg text-button-fg rounded-lg font-medium hover:bg-button-hover transition"
					>
						Sign in
					</button>
				</form>

				{#if error}
					<div class="mt-4 p-3 bg-error-bg text-error-fg rounded-lg text-sm">
						{error}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Chat Interface -->
		<div class="flex w-full h-full min-h-0">
			{#if showSidebar}
				<Sidebar
					{chats}
					bind:selectedChatId
					onNewChat={newChat}
					onSelectChat={selectChat}
					onRefreshChats={refreshChats}
				/>
			{/if}

			<div class="flex-1 flex flex-col min-w-0 h-full">
				<Navbar
					title={selectedChatTitle}
					{status}
					modelName={activeModelName}
					onToggleSidebar={() => (showSidebar = !showSidebar)}
					onRefreshChats={refreshChats}
					{showSidebar}
				/>

				<Messages {messages} loading={loadingChat} />

				<MessageInput
					bind:prompt
					{models}
					bind:selectedModel
					disabled={pendingAssistantId || loadingChat || !selectedModel}
					onSendMessage={sendMessage}
				/>
			</div>
		</div>

		{#if error}
			<div class="fixed bottom-4 right-4 p-4 bg-error-bg text-error-fg rounded-lg shadow-lg max-w-sm">
				{error}
			</div>
		{/if}
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	:global(main) {
		font-family: var(--vscode-font-family);
	}
</style>
