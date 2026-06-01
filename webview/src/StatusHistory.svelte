<script lang="ts">
	import Spinner from './Spinner.svelte';

	export let statusHistory: any[] = [];
	export let expand: boolean = false;

	let showHistory = true;

	$: if (expand) {
		showHistory = true;
	} else {
		showHistory = false;
	}

	function getStatusIcon(status: any) {
		if (status.action === 'web_search') return '🌐';
		if (status.action === 'function_call') return '⚙️';
		if (status.action === 'code_execution') return '💻';
		return '→';
	}

	function getStatusColor(status: any) {
		if (!status.done) return 'text-yellow-500';
		return 'text-green-500';
	}
</script>

{#if statusHistory && statusHistory.length > 0}
	<div class="text-xs flex flex-col w-full mt-2 mb-2 gap-1">
		<button
			class="w-full text-left"
			on:click={() => (showHistory = !showHistory)}
			title="Toggle status history"
		>
			<div class="flex items-center gap-2 p-2 rounded-lg hover:bg-list-hover-bg transition">
				<div class="text-sm font-medium text-description-fg">
					{#if statusHistory[statusHistory.length - 1]?.done}
						✓ Completed
					{:else}
						⟳ Processing
					{/if}
				</div>
				<div class="text-xs text-description-fg">({statusHistory.length} step{statusHistory.length !== 1 ? 's' : ''})</div>
			</div>
		</button>

		{#if showHistory}
			<div class="border-l border-panel-border pl-3 space-y-2">
				{#each statusHistory as status, idx}
					<div class="flex items-start gap-2">
						<div class="text-lg {getStatusColor(status)} flex-shrink-0 mt-0.5">
							{#if status.done}
								{#if status.action?.includes('error')}
									✕
								{:else}
									✓
								{/if}
							{:else}
								<Spinner size="sm" />
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-foreground capitalize">
								{status.action?.replace(/_/g, ' ') || 'Action'}
							</div>
							<div class="text-xs text-description-fg mt-0.5 break-words">
								{status.description || ''}
							</div>
							{#if status.urls && status.urls.length > 0}
								<div class="text-xs mt-1 space-y-1">
									{#each status.urls as url}
										<a
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-focus-border hover:underline block truncate"
											title={url}
										>
											{new URL(url).hostname}
										</a>
									{/each}
								</div>
							{/if}
							{#if status.query}
								<div class="text-xs text-description-fg mt-1 italic">
									Query: {status.query}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
