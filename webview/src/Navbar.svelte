<script lang="ts">
	export let title: string = 'New Chat';
	export let status: string = '';
	export let modelName: string = '';
	export let onToggleSidebar: () => void = () => {};
	export let onRefreshChats: () => void = () => {};
	export let showSidebar: boolean = true;
</script>

<header class="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-panel-bg border-b border-panel-border gap-2">
	<div class="flex items-center gap-2 min-w-0">
		<button
			title={showSidebar ? 'Hide chat list' : 'Show chat list'}
			on:click={onToggleSidebar}
			class="p-1.5 rounded hover:bg-list-hover-bg transition text-foreground flex-shrink-0"
		>
			{showSidebar ? '◀' : '▶'}
		</button>
		<div class="min-w-0">
			<h1 class="font-semibold text-foreground truncate text-sm">{title}</h1>
			{#if modelName || status}
				<p class="text-description-fg text-xs truncate">{modelName} · {status}</p>
			{/if}
		</div>
	</div>
	<button
		title="Refresh"
		on:click={onRefreshChats}
		class="p-1.5 rounded hover:bg-list-hover-bg transition text-foreground flex-shrink-0"
	>
		⋯
	</button>
</header>

<style>
	header {
		background: var(--vscode-sideBar-background);
	}
</style>
