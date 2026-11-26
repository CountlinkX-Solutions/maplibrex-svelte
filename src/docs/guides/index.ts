import type { Component } from 'svelte';
import ErrorsAndFallback from './ErrorsAndFallback.svelte';
import LayerOrder from './LayerOrder.svelte';
import SwitchingStyles from './SwitchingStyles.svelte';

/** The text of each guide. Keys match `GuideDoc.slug` in `../guides.ts`. */
export const GUIDE_PAGES: Record<string, Component> = {
	'switching-styles': SwitchingStyles,
	'layer-order': LayerOrder,
	'errors-and-fallback': ErrorsAndFallback
};
