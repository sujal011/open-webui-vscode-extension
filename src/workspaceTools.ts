import * as vscode from 'vscode';

export type WorkspaceToolDescriptor = {
	id: string;
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
};

export function getWorkspaceToolDescriptors(): WorkspaceToolDescriptor[] {
	return [
		{
			id: 'vscode.list_workspace_files',
			name: 'list_workspace_files',
			description: 'List files in the active VS Code workspace using a glob pattern.',
			inputSchema: {
				type: 'object',
				properties: {
					pattern: { type: 'string', default: '**/*' },
					maxResults: { type: 'number', default: 200 }
				}
			}
		},
		{
			id: 'vscode.read_file',
			name: 'read_file',
			description: 'Read a UTF-8 text file from the active VS Code workspace.',
			inputSchema: {
				type: 'object',
				required: ['path'],
				properties: {
					path: { type: 'string' }
				}
			}
		}
	];
}

export async function runWorkspaceTool(name: string, input: Record<string, unknown>) {
	if (name === 'list_workspace_files') {
		const pattern = String(input.pattern ?? '**/*');
		const maxResults = Number(input.maxResults ?? 200);
		const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', maxResults);
		return files.map((file) => vscode.workspace.asRelativePath(file));
	}

	if (name === 'read_file') {
		const requestedPath = String(input.path ?? '');
		const folders = vscode.workspace.workspaceFolders ?? [];
		if (!folders.length) {
			throw new Error('No workspace folder is open.');
		}

		const uri = vscode.Uri.joinPath(folders[0].uri, requestedPath);
		const bytes = await vscode.workspace.fs.readFile(uri);
		return new TextDecoder().decode(bytes);
	}

	throw new Error(`Unknown workspace tool: ${name}`);
}
