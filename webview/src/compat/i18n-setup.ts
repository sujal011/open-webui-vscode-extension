import { setContext } from 'svelte';
import i18n, { initI18n } from '$lib/i18n';

let initialized = false;

export function setupI18n() {
	if (initialized) {
		return i18n;
	}
	initI18n();
	setContext('i18n', i18n);
	initialized = true;
	return i18n;
}
