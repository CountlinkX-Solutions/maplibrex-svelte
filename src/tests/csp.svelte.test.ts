import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import HolderStack from './fixtures/HolderStack.svelte';
import MapStack from './fixtures/MapStack.svelte';

/**
 * Regression cover for issue #11. `<Marker>` with `content`, `<Popup>` and
 * `<CustomControl>` render their markup into a hidden holder before MapLibre
 * moves it into a container of its own. The holder was hidden with a
 * `style="display: none"` attribute in the template, and a Content-Security-Policy
 * without `style-src 'unsafe-inline'` blocks such attributes. MapLibre's own
 * positioning goes through the CSSOM, which CSP does not restrict, so the
 * holders are the only part that has to change.
 */

const WAIT = { timeout: 15_000 } as const;

async function mountHolders() {
	let map: MapLibreMap | null = null;

	const screen = await render(HolderStack, {
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	});

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	return { screen, map: map as unknown as MapLibreMap };
}

/** Everything the components rendered outside the map container. */
function renderedOutsideMap(container: HTMLElement, map: MapLibreMap): HTMLElement[] {
	const mapContainer = map.getContainer();

	return [...container.querySelectorAll<HTMLElement>('*')].filter(
		(element) => !mapContainer.contains(element)
	);
}

describe('hidden holders under a strict Content-Security-Policy', () => {
	it('renders one holder per component, none with an inline style attribute', async () => {
		const { screen, map } = await mountHolders();
		const holders = renderedOutsideMap(screen.container, map);

		expect(holders).toHaveLength(3);
		for (const holder of holders) {
			expect(holder.hasAttribute('style'), holder.outerHTML).toBe(false);
		}
	});

	it('keeps every holder out of the layout', async () => {
		const { screen, map } = await mountHolders();
		const holders = renderedOutsideMap(screen.container, map);

		expect(holders).toHaveLength(3);
		for (const holder of holders) expect(getComputedStyle(holder).display).toBe('none');
	});

	// Each layer renders an empty anchor where it sits in the markup, which is
	// how the library knows its place in the draw order. It is held to the same
	// rules as the holders, and stays outside MapLibre's container.
	it('renders layer anchors with no inline style, outside the map and out of the layout', async () => {
		let map: MapLibreMap | null = null;
		const screen = await render(MapStack, {
			onmapready: (instance: MapLibreMap) => {
				map = instance;
			}
		});
		await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

		const anchors = screen.container.querySelectorAll<HTMLElement>('[data-maplibrex="layer"]');
		expect(anchors).toHaveLength(1);
		for (const anchor of anchors) {
			expect(anchor.hasAttribute('style'), anchor.outerHTML).toBe(false);
			expect(anchor.childNodes).toHaveLength(0);
			expect(getComputedStyle(anchor).display).toBe('none');
			expect((map as unknown as MapLibreMap).getContainer().contains(anchor)).toBe(false);
		}
	});

	it('still moves the content into the marker, popup and control containers', async () => {
		const { map } = await mountHolders();
		const container = map.getContainer();

		await vi.waitFor(() => {
			expect(
				container.querySelector('.maplibregl-marker [data-testid="marker-content"]')
			).not.toBeNull();
			expect(
				container.querySelector('.maplibregl-popup-content [data-testid="popup-content"]')
			).not.toBeNull();
			expect(
				container.querySelector('.maplibregl-ctrl-top-left [data-testid="control-content"]')
			).not.toBeNull();
		}, WAIT);
	});
});
