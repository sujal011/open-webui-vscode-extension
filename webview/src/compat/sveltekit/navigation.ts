import { chatId } from '$lib/stores';
import { navigateToChat, routeParams, routePath } from '../router';

export async function goto(
	url: string,
	_opts?: { replaceState?: boolean; noScroll?: boolean; keepFocus?: boolean; invalidateAll?: boolean }
): Promise<void> {
	const normalized = url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] ?? '';
	const path = normalized.replace(/^\//, '');

	if (path === '' || path === '/') {
		routePath.set('/');
		routeParams.set({});
		chatId.set('');
		return;
	}

	const chatMatch = path.match(/^c\/([^/]+)/);
	if (chatMatch) {
		navigateToChat(chatMatch[1]);
		return;
	}

	// Workspace, admin, notes, etc. are not routed in the VS Code webview yet.
	routePath.set(`/${path}`);
	routeParams.set({});
}

export async function invalidate(_url?: string): Promise<void> {
	// No-op in webview; data refresh is driven by stores.
}

export async function beforeNavigate(
	_callback: (navigation: { willUnload: boolean; to: { url: URL } | null }) => void | Promise<void>
): Promise<void> {
	// No-op
}

export const afterNavigate = () => {
	// No-op stub for imports
};

export const disableScrollHandling = () => {
	// No-op
};

export async function invalidateAll(): Promise<void> {
	// No-op
}

