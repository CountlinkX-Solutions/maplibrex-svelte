import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GUIDES, findGuide, guideSiblings } from './guides.js';

/**
 * The guide list is written by hand, like the component registry. The site
 * builds its navigation and one prerendered page per entry from it, and each
 * entry needs a page component to render.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Keys of the `GUIDE_PAGES` map, read as text so the test needs no Svelte compiler.
const pagesSource = read('./guides/index.ts');
const pageMap = pagesSource.slice(pagesSource.indexOf('export const GUIDE_PAGES'));
const pageKeys = [...pageMap.matchAll(/^\t'?([\w-]+)'?: \w+,?$/gm)].map((match) => match[1]);

describe('guides', () => {
	it('reads the page keys, so a silent empty pass is impossible', () => {
		expect(pageKeys.length).toBeGreaterThan(0);
	});

	it('covers switching styles, layer order, and errors and fallback, in that order', () => {
		expect(GUIDES.map((guide) => guide.slug)).toEqual([
			'switching-styles',
			'layer-order',
			'errors-and-fallback'
		]);
	});

	it('has exactly one page component for every guide', () => {
		expect([...pageKeys].sort()).toEqual(GUIDES.map((guide) => guide.slug).sort());
	});

	it('gives every guide a slug that is one lowercase URL segment', () => {
		for (const { slug } of GUIDES) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it('finds a guide by its slug, and nothing for an unknown slug', () => {
		expect(findGuide('layer-order')?.title).toBe('Layer order');
		expect(findGuide('no-such-guide')).toBeUndefined();
	});

	it('links each guide to the one before and after it', () => {
		expect(guideSiblings('switching-styles')).toEqual({ previous: undefined, next: GUIDES[1] });
		expect(guideSiblings('layer-order')).toEqual({ previous: GUIDES[0], next: GUIDES[2] });
		expect(guideSiblings('errors-and-fallback')).toEqual({ previous: GUIDES[1], next: undefined });
	});
});
