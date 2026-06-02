<script lang="ts">
	import { onMount } from 'svelte';
	import { initCompat } from '$compat';
	import { compatReady, getWebuiBaseUrl } from '$compat';
	import { user } from '$lib/stores';
	import AuthScreen from './shell/AuthScreen.svelte';
	import OpenWebuiShell from './shell/OpenWebuiShell.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	let bootstrapping = true;
	let baseUrl = '';

	$: signedIn = Boolean($user);

	onMount(async () => {
		try {
			const state = await initCompat();
			baseUrl = state.baseUrl || getWebuiBaseUrl();
		} finally {
			bootstrapping = false;
		}
	});
</script>

{#if bootstrapping}
	<div class="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
		<Spinner className="size-6" />
	</div>
{:else if signedIn && $compatReady}
	<OpenWebuiShell />
{:else}
	<AuthScreen {baseUrl} />
{/if}
