import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import MapStack from './fixtures/MapStack.svelte';

/**
 * These run against a real WebGL map with an inline, empty style, so they
 * exercise the actual MapLibre lifecycle rather than a mock of it. Nothing
 * here touches the network.
 */

const WAIT = { timeout: 15_000 } as const;

async function mountStack(props: { fillColor?: string; showLayer?: boolean } = {}) {
	let map: MapLibreMap | null = null;

	const initialProps = {
		fillColor: '#ff0000',
		showLayer: true,
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};

	const screen = await render(MapStack, initialProps);

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = (next: Partial<typeof initialProps>) =>
		screen.rerender({ ...initialProps, ...next });

	return { screen, rerender, map: map as unknown as MapLibreMap };
}

describe('map lifecycle', () => {
	it('creates a live map and signals readiness to its descendants', async () => {
		// Reaching this line already proves readiness: the fixture only calls
		// back once `bind:ready` has flipped.
		const { map } = await mountStack();

		expect(map.getCanvas().isConnected).toBe(true);
	});

	it('adds nested sources and layers once the style is loaded', async () => {
		const { map } = await mountStack();

		expect(map.getSource('squares')).toBeDefined();
		expect(map.getLayer('squares-fill')).toBeDefined();
	});

	it('gives a nested layer the id of its enclosing source', async () => {
		const { map } = await mountStack();

		expect(map.getLayer('squares-fill')?.source).toBe('squares');
	});

	it('updates a paint property in place instead of recreating the layer', async () => {
		const { map, rerender } = await mountStack({ fillColor: '#ff0000' });
		const before = map.getLayer('squares-fill');

		await rerender({ fillColor: '#00ff00' });

		await vi.waitFor(
			() => expect(map.getPaintProperty('squares-fill', 'fill-color')).toBe('#00ff00'),
			WAIT
		);
		expect(map.getLayer('squares-fill')).toBe(before);
	});

	it('removes a layer when its component unmounts, leaving the source alone', async () => {
		const { map, rerender } = await mountStack();

		await rerender({ showLayer: false });

		await vi.waitFor(() => expect(map.getLayer('squares-fill')).toBeUndefined(), WAIT);
		expect(map.getSource('squares')).toBeDefined();
	});

	it('mounts a marker into the map container', async () => {
		const { map } = await mountStack();

		expect(map.getContainer().querySelectorAll('.maplibregl-marker')).toHaveLength(1);
	});

	it('tears the map down when the component unmounts', async () => {
		const { screen, map } = await mountStack();
		const container = map.getContainer();

		await screen.unmount();

		await vi.waitFor(() => expect(container.children).toHaveLength(0), WAIT);
	});
});
