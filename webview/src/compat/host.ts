import { vscode } from '../vscode';
import { applyCompatConfig, type CompatConfig } from './config';

type HostRequest =
	| { type: 'compat:getStorage'; key: string }
	| { type: 'compat:setStorage'; key: string; value: string | null }
	| { type: 'auth:getToken' }
	| { type: 'auth:setToken'; token: string }
	| { type: 'auth:clearToken' }
	| { type: 'ready' };

type HostResponse =
	| { type: 'compat:storage'; requestId: string; key: string; value: string | null }
	| { type: 'auth:token'; requestId: string; token: string | null }
	| { type: 'config'; baseUrl: string; features?: Record<string, boolean> }
	| { type: 'signedOut'; baseUrl?: string }
	| { type: 'error'; message: string; requestId?: string };

const PERSISTABLE_KEYS = new Set(['settings', 'locale', 'theme', 'workspaceViewOption']);

let requestCounter = 0;
const pending = new Map<
	string,
	{ resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

let hostListenerInstalled = false;
let bootstrapPromise: Promise<CompatConfig> | null = null;

function installHostListener() {
	if (hostListenerInstalled) {
		return;
	}
	hostListenerInstalled = true;

	window.addEventListener('message', (event) => {
		const message = event.data as HostResponse & { requestId?: string };
		if (!message?.type) {
			return;
		}

		if (message.requestId && pending.has(message.requestId)) {
			const handler = pending.get(message.requestId)!;
			pending.delete(message.requestId);
			if (message.type === 'error') {
				handler.reject(new Error(message.message));
				return;
			}
			if (message.type === 'compat:storage') {
				handler.resolve(message.value);
				return;
			}
			if (message.type === 'auth:token') {
				handler.resolve(message.token);
			}
		}
	});
}

function postRequest<T>(message: HostRequest): Promise<T> {
	installHostListener();
	const requestId = `req-${++requestCounter}`;
	return new Promise<T>((resolve, reject) => {
		pending.set(requestId, {
			resolve: resolve as (value: unknown) => void,
			reject
		});
		vscode.postMessage({ ...message, requestId } as HostRequest & { requestId: string });
	});
}

export function postToHost(message: Record<string, unknown>) {
	vscode.postMessage(message);
}

export async function hostGetStorage(key: string): Promise<string | null> {
	if (!PERSISTABLE_KEYS.has(key)) {
		return inMemoryStorage.get(key) ?? null;
	}
	return postRequest<string | null>({ type: 'compat:getStorage', key });
}

export async function hostSetStorage(key: string, value: string | null): Promise<void> {
	if (!PERSISTABLE_KEYS.has(key)) {
		if (value === null) {
			inMemoryStorage.delete(key);
		} else {
			inMemoryStorage.set(key, value);
		}
		return;
	}
	await postRequest<null>({ type: 'compat:setStorage', key, value });
}

export async function hostGetToken(): Promise<string | null> {
	return postRequest<string | null>({ type: 'auth:getToken' });
}

export async function hostSetToken(token: string): Promise<void> {
	await postRequest<null>({ type: 'auth:setToken', token });
}

export async function hostClearToken(): Promise<void> {
	await postRequest<null>({ type: 'auth:clearToken' });
}

export const inMemoryStorage = new Map<string, string>();

export function waitForHostBootstrap(): Promise<CompatConfig> {
	if (!bootstrapPromise) {
		installHostListener();
		bootstrapPromise = new Promise<CompatConfig>((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				reject(new Error('Timed out waiting for extension host config.'));
			}, 30000);

			const onMessage = (event: MessageEvent) => {
				const message = event.data as HostResponse;
				if (message?.type === 'config') {
					window.clearTimeout(timeout);
					window.removeEventListener('message', onMessage);
					const config: CompatConfig = {
						baseUrl: message.baseUrl,
						features: message.features ?? {}
					};
					applyCompatConfig(config);
					resolve(config);
				}
				if (message?.type === 'signedOut') {
					window.clearTimeout(timeout);
					window.removeEventListener('message', onMessage);
					applyCompatConfig({ baseUrl: message.baseUrl ?? 'http://localhost:8080' });
					resolve({
						baseUrl: message.baseUrl ?? 'http://localhost:8080',
						features: {}
					});
				}
			};

			window.addEventListener('message', onMessage);
			vscode.postMessage({ type: 'ready' });
		});
	}
	return bootstrapPromise;
}
