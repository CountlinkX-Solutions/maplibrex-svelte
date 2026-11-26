import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import OrderStack from './fixtures/OrderStack.svelte';
import {
	WAIT,
	createMapErrorLog,
	layerOrder,
	settle,
	svelteOlderThan
} from './fixtures/lifecycle.js';

/**
 * Issues #1 and #8: the map draws layers in the order the component tree
 * declares them, whenever each layer mounted.
 */

/**
 * Whether the installed Svelte runs a source's nested layers after the
 * top-level layers declared around it. Observed with Svelte 5.16.0, 5.57.3 and
 * 5.58.0; not with 5.58.1, 5.59.0 or 5.59.2 (maplibre-gl 6.0.0 and 6.19.0 alike).
 */
const nestedLayersMountLate = svelteOlderThan('5.58.1');

type Scenario = 'nested' | 'late' | 'missing-before';

async function mountOrderStack(scenario: Scenario) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		scenario,
		showLate: false,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(OrderStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const rerender = async (next: Partial<typeof initialProps>) => {
		await screen.rerender({ ...initialProps, ...next });
		await settle();
	};

	return { rerender, errors, map: map as unknown as MapLibreMap };
}

describe('layer order (#1, #8)', () => {
	// Passes on every version tried: layers at the same depth keep tree order,
	// as the audit expected.
	it('keeps sibling layers nested in one source in markup order', async () => {
		const { map } = await mountOrderStack('nested');

		expect(layerOrder(map, ['grid', 'grid-2'])).toEqual(['grid', 'grid-2']);
	});

	// Issue #1's own example. Expected to fail on Svelte before 5.58.1, where the
	// map draws `a, b, grid, grid-2`: the nested layers mount one flush after the
	// top-level ones and are appended above them. From 5.58.1 it passes, but the
	// peer range still allows older releases. Once #1 is fixed in the library,
	// make this a plain `it`.
	(nestedLayersMountLate ? it.fails : it)(
		'draws layers nested in a source between the top-level layers around it',
		async () => {
			const { map } = await mountOrderStack('nested');

			expect(layerOrder(map, ['a', 'grid', 'grid-2', 'b'])).toEqual(['a', 'grid', 'grid-2', 'b']);
		}
	);

	// Expected to fail until #1 and #8 are fixed; remove `.fails` then. The late
	// layer is appended and then moved to the top (`moveLayer` with no target),
	// so the map draws `a, b, late`.
	it.fails('puts a layer that mounts late in its markup position, not on top', async () => {
		const { map, rerender } = await mountOrderStack('late');
		expect(layerOrder(map, ['a', 'late', 'b'])).toEqual(['a', 'b']);

		await rerender({ showLate: true });

		await vi.waitFor(() => expect(map.getLayer('late')).toBeDefined(), WAIT);
		expect(layerOrder(map, ['a', 'late', 'b'])).toEqual(['a', 'late', 'b']);
	});

	// Expected to fail until #1 and #8 are fixed; remove `.fails` then. MapLibre
	// refuses the layer ("Cannot add layer "lost" before non-existing layer
	// "no-such-layer".") and the component still counts it as mounted.
	it.fails('does not silently lose a layer whose beforeId names no layer', async () => {
		const { map } = await mountOrderStack('missing-before');

		expect(map.getLayer('lost')).toBeDefined();
	});
});
