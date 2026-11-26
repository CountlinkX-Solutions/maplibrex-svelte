import { error } from '@sveltejs/kit';
import { GUIDES, findGuide, guideSiblings } from '../../../docs/guides.js';

/** Every guide is known at build time, so all of them prerender. */
export const entries = () => GUIDES.map(({ slug }) => ({ slug }));

export function load({ params }: { params: { slug: string } }) {
	const guide = findGuide(params.slug);

	if (!guide) error(404, `No guide under "${params.slug}".`);

	return { guide, ...guideSiblings(params.slug) };
}
