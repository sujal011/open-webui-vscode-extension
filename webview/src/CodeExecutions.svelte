<script lang="ts">
	import Spinner from './Spinner.svelte';

	export let codeExecutions: any[] = [];

	let showCodeBlocks = false;
	let selectedExecution: any = null;

	function getExecutionStatus(execution: any) {
		if (!execution.result) return 'running';
		if (execution.result.error) return 'error';
		if (execution.result.output) return 'success';
		return 'pending';
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success':
				return '✓';
			case 'error':
				return '✕';
			case 'running':
				return '⟳';
			default:
				return '○';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'success':
				return 'text-green-500';
			case 'error':
				return 'text-error-fg';
			case 'running':
				return 'text-yellow-500';
			default:
				return 'text-description-fg';
		}
	}
</script>

{#if codeExecutions.length > 0}
	<div class="mt-2 mb-2 w-full">
		<button
			on:click={() => (showCodeBlocks = !showCodeBlocks)}
			class="flex items-center gap-2 text-sm font-medium text-foreground p-2 rounded-lg hover:bg-list-hover-bg transition"
			title="Toggle code execution details"
		>
			<span>Code Execution</span>
			<span class="text-xs text-description-fg">({codeExecutions.length})</span>
			<span class="ml-auto text-xs">{showCodeBlocks ? '▼' : '▶'}</span>
		</button>

		{#if showCodeBlocks}
			<div class="mt-2 space-y-2 border-l border-panel-border pl-3">
				{#each codeExecutions as execution (execution.id || execution.uuid)}
					<div class="flex gap-2 p-2 rounded-lg bg-panel-bg hover:bg-list-hover-bg transition cursor-pointer"
						on:click={() => (selectedExecution = selectedExecution?.id === execution.id ? null : execution)}
						on:keydown={(e) => e.key === 'Enter' && (selectedExecution = selectedExecution?.id === execution.id ? null : execution)}
						role="button"
						tabindex="0"
					>
						<div class="flex-shrink-0 flex items-center justify-center">
							<div class={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
								getStatusColor(getExecutionStatus(execution))
							}`}>
								{getStatusIcon(getExecutionStatus(execution))}
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-foreground truncate">
								{execution.name || 'code_block'}
							</div>
							{#if execution.language}
								<div class="text-xs text-description-fg">{execution.language}</div>
							{/if}
						</div>
					</div>

					{#if selectedExecution?.id === execution.id || selectedExecution?.uuid === execution.uuid}
						<div class="mt-2 p-3 bg-list-hover-bg rounded-lg text-xs space-y-2">
							{#if execution.code}
								<div>
									<div class="font-medium text-foreground mb-1">Code:</div>
									<pre class="bg-background p-2 rounded overflow-x-auto text-xs"><code>{execution.code}</code></pre>
								</div>
							{/if}

							{#if execution.result}
								{#if execution.result.error}
									<div class="p-2 bg-error-bg rounded">
										<div class="font-medium text-error-fg">Error:</div>
										<pre class="text-error-fg text-xs mt-1 overflow-x-auto"><code>{execution.result.error}</code></pre>
									</div>
								{/if}

								{#if execution.result.output}
									<div>
										<div class="font-medium text-foreground mb-1">Output:</div>
										<pre class="bg-background p-2 rounded overflow-x-auto text-xs"><code>{execution.result.output}</code></pre>
									</div>
								{/if}

								{#if execution.result.files && execution.result.files.length > 0}
									<div>
										<div class="font-medium text-foreground mb-1">Files:</div>
										<div class="space-y-1">
											{#each execution.result.files as file}
												<a
													href={file.url}
													target="_blank"
													rel="noopener noreferrer"
													class="text-focus-border hover:underline text-xs block truncate"
													title={file.name}
												>
													📄 {file.name}
												</a>
											{/each}
										</div>
									</div>
								{/if}
							{:else}
								<div class="flex items-center gap-2">
									<Spinner size="sm" />
									<span class="text-description-fg">Executing...</span>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{/if}
