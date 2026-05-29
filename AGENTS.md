# Open WebUI VS Code Agent Extension

This project is a VS Code extension that reuses Open WebUI as the backend for auth, models, chat history, tools, knowledge, files, notes, memories, and chat orchestration. The extension should feel like Open WebUI inside VS Code while adding editor-native agentic coding tools.

## Core Architecture

- `src/extension.ts` is the VS Code extension host entrypoint. Keep secrets, VS Code APIs, workspace access, filesystem access, terminal access, and privileged operations here.
- `src/openWebuiClient.ts` is the portable Open WebUI API/socket client. Keep this free of VS Code imports so it can later move to a shared package.
- `src/workspaceTools.ts` contains editor tool descriptors and safe wrappers around VS Code workspace APIs.
- `webview/src` is the Svelte UI. Treat it as an untrusted renderer: it sends intents to the extension host and receives state/events back.

## Open WebUI API Contract

Use the same server APIs as the web app:

- Auth: `POST /api/v1/auths/signin`, `GET /api/v1/auths/`.
- Models: `GET /api/models`.
- Chat list/history: `GET /api/v1/chats/`, `GET /api/v1/chats/{id}`.
- Chat generation: `POST /api/chat/completions`.
- Live events: Socket.IO at `/ws/socket.io`, authenticated with `{ token }`, listening on `events`.

The backend owns chat persistence. For chat sends, include the same key fields Open WebUI sends: `model`, `messages`, `chat_id`, `id`, `parent_id`, `user_message`, `session_id`, `model_item`, `features`, `tool_servers`, and `background_tasks`.

## Agentic Coding Tools

Do not let the Svelte webview directly read or write workspace files. All editor operations must go through the extension host.

Preferred tool direction:

1. Start with local VS Code wrappers in `workspaceTools.ts`.
2. Expose those wrappers as OpenAPI-compatible local tool servers when Open WebUI needs to call tools directly.
3. Keep user approval and risk controls in the extension host before writes, deletes, shell commands, or broad reads.

Initial tool candidates:

- `list_workspace_files`
- `read_file`
- `search_workspace`
- `write_file`
- `replace_range`
- `apply_patch`
- `run_terminal_command`
- `get_diagnostics`

## Harness Instructions For Codex

When working in this extension project:

- Read this file and the existing source before changing architecture.
- Keep Open WebUI compatibility first. Do not invent replacement chat protocols unless the server API cannot support the need.
- Keep portable code separate from VS Code-specific code.
- Prefer narrow, testable changes. Avoid moving Open WebUI frontend files wholesale until the extension shell is stable.
- Do not store tokens in webview state, localStorage, or checked-in files. Use VS Code `SecretStorage` only.
- Do not put workspace filesystem access in webview code.
- Before adding a dependency, check if VS Code, Svelte, or the existing Open WebUI client patterns already cover it.
- Run `npm run check` from `vscode-extension` after code changes when dependencies are installed.

## Useful Local Commands

```sh
cd vscode-extension
npm install
npm run build
npm run check
```

Use VS Code's Extension Development Host to run the extension after building.
