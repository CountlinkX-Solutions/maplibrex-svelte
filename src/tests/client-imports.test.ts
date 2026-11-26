import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * A guard against the class of bug that shipped once already: client code
 * reaching a module that imports Node built-ins.
 *
 * `src/docs/worker.ts` imported a constant from the Vite plugin, which imports
 * `node:fs` at its top level. Rollup tree-shook it away in the production
 * build, so every automated gate stayed green — and dev, which does not
 * tree-shake, threw on first render.
 *
 * The plugin is now the published `maplibrex-svelte/vite` entry under
 * `src/lib/vite`. It runs in Node and may use built-ins; nothing else may, and
 * no client file may import it. Client code gets the worker URL from the
 * virtual module the plugin provides instead.
 */

const SRC = new URL('../', import.meta.url).pathname;

const VITE_ENTRY = join(SRC, 'lib', 'vite') + sep;

const NODE_BUILTIN = /from\s+['"]node:/;
const IMPORT_SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(ts|svelte)$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
	});
}

/**
 * True when `specifier`, imported from `file`, lands in the Vite entry. Only
 * the forms that reach `src/lib/vite` from inside this repository count: the
 * package's own name is left out because the home page's setup sample names
 * `maplibrex-svelte/vite` in a string, and this check reads raw text.
 */
function reachesViteEntry(file: string, specifier: string): boolean {
	if (/^#lib\/vite(\/|$)/.test(specifier)) return true;
	if (!specifier.startsWith('.')) return false;

	return (resolve(dirname(file), specifier) + sep).startsWith(VITE_ENTRY);
}

const CLIENT_DIRS = ['lib', 'docs', 'routes'];
const files = CLIENT_DIRS.flatMap((directory) => sourceFiles(join(SRC, directory)));
const clientFiles = files.filter((file) => !file.startsWith(VITE_ENTRY));

describe('client sources', () => {
	it('finds files to check, so a silent empty pass is impossible', () => {
		expect(clientFiles.length).toBeGreaterThan(40);
		expect(files.length).toBeGreaterThan(clientFiles.length);
	});

	it('never imports a Node built-in', () => {
		const offenders = clientFiles.filter((file) => NODE_BUILTIN.test(readFileSync(file, 'utf8')));

		expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
	});

	it('never imports the Vite entry', () => {
		const offenders = clientFiles.filter((file) =>
			[...readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)].some((match) =>
				reachesViteEntry(file, match[1])
			)
		);

		expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
	});
});
