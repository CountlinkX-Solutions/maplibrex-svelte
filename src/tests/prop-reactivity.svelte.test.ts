import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type {
	Map as MapLibreMap,
	Marker as MapLibreMarker,
	Popup as MapLibrePopup
} from 'maplibre-gl';
import PropsStack from './fixtures/PropsStack.svelte';
import {
	WAIT,
	createMapErrorLog,
	emptyVectorTiles,
	layerOrder,
	settle
} from './fixtures/lifecycle.js';

/**
 * Issue #20: a prop is either reactive, including being unset, or documented
 * as read once. Unsetting a prop gives the value MapLibre uses when it is not
 * given.
 */

type StackProps = {
	padding?: { top?: number; bottom?: number; left?: number; right?: number };
	layer?: { sourceLayer?: string; metadata?: unknown; minzoom?: number; maxzoom?: number };
	marker?: Record<string, unknown>;
	popup?: Record<string, unknown>;
	image?: Record<string, unknown>;
};

const LAYERS = ['below', 'subject', 'above'];

async function mountProps(props: StackProps) {
	let map: MapLibreMap | null = null;
	let instances: { marker: MapLibreMarker; popup: MapLibrePopup } | null = null;
	const errors = createMapErrorLog();
	let current: Record<string, unknown> = {
		vectorTiles: emptyVectorTiles(),
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		oninstances: (next: typeof instances) => {
			instances = next;
		},
		onerror: errors.onerror
	};

	const screen = await render(PropsStack, current);
	await vi.waitFor(() => {
		expect(map).not.toBeNull();
		expect(instances).not.toBeNull();
	}, WAIT);
	await settle();

	const rerender = async (next: StackProps) => {
		current = { ...current, ...next };
		await screen.rerender(current);
		await settle();
	};

	return {
		map: map as unknown as MapLibreMap,
		rerender,
		errors,
		marker: () => instances!.marker,
		popup: () => instances!.popup
	};
}

function styleLayer(map: MapLibreMap) {
	return map.getStyle().layers.find((layer) => layer.id === 'subject') as Record<string, unknown>;
}

describe('Layer props (#20)', () => {
	it('re-adds the layer in place when sourceLayer changes', async () => {
		const { map, rerender, errors } = await mountProps({ layer: { sourceLayer: 'a' } });
		expect(styleLayer(map)['source-layer']).toBe('a');

		await rerender({ layer: { sourceLayer: 'b' } });

		expect(styleLayer(map)['source-layer']).toBe('b');
		expect(layerOrder(map, LAYERS)).toEqual(LAYERS);
		expect(errors.messages()).toEqual([]);
	});

	it('re-adds the layer in place when metadata changes', async () => {
		const { map, rerender, errors } = await mountProps({ layer: { metadata: { version: 1 } } });

		await rerender({ layer: { metadata: { version: 2 } } });

		expect(styleLayer(map).metadata).toEqual({ version: 2 });
		expect(layerOrder(map, LAYERS)).toEqual(LAYERS);
		expect(errors.messages()).toEqual([]);
	});

	it('leaves the layer alone for metadata that is equal but a new object', async () => {
		const { map, rerender } = await mountProps({ layer: { metadata: { version: 1 } } });
		const removeLayer = vi.spyOn(map, 'removeLayer');

		await rerender({ layer: { metadata: { version: 1 } } });

		expect(removeLayer).not.toHaveBeenCalled();
	});

	it('changes the zoom range in place', async () => {
		const { map, rerender } = await mountProps({ layer: { minzoom: 5 } });
		const removeLayer = vi.spyOn(map, 'removeLayer');

		await rerender({ layer: { minzoom: 6, maxzoom: 12 } });

		expect(styleLayer(map)).toMatchObject({ minzoom: 6, maxzoom: 12 });
		expect(removeLayer).not.toHaveBeenCalled();
	});

	it('sets minzoom without giving the layer a maxzoom', async () => {
		const { map, rerender } = await mountProps({});

		await rerender({ layer: { minzoom: 5 } });

		expect(styleLayer(map).minzoom).toBe(5);
		expect(styleLayer(map).maxzoom).toBeUndefined();
	});

	it.each(['minzoom', 'maxzoom'] as const)('removes %s when it is unset', async (name) => {
		const { map, rerender, errors } = await mountProps({ layer: { minzoom: 5, maxzoom: 10 } });

		const rest: { minzoom?: number; maxzoom?: number } = { minzoom: 5, maxzoom: 10 };
		delete rest[name];
		await rerender({ layer: rest });

		expect(styleLayer(map)[name]).toBeUndefined();
		expect(styleLayer(map)).toMatchObject(rest);
		expect(layerOrder(map, LAYERS)).toEqual(LAYERS);
		expect(errors.messages()).toEqual([]);
	});
});

describe('MapLibre padding (#20)', () => {
	it('goes back to no padding when padding is unset', async () => {
		const { map, rerender } = await mountProps({ padding: { top: 40, left: 10 } });
		expect(map.getPadding()).toMatchObject({ top: 40, left: 10 });

		await rerender({ padding: undefined });

		expect(map.getPadding()).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
	});
});

