import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import MapLibre from '#lib/components/MapLibre.svelte';
import { WAIT, deferredStyleUrl, settle } from './fixtures/lifecycle.js';

/**
 * Issue #15 (audit D3): the style the map shows always ends up equal to the
 * current `mapStyle`, including when the prop changed before the first load.
 */

const styleA: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'base-a', type: 'background', paint: { 'background-color': '#ffffff' } }]
};

const styleB: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'base-b', type: 'background', paint: { 'background-color': '#000000' } }]
};

describe('mapStyle before the first load (#15)', () => {
	// Expected to fail until #15 is fixed; remove `.fails` then. The style effect
	// waits for `load`, then records the current `mapStyle` as applied without
	// calling `setStyle`, so the map keeps the style it was created with.
	it.fails('ends up showing the style set while the first one was loading', async () => {
		const first = deferredStyleUrl();
		let map: MapLibreMap | null = null;

		const props = {
			mapStyle: first.url as StyleSpecification | string,
			onload: (event: { target: MapLibreMap }) => {
				map = event.target;
			},
			style: 'width: 200px; height: 200px'
		};

		const screen = await render(MapLibre, props);
		await screen.rerender({ ...props, mapStyle: styleB });
		await settle();
		// The scenario needs the change to land before the first load.
		expect(map).toBeNull();

		first.resolve(styleA);
		await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
		await settle();

		// An inline style needs no network, so 5 s is generous for it to apply.
		await vi.waitFor(
			() => {
				const loaded = map as unknown as MapLibreMap;
				expect(loaded.getLayer('base-b')).toBeDefined();
				expect(loaded.getLayer('base-a')).toBeUndefined();
			},
			{ timeout: 5_000 }
		);
	});
});
