import { postToHost } from './host';
import { vscode } from '../vscode';

export type OpenWebuiVSCodeApi = {
	postMessage(message: Record<string, unknown>): void;
	getState(): unknown;
	setState(state: unknown): void;
	openFile?(path: string): void;
};

declare global {
	interface Window {
		openWebuiVSCode?: OpenWebuiVSCodeApi;
		electronAPI?: unknown;
	}
}

export function installPlatformBridge() {
	window.openWebuiVSCode = {
		postMessage: (message) => postToHost(message),
		getState: () => vscode.getState(),
		setState: (state) => vscode.setState(state),
		openFile: (path) => postToHost({ type: 'workspace:openFile', path })
	};
}
