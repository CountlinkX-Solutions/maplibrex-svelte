import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { RequestParameters, StyleSpecification } from 'maplibre-gl';
import StyleStack from './fixtures/StyleStack.svelte';
import ProtocolStack from './fixtures/ProtocolStack.svelte';

/**
 * Style-level state — projection, sky, light, images, global state, feature
 * state — against a real map with an inline, empty style. The recurring claim
 * under test is that unmounting a component puts the map back the way it was,
 * because none of these live in the component tree the way a layer does.
 */

const WAIT = { timeout: 15_000 } as const;

async function mountStack(
	props: { showStyle?: boolean; hovered?: boolean; labelSize?: number } = {}
) {
	let map: MapLibreMap | null = null;

	const initialProps = {
		showStyle: true,
		hovered: true,
		labelSize: 12,
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};

	const screen = await render(StyleStack, initialProps);

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = (next: Partial<typeof initialProps>) =>
		screen.rerender({ ...initialProps, ...next });

	return { screen, rerender, map: map as unknown as MapLibreMap };
}

describe('projection', () => {
	it('applies the requested projection', async () => {
		const { map } = await mountStack();

		expect(map.getProjection().type).toBe('globe');
	});

	it('restores the style projection when unmounted', async () => {
		const { map, rerender } = await mountStack();

		await rerender({ showStyle: false });

		// A style that declares no projection reports none, rather than an
		// explicit mercator, so that absence is what must come back.
		await vi.waitFor(() => expect(map.getProjection()).toBeUndefined(), WAIT);
	});
});

describe('sky and light', () => {
	it('applies the sky specification', async () => {
		const { map } = await mountStack();

		expect(map.getSky()['sky-color']).toBe('#001133');
	});

	it('applies the light specification', async () => {
		const { map } = await mountStack();

		expect(map.getLight().intensity).toBe(0.4);
	});
});

describe('image', () => {
	it('registers the image under its id', async () => {
		const { map } = await mountStack();

		expect(map.hasImage('dot')).toBe(true);
	});

	it('removes the image when unmounted', async () => {
		const { map, rerender } = await mountStack();

		await rerender({ showStyle: false });

		await vi.waitFor(() => expect(map.hasImage('dot')).toBe(false), WAIT);
	});
});

describe('global state', () => {
	it('exposes every prop as a global state property', async () => {
		const { map } = await mountStack({ labelSize: 12 });

		expect(map.getGlobalState().labelSize).toBe(12);
	});

	it('pushes a changed value without remounting', async () => {
		const { map, rerender } = await mountStack({ labelSize: 12 });

		await rerender({ labelSize: 20 });

		await vi.waitFor(() => expect(map.getGlobalState().labelSize).toBe(20), WAIT);
	});
});

describe('feature state', () => {
	it('sets the state on the referenced feature', async () => {
		const { map } = await mountStack({ hovered: true });

		expect(map.getFeatureState({ source: 'pts', id: 1 })).toEqual({ hover: true });
	});

	it('clears the state when unmounted, which is how a hover ends', async () => {
		const { map, rerender } = await mountStack({ hovered: true });

		await rerender({ hovered: false });

		await vi.waitFor(() => expect(map.getFeatureState({ source: 'pts', id: 1 })).toEqual({}), WAIT);
	});
});

describe('custom layer', () => {
	it('adds the custom layer to the style', async () => {
		const { map } = await mountStack();

		expect(map.getLayer('custom-noop')).toBeDefined();
	});

	it('removes the custom layer when unmounted', async () => {
		const { map, rerender } = await mountStack();

		await rerender({ showStyle: false });

		await vi.waitFor(() => expect(map.getLayer('custom-noop')).toBeUndefined(), WAIT);
	});
});

describe('protocol registration', () => {
	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };
	const scheme = 'maplibrex-test';

	const emptyCollection = { type: 'FeatureCollection' as const, features: [] };

	it('serves a real source request through the registered handler', async () => {
		const seen: string[] = [];
		const handler = async (request: RequestParameters) => {
			seen.push(request.url);
			return { data: emptyCollection };
		};

		const screen = await render(ProtocolStack, {
			scheme,
			handler,
			dataUrl: `${scheme}://features`
		});

		await vi.waitFor(() => expect(seen).toContain(`${scheme}://features`), WAIT);

		await screen.unmount();
	});

	// The registry is global, so the only honest proof that unmounting removed
	// the scheme is that a later map can no longer resolve it.
	it('stops serving the scheme once the component unmounts', async () => {
		const handler = async () => ({ data: emptyCollection });

		const screen = await render(ProtocolStack, {
			scheme,
			handler,
			dataUrl: `${scheme}://features`
		});
		await screen.unmount();

		const container = document.createElement('div');
		container.style.cssText = 'width: 200px; height: 200px';
		document.body.appendChild(container);

		const map = new MapLibreMap({ container, style: emptyStyle, center: [0, 0], zoom: 2 });
		await map.once('load');

		const failure = new Promise<unknown>((resolve) => {
			map.once('error', (event) => resolve(event.error));
		});
		map.addSource('orphan', { type: 'geojson', data: `${scheme}://features` });

		await expect(failure).resolves.toBeDefined();

		map.remove();
		container.remove();
	});
});
