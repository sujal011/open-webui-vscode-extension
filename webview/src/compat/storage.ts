import { hostClearToken, hostGetStorage, hostGetToken, hostSetStorage, hostSetToken, inMemoryStorage } from './host';

const TOKEN_KEY = 'token';
const SESSION_ONLY_KEYS = new Set(['tool', 'skill']);

let tokenCache: string | null = null;

export function getToken(): string | null {
	return tokenCache;
}

export async function setToken(token: string | null): Promise<void> {
	tokenCache = token;
	if (token) {
		inMemoryStorage.set(TOKEN_KEY, token);
	} else {
		inMemoryStorage.delete(TOKEN_KEY);
	}
}

export async function hydrateTokenFromHost(): Promise<string | null> {
	const token = await hostGetToken();
	await setToken(token);
	return token;
}

export async function persistTokenToHost(token: string): Promise<void> {
	await setToken(token);
	await hostSetToken(token);
}

export async function clearToken(): Promise<void> {
	await setToken(null);
	await hostClearToken();
}

export async function hydrateStorageFromHost(): Promise<void> {
	const keys = ['settings', 'locale', 'theme', 'workspaceViewOption', 'sidebar'];
	for (const key of keys) {
		const value = await hostGetStorage(key);
		if (value !== null) {
			inMemoryStorage.set(key, value);
		}
	}
}

class CompatStorage implements Storage {
	get length() {
		return inMemoryStorage.size;
	}

	clear(): void {
		for (const key of [...inMemoryStorage.keys()]) {
			if (key !== TOKEN_KEY) {
				inMemoryStorage.delete(key);
			}
		}
	}

	getItem(key: string): string | null {
		if (key === TOKEN_KEY) {
			return tokenCache;
		}
		return inMemoryStorage.get(key) ?? null;
	}

	key(index: number): string | null {
		return [...inMemoryStorage.keys()][index] ?? null;
	}

	removeItem(key: string): void {
		if (key === TOKEN_KEY) {
			void clearToken();
			return;
		}
		inMemoryStorage.delete(key);
		if (!SESSION_ONLY_KEYS.has(key)) {
			void hostSetStorage(key, null);
		}
	}

	setItem(key: string, value: string): void {
		if (key === TOKEN_KEY) {
			tokenCache = value;
			inMemoryStorage.set(TOKEN_KEY, value);
			void persistTokenToHost(value);
			return;
		}
		inMemoryStorage.set(key, value);
		if (!SESSION_ONLY_KEYS.has(key)) {
			void hostSetStorage(key, value);
		}
	}
}

let installed = false;

function asPropertyStorage(storage: CompatStorage): Storage {
	return new Proxy(storage, {
		get(target, prop, receiver) {
			if (prop === 'token') {
				return getToken() ?? undefined;
			}
			if (typeof prop === 'string' && !(prop in target)) {
				return target.getItem(prop);
			}
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'function') {
				return value.bind(target);
			}
			return value;
		},
		set(_target, prop, value) {
			if (prop === 'token') {
				void persistTokenToHost(String(value));
				return true;
			}
			storage.setItem(String(prop), String(value));
			return true;
		}
	}) as Storage;
}

export function installStorageShim() {
	if (installed || typeof window === 'undefined') {
		return;
	}
	installed = true;

	const local = new CompatStorage();
	const session = new CompatStorage();
	Object.defineProperty(window, 'localStorage', {
		value: asPropertyStorage(local),
		configurable: true
	});
	Object.defineProperty(window, 'sessionStorage', {
		value: asPropertyStorage(session),
		configurable: true
	});
}
