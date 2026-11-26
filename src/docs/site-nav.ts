/** The parts of `page` from `$app/state` that the site navigation reads. */
export type NavPage = {
	route: { id: string | null };
	params: Partial<Record<string, string>>;
};

export type SiteNav = {
	/** The top-level section the reader is in, for the top bar highlight. */
	section: '/docs' | '/guides' | '/playground' | null;
	/** Whether the sidebar listing the guides and components is shown. */
	sidebar: boolean;
	/** Slug of the component page being read, for the sidebar highlight. */
	component: string | null;
	/** Slug of the guide being read, for the sidebar highlight. */
	guide: string | null;
};

const SECTIONS = ['/docs', '/guides', '/playground'] as const;

/**
 * Where the reader is on the docs site.
 *
 * Decided from the route id, never from `page.url.pathname`: on GitHub Pages the
 * pathname starts with the base path (`/maplibrex-svelte/docs/marker/`), and
 * `resolve()` from `$app/paths` returns a relative path while pages prerender,
 * so neither can be compared against `/docs`. A page that matched no route has
 * a `null` id and gets no section.
 */
export function siteNav(page: NavPage): SiteNav {
	const id = page.route.id;
	const section =
		SECTIONS.find((root) => id !== null && (id === root || id.startsWith(`${root}/`))) ?? null;

	return {
		section,
		sidebar: section === '/docs' || section === '/guides',
		component: id === '/docs/[slug]' ? (page.params.slug ?? null) : null,
		guide: id === '/guides/[slug]' ? (page.params.slug ?? null) : null
	};
}
