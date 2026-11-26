/** The parts of `page` from `$app/state` that the site navigation reads. */
export type NavPage = {
	route: { id: string | null };
	params: Partial<Record<string, string>>;
};

export type SiteNav = {
	/** The top-level section the reader is in, for the top bar highlight. */
	section: '/docs' | '/playground' | null;
	/** Whether the component sidebar is shown. */
	sidebar: boolean;
	/** Slug of the component page being read, for the sidebar highlight. */
	component: string | null;
};

const SECTIONS = ['/docs', '/playground'] as const;

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
		sidebar: section === '/docs',
		component: id === '/docs/[slug]' ? (page.params.slug ?? null) : null
	};
}
