import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type {
	ErrorEvent as MapErrorEvent,
	LightSpecification,
	Map as MapLibreMap,
	ProjectionSpecification,
	SkySpecification,
	StyleSpecification
} from 'maplibre-gl';
import StyleLevelStack from './fixtures/StyleLevelStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createEpochProbe,
	createMapErrorLog,
	deferredStyleUrl,
	failingStyleUrl,
	flatDemTiles,
	settle,
	swapStyle
} from './fixtures/lifecycle.js';

/**
 * Style-level state (light, sky, projection, global state, images, terrain)
 * against style swaps: it waits for a style that can take it (#59), and what
 * a component puts back on unmount is what the current style holds (#22).
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

type StackProps = {
	mapStyle: StyleSpecification | string;
	light?: LightSpecification;
	sky?: SkySpecification;
	projection?: ProjectionSpecification;
	globalState?: Record<string, unknown>;
	image?: boolean;
	demTiles?: string[];
	exaggeration?: number;
};

async function mountStack(props: StackProps) {
	let map: MapLibreMap | null = null;
	const probe = createEpochProbe();
	const errors = createMapErrorLog();

	let current: StackProps & Record<string, unknown> = {
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: (event: MapErrorEvent) => errors.onerror(event),
		onepoch: probe.onepoch
	};
	const screen = await render(StyleLevelStack, current);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = async (next: Partial<StackProps>) => {
		current = { ...current, ...next };
		await screen.rerender(current);
	};

	return { screen, rerender, probe, errors, map: map as unknown as MapLibreMap };
}

/** What each component sets, and how to read it back from the map. */
const components = [
	{
		name: 'Light',
		props: { light: { anchor: 'map', intensity: 0.4 } },
		read: (map: MapLibreMap) => map.getLight().intensity,
		expected: 0.4
	},
	{
		name: 'Sky',
		props: { sky: { 'sky-color': '#001133' } },
		read: (map: MapLibreMap) => map.getSky()?.['sky-color'],
		expected: '#001133'
	},
	{
		name: 'Projection',
		props: { projection: { type: 'globe' } },
		read: (map: MapLibreMap) => map.getProjection()?.type,
		expected: 'globe'
	},
	{
		name: 'GlobalState',
		props: { globalState: { mode: 'component' } },
		read: (map: MapLibreMap) => map.getGlobalState().mode,
		expected: 'component'
	},
	{
		name: 'Image',
		props: { image: true },
		read: (map: MapLibreMap) => map.hasImage('dot'),
		expected: true
	}
] satisfies {
	name: string;
	props: Partial<StackProps>;
	read: (map: MapLibreMap) => unknown;
	expected: unknown;
}[];

describe('style-level components wait for a usable style (#59)', () => {
	// A rebuild replaces the style object with an empty one that takes no
	// setter until the new style has loaded, while the map stays `ready`.
	it.each(components)(
		'<$name> mounted while a style is rebuilt is applied once it loads, without throwing',
		async ({ props, read, expected }) => {
			const uncaught = captureUncaughtErrors();
			const { screen, map, rerender, probe } = await mountStack({ mapStyle: styleA });
			const next = deferredStyleUrl();
			const before = probe.epoch;

			try {
				map.setStyle(next.url, { diff: false });
				await settle();
				expect(map.isStyleLoaded()).toBe(false);

				await uncaught.attempt(() => rerender(props));
				await settle();

				next.resolve(styleB);
				await vi.waitFor(() => expect(probe.epoch).toBeGreaterThan(before), WAIT);
				await settle();

				expect(uncaught.messages()).toEqual([]);
				expect(map.getLayer('base-b')).toBeDefined();
				expect(read(map)).toBe(expected);
			} finally {
				await uncaught.attempt(() => screen.unmount());
			}
		}
	);

	it.each(components)(
		'<$name> mounted after a rebuilt style failed waits for the next style',
		async ({ props, read, expected }) => {
			const uncaught = captureUncaughtErrors();
			const { screen, map, rerender, probe, errors } = await mountStack({ mapStyle: styleA });
			const failed = new Promise<void>((resolve) => map.once('error', () => resolve()));

			try {
				map.setStyle(failingStyleUrl(), { diff: false });
				await failed;
				await settle();

				await uncaught.attempt(() => rerender(props));
				await settle();
				expect(uncaught.messages()).toEqual([]);

				const before = probe.epoch;
				await rerender({ mapStyle: styleB });
				await vi.waitFor(() => expect(probe.epoch).toBeGreaterThan(before), WAIT);
				await settle();

				expect(uncaught.messages()).toEqual([]);
				expect(errors.messages()).toEqual(['style unavailable']);
				expect(read(map)).toBe(expected);
			} finally {
				await uncaught.attempt(() => screen.unmount());
			}
		}
	);

	it.each(components)(
		'<$name> is applied again after a style swap',
		async ({ props, read, expected }) => {
			const { map, rerender, probe, errors } = await mountStack({ mapStyle: styleA, ...props });
			expect(read(map)).toBe(expected);

			await swapStyle(rerender, probe, styleB);

			expect(map.getLayer('base-b')).toBeDefined();
			expect(read(map)).toBe(expected);
			expect(errors.messages()).toEqual([]);
		}
	);
});

/** A style with a background layer and whatever style-level state is given. */
function styleWith(base: string, extra: Partial<StyleSpecification>): StyleSpecification {
	return {
		version: 8,
		sources: {},
		layers: [{ id: base, type: 'background', paint: { 'background-color': '#808080' } }],
		...extra
	};
}

