/**
 * Open WebUI constants with mutable base URLs for the VS Code webview.
 * Aliased as `$lib/constants` so `$lib/apis/*` resolve API paths at call time.
 */

import { getWebuiBaseUrl } from './config';

export const APP_NAME = 'Open WebUI';

export let WEBUI_HOSTNAME = '';
export let WEBUI_BASE_URL = '';
export let WEBUI_API_BASE_URL = '/api/v1';
export let OLLAMA_API_BASE_URL = '/ollama';
export let OPENAI_API_BASE_URL = '/openai';
export let AUDIO_API_BASE_URL = '/api/v1/audio';
export let IMAGES_API_BASE_URL = '/api/v1/images';
export let RETRIEVAL_API_BASE_URL = '/api/v1/retrieval';

export const WEBUI_VERSION = '0.0.0-vscode';
export const WEBUI_BUILD_HASH = 'vscode-extension';
export const REQUIRED_OLLAMA_VERSION = '0.1.16';

export const SUPPORTED_FILE_TYPE = [
	'application/epub+zip',
	'application/pdf',
	'text/plain',
	'text/csv',
	'text/xml',
	'text/html',
	'text/x-python',
	'text/css',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/octet-stream',
	'application/x-javascript',
	'text/markdown',
	'audio/mpeg',
	'audio/wav',
	'audio/ogg',
	'audio/x-m4a'
];

export const SUPPORTED_FILE_EXTENSIONS = [
	'md',
	'rst',
	'go',
	'py',
	'java',
	'sh',
	'bat',
	'ps1',
	'cmd',
	'js',
	'ts',
	'css',
	'cpp',
	'hpp',
	'h',
	'c',
	'cs',
	'htm',
	'html',
	'sql',
	'log',
	'ini',
	'pl',
	'pm',
	'r',
	'dart',
	'dockerfile',
	'env',
	'php',
	'hs',
	'hsc',
	'lua',
	'nginxconf',
	'conf',
	'm',
	'mm',
	'plsql',
	'perl',
	'rb',
	'rs',
	'scala',
	'swift',
	'vue',
	'svelte',
	'doc',
	'docx',
	'pdf',
	'csv',
	'txt',
	'pptx',
	'ppt',
	'xls',
	'xlsx',
	'msg',
	'zip',
	'rar',
	'7z',
	'tar',
	'gz',
	'bz2',
	'xz',
	'mp4',
	'mp3',
	'wav',
	'ogg',
	'webm',
	'avi',
	'mov',
	'mkv',
	'flac',
	'opus',
	'json',
	'yaml',
	'yml',
	'xml'
];

/** Call once when host config is received, before any Open WebUI API requests. */
export function applyBaseUrl(url?: string) {
	const base = (url ?? getWebuiBaseUrl()).replace(/\/$/, '');
	WEBUI_HOSTNAME = new URL(base).host;
	WEBUI_BASE_URL = base;
	WEBUI_API_BASE_URL = `${base}/api/v1`;
	OLLAMA_API_BASE_URL = `${base}/ollama`;
	OPENAI_API_BASE_URL = `${base}/openai`;
	AUDIO_API_BASE_URL = `${base}/api/v1/audio`;
	IMAGES_API_BASE_URL = `${base}/api/v1/images`;
	RETRIEVAL_API_BASE_URL = `${base}/api/v1/retrieval`;
}

export const DEFAULT_CAPABILITIES = {
	file_context: true,
	vision: true,
	file_upload: true,
	web_search: true,
	image_generation: true,
	code_interpreter: true,
	terminal: true,
	citations: true,
	status_updates: true,
	usage: undefined,
	builtin_tools: true
};

export const PASTED_TEXT_CHARACTER_LIMIT = 1000;

applyBaseUrl();
