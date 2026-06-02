<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { setupI18n } from '$compat/i18n-setup';
	import { signInWithOpenWebui } from '$compat';
	import { getWebuiBaseUrl } from '$compat';
	import { config } from '$lib/stores';
	import SensitiveInput from '$lib/components/common/SensitiveInput.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let initialBaseUrl = '';

	const i18n = setupI18n();

	let email = '';
	let password = '';
	let baseUrl = initialBaseUrl || getWebuiBaseUrl();
	let loading = false;
	let error = '';

	async function signIn() {
		loading = true;
		error = '';
		try {
			await signInWithOpenWebui(email, password, baseUrl);
			toast.success('Signed in');
		} catch (signInError) {
			error = signInError instanceof Error ? signInError.message : String(signInError);
			toast.error(error);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
	<div
		class="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-lg"
	>
		<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
			{$config?.name ?? 'Open WebUI'}
		</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to your Open WebUI server</p>

		<form class="space-y-4" on:submit|preventDefault={signIn}>
			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="server">Server</label>
				<input
					id="server"
					type="url"
					bind:value={baseUrl}
					placeholder="http://localhost:8080"
					class="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					autocomplete="username"
					class="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="password"
					>Password</label
				>
				<SensitiveInput
					id="password"
					bind:value={password}
					placeholder=""
					inputClassName="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-gray-900 dark:bg-white py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
			>
				{#if loading}
					<Spinner className="size-4 mx-auto" />
				{:else}
					Sign in
				{/if}
			</button>
		</form>

		{#if error}
			<p class="mt-4 text-sm text-red-500">{error}</p>
		{/if}
	</div>
</div>