/** A raster-dem source `id` declared by the style itself, with terrain on it. */
function terrainStyle(base: string, id: string): StyleSpecification {
	return {
		version: 8,
		sources: {
			[id]: { type: 'raster-dem', tiles: flatDemTiles(), tileSize: 256, encoding: 'mapbox' }
		},
		layers: [{ id: base, type: 'background', paint: { 'background-color': '#808080' } }],
		terrain: { source: id }
	};
}

/**
 * Each component over two styles that both declare a value of their own, so
 * restoring the first style's value into the second one is visible.
 */
const restoring = [
	{
		name: 'Light',
		styles: () => [
			styleWith('base-a', { light: { intensity: 0.1 } }),
			styleWith('base-b', { light: { intensity: 0.9 } })
		],
		props: () => ({ light: { anchor: 'map', intensity: 0.4 } }) as Partial<StackProps>,
		unmount: { light: undefined },
		read: (map: MapLibreMap) => map.getLight().intensity,
		values: [0.1, 0.9, 0.4]
	},
	{
		name: 'Sky',
		styles: () => [
			styleWith('base-a', { sky: { 'sky-color': '#ff0000' } }),
			styleWith('base-b', { sky: { 'sky-color': '#00ff00' } })
		],
		props: () => ({ sky: { 'sky-color': '#001133' } }) as Partial<StackProps>,
		unmount: { sky: undefined },
		read: (map: MapLibreMap) => map.getSky()?.['sky-color'],
		values: ['#ff0000', '#00ff00', '#001133']
	},
	{
		name: 'Projection',
		styles: () => [
			styleWith('base-a', { projection: { type: 'mercator' } }),
			styleWith('base-b', { projection: { type: 'globe' } })
		],
		props: () => ({ projection: { type: 'vertical-perspective' } }) as Partial<StackProps>,
		unmount: { projection: undefined },
		read: (map: MapLibreMap) => map.getProjection()?.type,
		values: ['mercator', 'globe', 'vertical-perspective']
	},
	{
		name: 'GlobalState',
		styles: () => [
			styleWith('base-a', { state: { mode: { default: 'a' } } }),
			styleWith('base-b', { state: { mode: { default: 'b' } } })
		],
		props: () => ({ globalState: { mode: 'component' } }) as Partial<StackProps>,
		unmount: { globalState: undefined },
		read: (map: MapLibreMap) => map.getGlobalState().mode,
		values: ['a', 'b', 'component']
	},
	{
		name: 'Terrain',
		styles: () => [terrainStyle('base-a', 'dem-a'), terrainStyle('base-b', 'dem-b')],
		props: () => ({ demTiles: flatDemTiles() }) as Partial<StackProps>,
		unmount: { demTiles: undefined },
		read: (map: MapLibreMap) => map.getTerrain()?.source ?? null,
		values: ['dem-a', 'dem-b', 'dem']
	}
];

describe('what a style-level component restores on unmount (#22)', () => {
	it.each(restoring)(
		'<$name> puts back the value of the style it was mounted on',
		async ({ styles, props, unmount, read, values: [first, , own] }) => {
			const [a] = styles();
			const { map, rerender, errors } = await mountStack({ mapStyle: a, ...props() });
			expect(read(map)).toEqual(own);

			await rerender(unmount);
			await settle();

			expect(read(map)).toEqual(first);
			expect(errors.messages()).toEqual([]);
		}
	);

	it.each(restoring)(
		'<$name> puts back the value of the current style after a swap',
		async ({ styles, props, unmount, read, values: [, second, own] }) => {
			const uncaught = captureUncaughtErrors();
			const [a, b] = styles();
			const { screen, map, rerender, probe, errors } = await mountStack({
				mapStyle: a,
				...props()
			});

			try {
				expect(read(map)).toEqual(own);

				await uncaught.attempt(() => swapStyle(rerender, probe, b));
				expect(map.getLayer('base-b')).toBeDefined();
				expect(read(map)).toEqual(own);

				await uncaught.attempt(() => rerender(unmount));
				await settle();

				expect(read(map)).toEqual(second);
				expect(uncaught.messages()).toEqual([]);
				expect(errors.messages()).toEqual([]);
			} finally {
				await uncaught.attempt(() => screen.unmount());
			}
		}
	);
});

describe('terrain exaggeration (#22)', () => {
	it('changes the exaggeration with one setTerrain, without clearing terrain first', async () => {
		const { map, rerender, errors } = await mountStack({
			mapStyle: styleA,
			demTiles: flatDemTiles(),
			exaggeration: 1.5
		});
		expect(map.getTerrain()).toEqual({ source: 'dem', exaggeration: 1.5 });
		const setTerrain = vi.spyOn(map, 'setTerrain');

		await rerender({ exaggeration: 3 });
		await settle();

		expect(setTerrain.mock.calls).toEqual([[{ source: 'dem', exaggeration: 3 }]]);
		expect(map.getTerrain()).toEqual({ source: 'dem', exaggeration: 3 });
		expect(errors.messages()).toEqual([]);
	});

	it('goes back to the default exaggeration when the prop is unset', async () => {
		const { map, rerender, errors } = await mountStack({
			mapStyle: styleA,
			demTiles: flatDemTiles(),
			exaggeration: 1.5
		});

		await rerender({ exaggeration: undefined });
		await settle();

		expect(map.getTerrain()).toEqual({ source: 'dem' });
		expect(errors.messages()).toEqual([]);
	});
});
