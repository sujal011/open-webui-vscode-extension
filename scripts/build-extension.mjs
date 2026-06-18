import { rmSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

// Clean dist directory of root-level .js and .js.map files
try {
	const files = readdirSync(distDir);
	for (const file of files) {
		const filePath = join(distDir, file);
		const stat = lstatSync(filePath);
		if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.js.map'))) {
			rmSync(filePath, { force: true });
		}
	}
} catch (e) {
	// Directory might not exist yet
}

const isWatch = process.argv.includes('--watch');

const ctx = await esbuild.context({
	entryPoints: ['src/extension.ts'],
	bundle: true,
	outfile: 'dist/extension.js',
	external: ['vscode'],
	format: 'esm',
	platform: 'node',
	sourcemap: true,
	banner: {
		js: `import { createRequire } from 'node:module';const require = createRequire(import.meta.url);`
	}
});

if (isWatch) {
	await ctx.watch();
	console.log('Watching for changes...');
} else {
	await ctx.rebuild();
	await ctx.dispose();
	console.log('Extension bundled successfully.');
}
