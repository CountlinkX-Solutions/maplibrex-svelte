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
