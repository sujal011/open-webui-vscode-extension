/**
 * Minimal `$lib/utils` shim for VS Code webview bootstrap.
 * Phase 3 will expand or switch back to vendored utils with optional features.
 */

import dayjs from 'dayjs';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTimeRange = (timestamp: number | string | undefined) => {
	if (!timestamp) return '';
	const date = dayjs.unix(typeof timestamp === 'number' ? timestamp : Number(timestamp));
	const now = dayjs();
	const diffDays = now.diff(date, 'day');
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return 'Previous 7 days';
	if (diffDays < 30) return 'Previous 30 days';
	return date.format('MMMM YYYY');
};

export const getUserPosition = () => null;

export const copyToClipboard = async (text: string) => {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
	}
};
