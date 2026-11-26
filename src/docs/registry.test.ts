import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COMPONENTS } from './registry.js';

/**
 * The registry is written by hand, so these tests check what can be checked
 * without reading component types: the README promises a page with a live
 * demo for every component the package exports.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const exported = [...read('../lib/index.ts').matchAll(/export \{ default as (\w+) \}/g)].map(
	(match) => match[1]
);

// Keys of the `DEMOS` map, read as text so the test needs no Svelte compiler.
const demosSource = read('./demos/index.ts');
const demoMap = demosSource.slice(demosSource.indexOf('export const DEMOS'));
const demoKeys = [...demoMap.matchAll(/^\t'?([\w-]+)'?: \w+,?$/gm)].map((match) => match[1]);

describe('component registry', () => {
	it('reads the exports and demo keys, so a silent empty pass is impossible', () => {
		expect(exported.length).toBeGreaterThan(40);
		expect(demoKeys.length).toBeGreaterThan(30);
	});

	it('has exactly one page for every exported component', () => {
		const documented = COMPONENTS.map((component) => component.name);

		expect([...documented].sort()).toEqual([...exported].sort());
	});

	it('gives every page a demo that exists', () => {
		const missing = COMPONENTS.filter(
			(component) => component.demo === undefined || !demoKeys.includes(component.demo)
		).map((component) => component.name);

		expect(missing).toEqual([]);
	});
});
