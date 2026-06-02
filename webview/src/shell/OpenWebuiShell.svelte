<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import { get } from 'svelte/store';

	import Chat from '$lib/components/chat/Chat.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SettingsModal from '$lib/components/chat/SettingsModal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	import { setupI18n } from '$compat/i18n-setup';
	import { refreshAppData } from '$compat/init';
	import { chatId, showSettings, showSidebar, user, mobile } from '$lib/stores';

	const i18n = setupI18n();
	setContext('i18n', i18n);

	let loaded = false;
	let activeChatId = '';

	$: activeChatId = $chatId;

	onMount(async () => {
		mobile.set(true);
		showSidebar.set(true);
		try {
			await refreshAppData();
		} finally {
			loaded = true;
		}
	});
</script>

<Toaster richColors closeButton position="top-right" />

{#if !loaded || !$user}
	<div class="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
		<Spinner className="size-6" />
	</div>
{:else}
	<div
		class="flex h-full w-full overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
	>
		<Sidebar />
		<main class="flex flex-1 min-w-0 flex-col h-full">
			<Chat chatIdProp={activeChatId} />
		</main>
	</div>

	<SettingsModal bind:show={$showSettings} />
{/if}
