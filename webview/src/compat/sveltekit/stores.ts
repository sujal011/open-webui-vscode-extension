import { derived, readable } from 'svelte/store';
import { routeParams, routePath } from '../router';

export const page = derived([routePath, routeParams], ([$path, $params]) => ({
	url: new URL(`vscode-webview://host${$path === '/' ? '' : $path}`),
	params: $params,
	route: { id: $path },
	status: 200,
	error: null,
	data: {},
	state: {},
	form: undefined
}));

export const navigating = readable(null);
