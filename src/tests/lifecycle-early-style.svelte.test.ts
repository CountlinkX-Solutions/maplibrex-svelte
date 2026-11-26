import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import MapLibre from '#lib/components/MapLibre.svelte';
import FallbackStyleStack from './fixtures/FallbackStyleStack.svelte';
import { WAIT, deferredStyleUrl, failingStyleUrl, settle } from './fixtures/lifecycle.js';

/**
 * Issue #15 (audit D3): the style the map shows always ends up equal to the
 * current `mapStyle`, including when the prop changed before the first load
 * and when the first style failed.
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
	// Failed before the fix: the style effect waited for `load`, then recorded
	// the current `mapStyle` as applied without calling `setStyle`, so the map
	// kept the style it was created with.
	it('ends up showing the style set while the first one was loading', async () => {
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

	it('ends up on the first style when mapStyle changes and changes back before the first load', async () => {
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
		await screen.rerender({ ...props, mapStyle: first.url });
		await settle();
		expect(map).toBeNull();

		first.resolve(styleA);
		await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
		await settle();

		const loaded = map as unknown as MapLibreMap;
		expect(loaded.getLayer('base-a')).toBeDefined();
		expect(loaded.getLayer('base-b')).toBeUndefined();
	});

	// The second case from the issue: a fallback style assigned from `onerror`
	// when the first one fails.
	it('shows a fallback style assigned from onerror after the first style failed', async () => {
		let map: MapLibreMap | null = null;

		await render(FallbackStyleStack, {
			mapStyle: failingStyleUrl('style unavailable'),
			fallbackStyle: styleB,
			onload: (event: { target: MapLibreMap }) => {
				map = event.target;
			}
		});

		await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
		await settle();

		expect((map as unknown as MapLibreMap).getLayer('base-b')).toBeDefined();
	});
});
