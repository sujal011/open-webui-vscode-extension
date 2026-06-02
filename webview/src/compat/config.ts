import { writable } from 'svelte/store';

export type CompatConfig = {
	baseUrl: string;
	features: Record<string, boolean>;
};

const defaultFeatures: Record<string, boolean> = {
	chat: true,
	sidebar: true,
	settings: true,
	workspace: false,
	admin: false,
	notes: false,
	channels: false,
	pyodide: false,
	terminals: false
};

let config: CompatConfig = {
	baseUrl: 'http://localhost:8080',
	features: { ...defaultFeatures }
};

export const compatReady = writable(false);
export const compatError = writable<string | null>(null);

export function getCompatConfig(): CompatConfig {
	return config;
}

export function isFeatureEnabled(name: string): boolean {
	return config.features[name] ?? false;
}

export function applyCompatConfig(partial: Partial<CompatConfig>) {
	if (partial.baseUrl) {
		config = {
			...config,
			baseUrl: partial.baseUrl.replace(/\/$/, '')
		};
	}
	if (partial.features) {
		config = {
			...config,
			features: { ...config.features, ...partial.features }
		};
	}
}

export function getWebuiBaseUrl(): string {
	return config.baseUrl;
}
