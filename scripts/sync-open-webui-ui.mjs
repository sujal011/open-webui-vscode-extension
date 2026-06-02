#!/usr/bin/env node
/**
 * Sync Open WebUI frontend lib into the VS Code extension webview vendor folder.
 *
 * Usage:
 *   node scripts/sync-open-webui-ui.mjs
 *   node scripts/sync-open-webui-ui.mjs --source D:\open-webui\src\lib
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(__dirname, '..');
const defaultSource = resolve(extensionRoot, '..', 'open-webui', 'src', 'lib');

const args = process.argv.slice(2);
const sourceFlag = args.indexOf('--source');
const sourceRoot = sourceFlag >= 0 ? resolve(args[sourceFlag + 1]) : defaultSource;
const targetRoot = join(extensionRoot, 'webview', 'vendor', 'open-webui');

if (!existsSync(sourceRoot)) {
	console.error(`Open WebUI lib not found at: ${sourceRoot}`);
	console.error('Pass --source <path-to-open-webui/src/lib>');
	process.exit(1);
}

if (existsSync(targetRoot)) {
	rmSync(targetRoot, { recursive: true, force: true });
}

mkdirSync(dirname(targetRoot), { recursive: true });
cpSync(sourceRoot, targetRoot, { recursive: true });

console.log(`Synced Open WebUI lib:`);
console.log(`  from: ${sourceRoot}`);
console.log(`  to:   ${targetRoot}`);

// Sync static assets
const staticSource = resolve(sourceRoot, '..', '..', 'static');
const publicTarget = join(extensionRoot, 'webview', 'public');

if (existsSync(staticSource)) {
	if (existsSync(publicTarget)) {
		rmSync(publicTarget, { recursive: true, force: true });
	}
	mkdirSync(publicTarget, { recursive: true });
	cpSync(staticSource, publicTarget, { recursive: true });
	console.log(`Synced Open WebUI static assets:`);
	console.log(`  from: ${staticSource}`);
	console.log(`  to:   ${publicTarget}`);
} else {
	console.warn(`Warning: Open WebUI static assets not found at: ${staticSource}`);
}

