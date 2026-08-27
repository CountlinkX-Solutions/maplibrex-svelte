import { error } from '@sveltejs/kit';
import { COMPONENTS, findComponent, siblingsOf } from '../../../docs/registry.js';

/** Every component page is known at build time, so all of them prerender. */
export const entries = () => COMPONENTS.map(({ slug }) => ({ slug }));

export function load({ params }: { params: { slug: string } }) {
	const component = findComponent(params.slug);

	if (!component) error(404, `No component documented under "${params.slug}".`);

	return { component, ...siblingsOf(params.slug) };
}
