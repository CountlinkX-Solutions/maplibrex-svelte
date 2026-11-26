import { describe, expect, it } from 'vitest';
import { siteNav, type NavPage } from './site-nav.js';

/**
 * Regression cover for issue #25. The published site lives under a base path
 * (`/maplibrex-svelte` on GitHub Pages) and its page paths end in a slash, so
 * `page.url.pathname` never starts with `/docs`. Deciding from the pathname hid
 * the component sidebar on every published page. `resolve()` from `$app/paths`
 * does not help either: while pages prerender it returns a relative path such
 * as `../../docs`. The route id and params carry neither the base nor the slash.
 */

/** A page state as `$app/state` holds it, pathname included. */
function pageAt(
	pathname: string,
	id: string | null,
	params: Record<string, string> = {}
): NavPage & { url: { pathname: string } } {
	return { url: { pathname }, route: { id }, params };
}

const PAGES = '/maplibrex-svelte';

describe('siteNav on the published site', () => {
	it('shows the sidebar and highlights the component on a component page', () => {
		const nav = siteNav(pageAt(`${PAGES}/docs/marker/`, '/docs/[slug]', { slug: 'marker' }));

		expect(nav).toEqual({ section: '/docs', sidebar: true, component: 'marker' });
	});

	it('shows the sidebar on the components index', () => {
		expect(siteNav(pageAt(`${PAGES}/docs/`, '/docs'))).toEqual({
			section: '/docs',
			sidebar: true,
			component: null
		});
	});

	it('highlights the playground and hides the sidebar there', () => {
		expect(siteNav(pageAt(`${PAGES}/playground/`, '/playground'))).toEqual({
			section: '/playground',
			sidebar: false,
			component: null
		});
	});

	it('hides the sidebar on the landing page and on a not-found page', () => {
		expect(siteNav(pageAt(`${PAGES}/`, '/')).sidebar).toBe(false);
		expect(siteNav(pageAt(`${PAGES}/docs/nope/`, null)).sidebar).toBe(false);
	});
});

describe('siteNav without a base path', () => {
	it('gives the same answer as under the base path', () => {
		expect(siteNav(pageAt('/docs/marker', '/docs/[slug]', { slug: 'marker' }))).toEqual({
			section: '/docs',
			sidebar: true,
			component: 'marker'
		});
	});
});
