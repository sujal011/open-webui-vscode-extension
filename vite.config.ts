import { fileURLToPath, URL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const webviewRoot = fileURLToPath(new URL('./webview', import.meta.url));

export default defineConfig({
	root: webviewRoot,
	plugins: [svelte()],
	esbuild: {
		tsconfigRaw: {
			compilerOptions: {
				target: 'ES2022',
				module: 'ESNext'
			}
		}
	},
	css: {
		postcss: { plugins: [] }
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
	}
});
