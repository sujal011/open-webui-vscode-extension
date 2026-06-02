import { writable } from 'svelte/store';
import { chatId } from '$lib/stores';

export const routePath = writable<string>('/');
export const routeParams = writable<Record<string, string>>({});

export function navigateToChat(id: string) {
	if (!id) {
		routePath.set('/');
		routeParams.set({});
		chatId.set('');
		return;
	}
	routePath.set('/c/[id]');
	routeParams.set({ id });
	chatId.set(id);
}
