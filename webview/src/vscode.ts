type VsCodeApi = {
	postMessage(message: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
};

declare const acquireVsCodeApi: () => VsCodeApi;

export const vscode = acquireVsCodeApi();
