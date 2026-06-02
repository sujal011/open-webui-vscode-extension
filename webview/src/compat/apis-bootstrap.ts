import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from './constants';

async function parseJson<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		const detail = payload?.detail ?? payload?.error ?? response.statusText;
		throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
	}
	return response.json() as Promise<T>;
}

export const getBackendConfig = async () => {
	return fetch(`${WEBUI_BASE_URL}/api/config`, {
		method: 'GET',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' }
	})
		.then(parseJson)
		.catch((error) => {
			console.warn('[compat] getBackendConfig failed', error);
			return null;
		});
};

export const getModels = async (token: string = '') => {
	const response = await fetch(`${WEBUI_BASE_URL}/api/models`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	}).then(parseJson<{ data?: unknown[] } | unknown[]>);

	if (Array.isArray(response)) {
		return response;
	}
	return response?.data ?? [];
};
