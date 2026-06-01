<script lang="ts">
	import Markdown from './Markdown.svelte';
	import StatusHistory from './StatusHistory.svelte';
	import CodeExecutions from './CodeExecutions.svelte';

	export let messages: any[] = [];
	export let loading: boolean = false;

	let messagesContainer: HTMLDivElement;

	function messageText(content: any): string {
		if (typeof content === 'string') return content;
		return content
			.map((part: any) => {
				if (typeof part.text === 'string') return part.text;
				if (typeof part.content === 'string') return part.content;
				return '';
			})
			.filter(Boolean)
			.join('\n');
	}

	function scrollToBottom() {
		if (messagesContainer) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 0);
		}
	}

	$: if (messages.length) {
		scrollToBottom();
	}
</script>

<div
	bind:this={messagesContainer}
	class="flex-1 overflow-y-auto flex flex-col gap-3 p-4 min-h-0"
>
	{#if loading}
		<div class="flex items-center justify-center h-full text-description-fg">
			<div class="flex flex-col items-center gap-2">
				<div class="w-6 h-6 border-2 border-description-fg border-t-foreground rounded-full animate-spin"></div>
				<span class="text-sm">Loading chat...</span>
			</div>
		</div>
	{:else if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<div class="text-center">
				<h2 class="text-lg font-semibold text-foreground mb-2">How can I help?</h2>
				<p class="text-description-fg text-sm">Choose an Open WebUI model and start a conversation.</p>
			</div>
		</div>
	{:else}
		{#each messages as message (message.id)}
			<article class="flex gap-3 max-w-full {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div
					class="max-w-lg {message.role === 'user'
						? 'px-4 py-2.5 rounded-lg bg-button-bg text-button-fg rounded-br-none'
						: 'w-full max-w-2xl'}"
				>
					{#if message.role === 'assistant'}
						<!-- Tool Call Status/Execution Display -->
						{#if message.statusHistory && message.statusHistory.length > 0}
							<StatusHistory statusHistory={message.statusHistory} />
						{/if}

						{#if message.code_executions && message.code_executions.length > 0}
							<CodeExecutions codeExecutions={message.code_executions} />
						{/if}

						<!-- Message Content -->
						<div class="px-4 py-2.5 rounded-lg bg-list-hover-bg text-foreground rounded-bl-none">
							<Markdown content={messageText(message.content)} />
						</div>
					{:else}
						<div class="px-4 py-2.5 rounded-lg bg-button-bg text-button-fg rounded-br-none">
							<p class="text-sm whitespace-pre-wrap break-words">{messageText(message.content)}</p>
						</div>
					{/if}
				</div>
			</article>
		{/each}
	{/if}
</div>

<style>
	:global(.hljs) {
		background: var(--vscode-editor-background) !important;
		color: var(--vscode-editor-foreground) !important;
	}
</style>
