<script lang="ts">
	import { onMount } from 'svelte';

	export let size: 'sm' | 'md' | 'lg' = 'md';

	const sizeMap = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	};
</script>

<div class={`${sizeMap[size]} inline-block animate-spin`} role="status" aria-label="Loading">
	<div class="h-full w-full border-2 border-foreground border-t-transparent rounded-full"></div>
</div>

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	:global(.animate-spin) {
		animation: spin 0.8s linear infinite;
	}
</style>
