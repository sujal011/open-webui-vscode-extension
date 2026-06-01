<script lang="ts">
	export let prompt: string = '';
	export let models: any[] = [];
	export let selectedModel: string = '';
	export let disabled: boolean = false;
	export let onSendMessage: () => void = () => {};

	let textareaElement: HTMLTextAreaElement;

	$: if (textareaElement) {
		textareaElement.style.height = 'auto';
		textareaElement.style.height = Math.min(textareaElement.scrollHeight, 200) + 'px';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			onSendMessage();
		}
	}
</script>

<div class="flex flex-col gap-2 p-4 border-t border-panel-border bg-panel-bg">
	<div class="flex gap-2">
		<textarea
			bind:this={textareaElement}
			bind:value={prompt}
			placeholder="Ask for follow-up changes..."
			rows="1"
			{disabled}
			on:keydown={handleKeydown}
			class="flex-1 px-3 py-2 rounded-lg bg-input-bg text-input-fg border border-input-border resize-none focus:outline-none focus:ring-2 focus:ring-focus-border text-sm"
		></textarea>
	</div>

	<div class="flex items-center gap-2">
		<div class="flex-1">
			<select
				bind:value={selectedModel}
				{disabled}
				title="Select model"
				class="w-full px-3 py-2 rounded-lg bg-input-bg text-input-fg border border-input-border focus:outline-none focus:ring-2 focus:ring-focus-border text-sm"
			>
				{#each models as model}
					<option value={model.id}>{model.name ?? model.id}</option>
				{/each}
			</select>
		</div>

		<button
			on:click={onSendMessage}
			{disabled}
			title="Send message (Shift+Enter for new line)"
			class="px-4 py-2 rounded-lg bg-button-bg text-button-fg hover:bg-button-hover disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex-shrink-0"
		>
			Send
		</button>
	</div>
</div>

<style>
	textarea::placeholder {
		color: var(--vscode-input-placeholderForeground);
	}

	textarea:focus {
		outline: none;
	}
</style>
