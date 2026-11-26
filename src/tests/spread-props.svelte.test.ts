import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ComponentProps } from 'svelte';
import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import SpreadStack from './fixtures/SpreadStack.svelte';
import { WAIT, flatDemTiles, settle } from './fixtures/lifecycle.js';

/**
 * Issue #61. Props spread from an object, as in `<Layer {...props} />`, are
 * read through that object, so replacing it makes every read of a prop run
 * again, even when no value changed. A component that adds itself to the map
 * from an effect that reads such a prop takes itself out and adds itself
 * again: a layer drops its tiles and restarts its transitions.
 */

type StackProps = ComponentProps<typeof SpreadStack>;

/** The map calls that add something, take it out or set it again. */
const registrationCalls = [
	'addSource',
	'removeSource',
	'addLayer',
	'removeLayer',
	'setFeatureState',
	'removeFeatureState',
	'addImage',
	'removeImage',
	'setTerrain',
	'addControl',
	'removeControl',
	'setLight',
	'setSky',
	'setProjection',
	'setGlobalStateProperty'
] as const;

/** Records the registration calls made on `map` from now on, by name. */
function recordRegistrations(map: MapLibreMap): () => string[] {
	const target = map as unknown as Record<string, (...args: unknown[]) => unknown>;
	const spies = registrationCalls.map((name) => [name, vi.spyOn(target, name)] as const);

	return () => spies.flatMap(([name, spy]) => spy.mock.calls.map(() => name));
}

async function mountStack(props: StackProps) {
	let map: MapLibreMap | null = null;
	let current: StackProps = {
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};
	const screen = await render(SpreadStack, current);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = async (next: Partial<StackProps>) => {
		current = { ...current, ...next };
		await screen.rerender(current);
	};

	return { rerender, map: map as unknown as MapLibreMap };
}

/** Each props object of `props` replaced with a shallow copy: equal values, a new object. */
function copies(props: StackProps): Partial<StackProps> {
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => [
			key,
			value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : value
		])
	);
}

const pixel = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
const noop: CustomLayerInterface = { id: 'spread-custom', type: 'custom', render() {} };
const points = {
	type: 'FeatureCollection' as const,
	features: [
		{
			type: 'Feature' as const,
			properties: {},
			geometry: { type: 'Point' as const, coordinates: [0, 0] }
		}
	]
};

function inContainer(map: MapLibreMap, selector: string): Element | null {
	return map.getContainer().querySelector(selector);
}

/**
 * What each component is given, and how to tell it is on the map. `element`
 * names the node a marker or popup puts on the map, which must stay the same
 * node: they are built from their props, not added through a map call.
 */
const cases: {
	name: string;
	props: () => StackProps;
	present: (map: MapLibreMap) => boolean;
	element?: string;
}[] = [
	{
		name: 'GeoJSONSource',
		props: () => ({ source: { id: 'spread-source', data: points } }),
		present: (map) => map.getSource('spread-source') !== undefined
	},
	{
		name: 'Layer',
		props: () => ({ layer: { id: 'spread-layer', type: 'circle', source: 'pts' } }),
		present: (map) => map.getLayer('spread-layer') !== undefined
	},
	{
		name: 'CircleLayer',
		props: () => ({ circle: { id: 'spread-circle', source: 'pts' } }),
		present: (map) => map.getLayer('spread-circle') !== undefined
	},
	{
		name: 'FeatureState',
		props: () => ({ featureState: { source: 'pts', id: 1, state: { hover: true } } }),
		present: (map) => map.getFeatureState({ source: 'pts', id: 1 }).hover === true
	},
	{
		name: 'CustomLayer',
		props: () => ({ custom: { layer: noop } }),
		present: (map) => map.getLayer('spread-custom') !== undefined
	},
	{
		name: 'Image',
		props: () => ({ image: { id: 'spread-image', image: pixel } }),
		present: (map) => map.hasImage('spread-image')
	},
	{
		name: 'Terrain',
		props: () => ({ terrain: { exaggeration: 1.5 }, demTiles: flatDemTiles() }),
		present: (map) => map.getTerrain()?.source === 'dem'
	},
	{
		name: 'NavigationControl',
		props: () => ({ control: { position: 'top-left', showCompass: false } }),
		present: (map) => inContainer(map, '.maplibregl-ctrl-zoom-in') !== null
	},
	{
		name: 'CustomControl',
		props: () => ({ customControl: { position: 'bottom-left' } }),
		present: (map) => inContainer(map, '[data-testid="custom-control"]') !== null
	},
	{
		name: 'Marker',
		props: () => ({ marker: { lngLat: [0, 0] } }),
		present: (map) => inContainer(map, '.maplibregl-marker') !== null,
		element: '.maplibregl-marker'
	},
	{
		name: 'Popup',
		props: () => ({ popup: { lngLat: [0, 0], open: true } }),
		present: (map) => inContainer(map, '.maplibregl-popup') !== null,
		element: '.maplibregl-popup'
	},
	{
		name: 'Light',
		props: () => ({ light: { intensity: 0.4 } }),
		present: (map) => map.getLight().intensity === 0.4
	},
	{
		name: 'Sky',
		props: () => ({ sky: { 'sky-color': '#001133' } }),
		present: (map) => map.getSky()?.['sky-color'] === '#001133'
	},
	{
		name: 'Projection',
		props: () => ({ projection: { type: 'globe' } }),
		present: (map) => map.getProjection()?.type === 'globe'
	},
	{
		name: 'GlobalState',
		props: () => ({ globalState: { mode: 'spread' } }),
		present: (map) => map.getGlobalState().mode === 'spread'
	}
];

describe('a spread props object replaced with an equal one (#61)', () => {
	it.each(cases)(
		'<$name {...props}> stays on the map without being added again',
		async ({ props, present, element }) => {
			const initial = props();
			const { map, rerender } = await mountStack(initial);
			await vi.waitFor(() => expect(present(map)).toBe(true), WAIT);
			await settle();

			const before = element ? inContainer(map, element) : null;
			const registrations = recordRegistrations(map);

			await rerender(copies(initial));
			await settle();

			expect(registrations()).toEqual([]);
			expect(present(map)).toBe(true);
			if (element) expect(inContainer(map, element)).toBe(before);
		}
	);
});