type Reader<T> = (instance: T) => unknown;

const markerProps: {
	name: string;
	value: unknown;
	read: Reader<MapLibreMarker>;
	unset: unknown;
}[] = [
	{
		name: 'offset',
		value: [5, 5],
		read: (marker) => {
			const { x, y } = marker.getOffset();
			return [x, y];
		},
		unset: [0, -14]
	},
	{ name: 'draggable', value: true, read: (marker) => marker.isDraggable(), unset: false },
	{ name: 'rotation', value: 45, read: (marker) => marker.getRotation(), unset: 0 },
	{
		name: 'rotationAlignment',
		value: 'map',
		read: (marker) => marker.getRotationAlignment(),
		unset: 'auto'
	},
	{
		name: 'pitchAlignment',
		value: 'map',
		read: (marker) => marker.getPitchAlignment(),
		unset: 'auto'
	},
	{
		name: 'opacity',
		value: 0.5,
		read: (marker) => marker.getElement().style.opacity,
		unset: '1'
	},
	{
		name: 'opacityWhenCovered',
		value: 0.5,
		read: (marker) => (marker as unknown as { _opacityWhenCovered: string })._opacityWhenCovered,
		unset: '0.2'
	},
	{
		name: 'subpixelPositioning',
		value: true,
		read: (marker) => (marker as unknown as { _subpixelPositioning: boolean })._subpixelPositioning,
		unset: false
	},
	// Constructor-only: unsetting builds a new marker with the default.
	{
		name: 'scale',
		value: 2,
		read: (marker) => (marker as unknown as { _scale: number })._scale,
		unset: 1
	}
];

describe('Marker props set back to undefined (#20)', () => {
	it.each(markerProps)('$name goes back to its default', async ({ name, value, read, unset }) => {
		const { rerender, marker, errors } = await mountProps({ marker: { [name]: value } });
		expect(read(marker())).not.toEqual(unset);

		await rerender({ marker: {} });

		expect(read(marker())).toEqual(unset);
		expect(errors.messages()).toEqual([]);
	});

	it('keeps opacityWhenCovered when only opacity is unset', async () => {
		const { rerender, marker } = await mountProps({
			marker: { opacity: 0.5, opacityWhenCovered: 0.4 }
		});

		await rerender({ marker: { opacityWhenCovered: 0.4 } });

		expect(marker().getElement().style.opacity).toBe('1');
		expect((marker() as unknown as { _opacityWhenCovered: string })._opacityWhenCovered).toBe(
			'0.4'
		);
	});
});

const popupProps: { name: string; value: unknown; read: Reader<MapLibrePopup>; unset: unknown }[] =
	[
		{ name: 'maxWidth', value: '100px', read: (popup) => popup.getMaxWidth(), unset: '240px' },
		{ name: 'offset', value: 20, read: (popup) => popup.options.offset, unset: undefined },
		{
			name: 'padding',
			value: { top: 10, bottom: 10, left: 10, right: 10 },
			read: (popup) => popup.options.padding,
			unset: undefined
		},
		{
			name: 'subpixelPositioning',
			value: true,
			read: (popup) => popup.options.subpixelPositioning,
			unset: false
		},
		// Constructor-only: unsetting builds a new popup with the default.
		{ name: 'anchor', value: 'top', read: (popup) => popup.options.anchor, unset: undefined }
	];

describe('Popup props set back to undefined (#20)', () => {
	it.each(popupProps)('$name goes back to its default', async ({ name, value, read, unset }) => {
		const { rerender, popup, errors } = await mountProps({ popup: { [name]: value } });
		expect(read(popup())).not.toEqual(unset);

		await rerender({ popup: {} });

		expect(read(popup())).toEqual(unset);
		expect(popup().isOpen()).toBe(true);
		expect(errors.messages()).toEqual([]);
	});
});

describe('Image metadata (#20)', () => {
	it('re-registers the image when its metadata changes', async () => {
		const { map, rerender, errors } = await mountProps({ image: { pixelRatio: 1 } });
		expect(map.getImage('dot')?.pixelRatio).toBe(1);

		await rerender({ image: { pixelRatio: 2, sdf: true } });

		expect(map.getImage('dot')).toMatchObject({ pixelRatio: 2, sdf: true });
		expect(errors.messages()).toEqual([]);
	});

	it('goes back to the defaults when metadata is unset', async () => {
		const { map, rerender } = await mountProps({ image: { pixelRatio: 2, sdf: true } });

		await rerender({ image: {} });

		expect(map.getImage('dot')).toMatchObject({ pixelRatio: 1, sdf: false });
	});

	it('leaves the image alone for metadata that is equal but a new object', async () => {
		const { map, rerender } = await mountProps({ image: { stretchX: [[0, 1]] } });
		const removeImage = vi.spyOn(map, 'removeImage');

		await rerender({ image: { stretchX: [[0, 1]] } });

		expect(removeImage).not.toHaveBeenCalled();
	});
});
