export function redirect(_status: number, _location: string): never {
	throw new Error('redirect() is not available in the VS Code webview.');
}
