<script lang="ts">
	import { onMount } from 'svelte';
	import { vscode } from './vscode';

	type Model = { id: string; name?: string };
	type Chat = { id: string; title: string };
	type Message = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		done?: boolean;
		parentId?: string | null;
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
	let prompt = '';
	let messages: Message[] = [];
	let pendingAssistantId = '';

	const post = (message: Record<string, unknown>) => vscode.postMessage(message);

	onMount(() => {
		window.addEventListener('message', (event) => handleHostMessage(event.data));
		post({ type: 'ready' });
	});

	function handleHostMessage(message: any) {
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
			prompt = '';
			return;
		}

		if (message.type === 'requestAccepted') {
			if (message.result?.chat_id && !selectedChatId) {
				selectedChatId = String(message.result.chat_id);
			}
			return;
		}

		if (message.type === 'socketEvent') {
			applySocketEvent(message.event);
			return;
		}

		if (message.type === 'error') {
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

		if (eventType === 'chat:completion') {
			if (data?.choices?.[0]?.delta?.content) {
				current.content += data.choices[0].delta.content;
			}
			if (data?.choices?.[0]?.message?.content) {
				current.content += data.choices[0].message.content;
			}
			if (data?.content) {
				current.content = data.content;
			}
			if (data?.done) {
				current.done = true;
				pendingAssistantId = '';
			}
		}

		if (eventType === 'chat:message:error') {
			current.content = data?.error?.content ?? 'Open WebUI returned an error.';
			current.done = true;
			pendingAssistantId = '';
		}

		if (eventType === 'message') {
			current.content += data?.content ?? '';
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
		post({ type: 'signIn', email, password });
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
			parentId: messages.at(-1)?.id ?? null
		});
	}
</script>

<main>
	<header>
		<div>
			<strong>Open WebUI Agent</strong>
			<span>{status}</span>
		</div>
		<button on:click={() => post({ type: 'refresh' })} disabled={!signedIn}>Refresh</button>
	</header>

	{#if !signedIn}
		<section class="login">
			<label>
				Server
				<input value={baseUrl} disabled />
			</label>
			<label>
				Email
				<input bind:value={email} autocomplete="username" />
			</label>
			<label>
				Password
				<input bind:value={password} type="password" autocomplete="current-password" />
			</label>
			<button on:click={signIn}>Sign In</button>
		</section>
	{:else}
		<section class="controls">
			<label>
				Model
				<select bind:value={selectedModel}>
					{#each models as model}
						<option value={model.id}>{model.name ?? model.id}</option>
					{/each}
				</select>
			</label>
			<label>
				Chat
				<select bind:value={selectedChatId}>
					<option value="">New Chat</option>
					{#each chats as chat}
						<option value={chat.id}>{chat.title}</option>
					{/each}
				</select>
			</label>
		</section>

		<section class="messages">
			{#if messages.length === 0}
				<p class="empty">Start a chat using the selected Open WebUI model.</p>
			{/if}
			{#each messages as message}
				<article class:assistant={message.role === 'assistant'}>
					<div>{message.role}</div>
					<p>{message.content}</p>
				</article>
			{/each}
		</section>

		<footer>
			<textarea
				bind:value={prompt}
				placeholder="Ask Open WebUI..."
				on:keydown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						sendMessage();
					}
				}}
			></textarea>
			<button on:click={sendMessage} disabled={!prompt.trim() || !selectedModel || !!pendingAssistantId}>
				Send
			</button>
		</footer>
	{/if}

	{#if error}
		<p class="error">{error}</p>
	{/if}
</main>
