# Open WebUI Agent for VS Code

A VS Code extension scaffold for using Open WebUI as the backend for agentic coding chat.

## Current Scope

- Sign in to an Open WebUI server.
- Store auth token in VS Code SecretStorage.
- Fetch models and recent chats.
- Connect to Open WebUI Socket.IO events.
- Send chat requests to `/api/chat/completions`.
- Render streamed assistant output in a Svelte webview.
- Define initial VS Code workspace tool descriptors.

## Development

```sh
cd vscode-extension
npm install
npm run build
```

Configure `openWebuiAgent.baseUrl` in VS Code settings if your Open WebUI server is not at `http://localhost:8080`.
