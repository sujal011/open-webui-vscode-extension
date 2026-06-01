<script lang="ts">
	export let chats: any[] = [];
	export let selectedChatId: string = '';
	export let onNewChat: () => void = () => {};
	export let onSelectChat: (chatId: string) => void = () => {};
	export let onRefreshChats: () => void = () => {};

	let showSidebar = true;

	function truncate(str: string, length: number = 30): string {
		return str.length > length ? str.substring(0, length) + '...' : str;
	}
</script>

<aside class="flex flex-col h-screen w-64 bg-panel-bg border-r border-panel-border overflow-hidden">
	<!-- Sidebar Header -->
	<div class="flex items-center justify-between p-4 border-b border-panel-border gap-2 flex-shrink-0">
		<h2 class="font-semibold text-foreground">Chats</h2>
		<button
			title="Refresh chats"
			on:click={onRefreshChats}
			class="p-1.5 rounded hover:bg-list-hover-bg transition text-foreground text-sm flex-shrink-0"
		>
			↻
		</button>
	</div>

	<!-- New Chat Button -->
	<button
		on:click={onNewChat}
		class="m-3 p-3 bg-button-bg text-button-fg rounded-lg font-medium hover:bg-button-hover transition text-sm flex-shrink-0"
	>
		+ New chat
	</button>

	<!-- Chat List -->
	<nav class="flex-1 overflow-y-auto px-2 py-2 space-y-1 min-h-0">
		{#if chats.length === 0}
			<p class="text-description-fg text-sm px-2 py-4 text-center">No chats yet</p>
		{:else}
			{#each chats as chat (chat.id)}
				<button
					on:click={() => onSelectChat(chat.id)}
					class:selected={chat.id === selectedChatId}
					class="w-full text-left px-3 py-2.5 rounded-lg transition text-sm truncate {chat.id ===
					selectedChatId
						? 'bg-list-selection-bg text-foreground font-medium'
						: 'text-description-fg hover:bg-list-hover-bg'}"
					title={chat.title}
				>
					{truncate(chat.title)}
				</button>
			{/each}
		{/if}
	</nav>
</aside>

<style>
	/* Ensure scrollbar is visible */
	nav::-webkit-scrollbar {
		width: 8px;
	}

	nav::-webkit-scrollbar-track {
		background: transparent;
	}

	nav::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-background);
		border-radius: 4px;
	}

	nav::-webkit-scrollbar-thumb:hover {
		background: var(--vscode-scrollbarSlider-hoverBackground);
	}
</style>
