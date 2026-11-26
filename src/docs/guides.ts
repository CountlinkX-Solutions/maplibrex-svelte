/**
 * The guides on the documentation site, in reading order.
 *
 * Each entry gets a page at `/guides/<slug>/`, prerendered, and a link in the
 * sidebar. The text of a guide is a Svelte component under `guides/`, keyed
 * by the same slug in `guides/index.ts`. Like the component registry, this is
 * written by hand: every statement in a guide is checked against the code and
 * its specs, so update the guide when the behaviour it describes changes.
 */

export type GuideDoc = {
	slug: string;
	title: string;
	/** One sentence, leading with what the reader can rely on. */
	summary: string;
};

export const GUIDES: GuideDoc[] = [
	{
		slug: 'switching-styles',
		title: 'Switching styles',
		summary:
			'Change mapStyle whenever you like. The map stays, and what your components put on it comes back on the new style.'
	},
	{
		slug: 'layer-order',
		title: 'Layer order',
		summary:
			'Layers are drawn in the order you write them, whenever each one mounts. beforeId places a single layer by name instead.'
	},
	{
		slug: 'errors-and-fallback',
		title: 'Errors and fallback',
		summary:
			'Failures reach onerror and the status binding instead of being thrown, and a fallback snippet stands in for a map that cannot be created.'
	}
];

export function findGuide(slug: string): GuideDoc | undefined {
	return GUIDES.find((guide) => guide.slug === slug);
}

/** Previous and next in reading order, for the pager at the foot of a guide. */
export function guideSiblings(slug: string): { previous?: GuideDoc; next?: GuideDoc } {
	const index = GUIDES.findIndex((guide) => guide.slug === slug);

	return {
		previous: index > 0 ? GUIDES[index - 1] : undefined,
		next: index >= 0 && index < GUIDES.length - 1 ? GUIDES[index + 1] : undefined
	};
}
