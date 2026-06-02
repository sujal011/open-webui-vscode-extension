import { io, type Socket } from 'socket.io-client';
import { applyBaseUrl } from './constants';
import {
	applyCompatConfig,
	compatError,
	compatReady,
	getWebuiBaseUrl,
} from './config';
import { waitForHostBootstrap } from './host';
import { installPlatformBridge } from './platform';
import { clearToken, hydrateStorageFromHost, hydrateTokenFromHost, persistTokenToHost } from './storage';
import { installStorageShim } from './storage';
import { navigateToChat } from './router';
import { mobile, showSidebar } from '$lib/stores';
import {
	config,
	models,
	user,
	settings,
	chats,
	socket,
	socketConnected,
	chatId,
	tags,
	pinnedChats,
	tools,
	functions,
	skills
} from '$lib/stores';
import { getAllTags, getPinnedChatList } from '$lib/apis/chats';
import { getTools } from '$lib/apis/tools';
import { getFunctions } from '$lib/apis/functions';
import { getSkills } from '$lib/apis/skills';
import { getBackendConfig, getModels } from './apis-bootstrap';
import { getSessionUser, userSignIn } from '$lib/apis/auths';
import { getChatList } from '$lib/apis/chats';
import { getUserSettings } from '$lib/apis/users';

export type BootstrapState = {
	ready: boolean;
	signedIn: boolean;
	baseUrl: string;
	error: string | null;
};

export const bootstrapState: BootstrapState = {
	ready: false,
	signedIn: false,
	baseUrl: '',
	error: null
};

let socketInstance: Socket | null = null;

export async function initCompat(): Promise<BootstrapState> {
	installStorageShim();
	installPlatformBridge();

	mobile.set(true);
	showSidebar.set(true);

	try {
		const hostConfig = await waitForHostBootstrap();
		applyCompatConfig(hostConfig);
		applyBaseUrl(hostConfig.baseUrl);
		bootstrapState.baseUrl = getWebuiBaseUrl();

		await hydrateStorageFromHost();
		const token = await hydrateTokenFromHost();

		const backendConfig = await getBackendConfig().catch(() => null);
		if (backendConfig) {
			config.set(backendConfig);
		}

		if (!token) {
			bootstrapState.ready = true;
			bootstrapState.signedIn = false;
			compatReady.set(true);
			return { ...bootstrapState };
		}

		await loadAuthenticatedSession(token);
		bootstrapState.ready = true;
		bootstrapState.signedIn = true;
		compatReady.set(true);
		return { ...bootstrapState };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		bootstrapState.error = message;
		compatError.set(message);
		return { ...bootstrapState };
	}
}

export async function signInWithOpenWebui(
	email: string,
	password: string,
	baseUrl?: string
): Promise<void> {
	if (baseUrl) {
		applyCompatConfig({ baseUrl });
		applyBaseUrl(baseUrl);
	}

	const sessionUser = await userSignIn(email, password);
	if (!sessionUser?.token) {
		throw new Error('Open WebUI sign-in did not return a token.');
	}

	localStorage.token = sessionUser.token;
	await persistTokenToHost(sessionUser.token);
	await loadAuthenticatedSession(sessionUser.token);
	bootstrapState.signedIn = true;
	bootstrapState.ready = true;
	bootstrapState.error = null;
	compatError.set(null);
	compatReady.set(true);
}

export async function signOutFromOpenWebui(): Promise<void> {
	disconnectCompatSocket();
	await clearToken();
	user.set(undefined);
	models.set([]);
	chats.set(null);
	settings.set({});
	chatId.set('');
	bootstrapState.signedIn = false;
}

async function loadAuthenticatedSession(token: string): Promise<void> {
	const sessionUser = await getSessionUser(token);
	if (!sessionUser) {
		throw new Error('Could not load Open WebUI session.');
	}

	user.set(sessionUser);

	const [modelList, chatList, userSettings] = await Promise.all([
		getModels(token),
		getChatList(token, 1),
		getUserSettings(token).catch(() => null)
	]);

	models.set(modelList ?? []);
	chats.set(chatList ?? []);

	if (userSettings?.ui) {
		settings.set(userSettings.ui);
	} else if (userSettings) {
		settings.set(userSettings);
	}
	if (userSettings) {
		try {
			localStorage.setItem('settings', JSON.stringify(userSettings));
		} catch {
			// ignore
		}
	}

	const tokenForLoads = localStorage.token || token;
	await Promise.all([
		getAllTags(tokenForLoads)
			.then((t) => tags.set(t ?? []))
			.catch(() => tags.set([])),
		getPinnedChatList(tokenForLoads)
			.then((p) => pinnedChats.set(p ?? []))
			.catch(() => pinnedChats.set([])),
		getTools(tokenForLoads)
			.then((t) => tools.set(t ?? []))
			.catch(() => tools.set([])),
		getFunctions(tokenForLoads)
			.then((f) => functions.set(f ?? []))
			.catch(() => functions.set([])),
		getSkills(tokenForLoads)
			.then((s) => skills.set(s ?? []))
			.catch(() => skills.set([]))
	]);

	connectCompatSocket(token);
}

/** Refresh lists after sign-in or manual reload (used by OpenWebuiShell). */
export async function refreshAppData(): Promise<void> {
	const token = localStorage.token;
	if (!token) return;

	const [modelList, chatList, userSettings] = await Promise.all([
		getModels(token),
		getChatList(token, 1),
		getUserSettings(token).catch(() => null)
	]);

	models.set(modelList ?? []);
	chats.set(chatList ?? []);

	if (userSettings?.ui) {
		settings.set(userSettings.ui);
	}

	await Promise.all([
		getAllTags(token)
			.then((t) => tags.set(t ?? []))
			.catch(() => {}),
		getPinnedChatList(token)
			.then((p) => pinnedChats.set(p ?? []))
			.catch(() => {})
	]);
}

function connectCompatSocket(token: string) {
	disconnectCompatSocket();

	const baseUrl = getWebuiBaseUrl();
	socketInstance = io(baseUrl, {
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		path: '/ws/socket.io',
		transports: ['websocket', 'polling'],
		auth: { token }
	});

	socket.set(socketInstance);

	socketInstance.on('connect', () => {
		socketConnected.set(true);
		socketInstance?.emit('user-join', { auth: { token } });
	});

	socketInstance.on('disconnect', () => {
		socketConnected.set(false);
	});

	socketInstance.on('connect_error', (err) => {
		console.warn('[Open WebUI compat] socket connect_error', err.message);
		socketConnected.set(false);
	});

	socketInstance.on('events', (event) => {
		// Chat.svelte and Sidebar register their own handlers; this keeps the socket warm.
		void event;
	});
}

function disconnectCompatSocket() {
	socketInstance?.disconnect();
	socketInstance = null;
	socket.set(null);
	socketConnected.set(false);
}

export function selectCompatChat(id: string) {
	navigateToChat(id);
}

export function getCompatSocket(): Socket | null {
	return socketInstance;
}

