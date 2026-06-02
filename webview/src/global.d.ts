export {};

declare global {
	interface Window {
		WEBUI_VERSION?: string;
		openWebuiVSCode?: import('./compat/platform').OpenWebuiVSCodeApi;
	}
}
