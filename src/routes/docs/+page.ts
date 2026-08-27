import { COMPONENTS, COMPONENTS_BY_CATEGORY } from '../../docs/registry.js';

export function load() {
	return { categories: COMPONENTS_BY_CATEGORY, total: COMPONENTS.length };
}
