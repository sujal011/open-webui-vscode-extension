import { fileURLToPath, URL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const webviewRoot = fileURLToPath(new URL('./webview', import.meta.url));
const vendorLib = fileURLToPath(new URL('./webview/vendor/open-webui', import.meta.url));
const compatRoot = fileURLToPath(new URL('./webview/src/compat', import.meta.url));
const workerStub = `${compatRoot}/stubs/worker-constructor.ts`;

export default defineConfig({
	root: webviewRoot,
	plugins: [svelte()],
	resolve: {
		alias: [
			{
				find: 'pdfjs-dist/build/pdf.worker.mjs?url',
				replacement: `${compatRoot}/stubs/pdf-worker-url.ts`
			},
			{ find: '$lib/workers/pyodide.worker?worker', replacement: workerStub },
			{ find: '$lib/workers/kokoro.worker?worker', replacement: workerStub },
			{ find: '$lib/pyodide/pyodideKernel.worker?worker', replacement: workerStub },
			{
				find: '$lib/utils/google-drive-picker',
				replacement: `${compatRoot}/stubs/google-drive-picker.ts`
			},
			{
				find: '$lib/utils/onedrive-file-picker',
				replacement: `${compatRoot}/stubs/onedrive-file-picker.ts`
			},
			{ find: '$lib/workers/KokoroWorker', replacement: `${compatRoot}/stubs/KokoroWorker.ts` },
			{ find: '$lib/constants', replacement: `${compatRoot}/constants.ts` },
			{ find: '$compat', replacement: compatRoot },
			{ find: '$lib', replacement: vendorLib },
			{ find: '$app/environment', replacement: `${compatRoot}/sveltekit/environment.ts` },
			{ find: '$app/navigation', replacement: `${compatRoot}/sveltekit/navigation.ts` },
			{ find: '$app/stores', replacement: `${compatRoot}/sveltekit/stores.ts` },
			{ find: '$app/state', replacement: `${compatRoot}/sveltekit/state.ts` },
			{ find: '@sveltejs/kit', replacement: `${compatRoot}/sveltekit/kit.ts` }
		]
	},
	define: {
		APP_VERSION: JSON.stringify('0.0.1-vscode'),
		APP_BUILD_HASH: JSON.stringify('vscode-extension')
	},
	esbuild: {
		tsconfigRaw: {
			compilerOptions: {
				target: 'ES2022',
				module: 'ESNext'
			}
		}
	},
	css: {
		postcss: './postcss.config.cjs'
	},
	build: {
		outDir: fileURLToPath(new URL('./dist/webview', import.meta.url)),
		emptyOutDir: true,
		rollupOptions: {
			output: {
				entryFileNames: 'assets/[name].js',
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]'
			}
		}
	},
	optimizeDeps: {
		exclude: ['pyodide']
	},
	worker: {
		format: 'es'
	}
});
