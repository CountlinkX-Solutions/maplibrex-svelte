import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * A guard against the class of bug that shipped once already: client code
 * reaching a module that imports Node built-ins.
 *
 * `src/docs/worker.ts` imported a constant from the Vite plugin, which imports
 * `node:fs` at its top level. Rollup tree-shook it away in the production
 * build, so every automated gate stayed green — and dev, which does not
 * tree-shake, threw on first render.
 */

const SRC = new URL('../', import.meta.url).pathname;

/** Only the plugin's constants module is safe: it has no imports at all. */
const ALLOWED_PLUGIN_IMPORT = 'maplibre-worker-paths';

const NODE_BUILTIN = /from\s+['"]node:/;
const PLUGIN_IMPORT = /from\s+['"][^'"]*vite-plugins\/([^'"]+)['"]/g;

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(ts|svelte)$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
	});
}

const CLIENT_DIRS = ['lib', 'docs', 'routes'];
const files = CLIENT_DIRS.flatMap((directory) => sourceFiles(join(SRC, directory)));

describe('client sources', () => {
	it('finds files to check, so a silent empty pass is impossible', () => {
		expect(files.length).toBeGreaterThan(40);
	});

	it('never imports a Node built-in', () => {
		const offenders = files.filter((file) => NODE_BUILTIN.test(readFileSync(file, 'utf8')));

		expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
	});

	it('reaches the Vite plugin only through its import-free constants module', () => {
		const offenders = files.filter((file) =>
			[...readFileSync(file, 'utf8').matchAll(PLUGIN_IMPORT)].some(
				(match) => !match[1].includes(ALLOWED_PLUGIN_IMPORT)
			)
		);

		expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
	});
});
