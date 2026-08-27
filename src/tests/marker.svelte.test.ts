import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import MarkerStack from './fixtures/MarkerStack.svelte';

/**
 * Regression cover for a real defect: `<Marker>` decided to use a custom
 * element from the presence of `children`, so a nested `<Popup>` counted as
 * marker markup. The default pin was replaced by an element holding only the
 * popup's hidden holder, which measured 0x0 — an invisible marker, produced by
 * the exact pattern the README documents.
 */

const WAIT = { timeout: 15_000 } as const;

async function mountMarkers() {
	let map: MapLibreMap | null = null;

	const screen = await render(MarkerStack, {
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	});

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	return { screen, map: map as unknown as MapLibreMap };
}

function markerElements(map: MapLibreMap): HTMLElement[] {
	return [...map.getContainer().querySelectorAll<HTMLElement>('.maplibregl-marker')];
}

describe('marker with an attached popup', () => {
	it('keeps the default pin, which must have real size', async () => {
		const { map } = await mountMarkers();
		const [pin] = markerElements(map);

		const box = pin.getBoundingClientRect();

		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
	});

	it('renders the default pin as MapLibre svg, not as an empty wrapper', async () => {
		const { map } = await mountMarkers();
		const [pin] = markerElements(map);

		expect(pin.querySelector('svg')).not.toBeNull();
	});

	it('opens the attached popup when the pin is clicked', async () => {
		const { map } = await mountMarkers();
		const [pin] = markerElements(map);

		expect(map.getContainer().querySelector('.maplibregl-popup')).toBeNull();

		pin.click();

		await vi.waitFor(
			() => expect(map.getContainer().querySelector('[data-testid="pin-popup"]')).not.toBeNull(),
			WAIT
		);
	});
});

describe('marker with a content snippet', () => {
	it('uses the snippet as the marker element instead of the pin', async () => {
		const { map } = await mountMarkers();
		const custom = markerElements(map)[1];

		expect(custom.querySelector('[data-testid="custom-content"]')).not.toBeNull();
		expect(custom.querySelector('svg')).toBeNull();
	});

	it('applies the class prop to the custom element', async () => {
		const { map } = await mountMarkers();
		const custom = markerElements(map)[1];

		expect(custom.classList.contains('custom-marker')).toBe(true);
	});
});
