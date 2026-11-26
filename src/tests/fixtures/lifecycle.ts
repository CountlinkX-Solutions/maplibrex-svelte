import { onTestFinished, vi } from 'vitest';
import { tick } from 'svelte';
import {
	addProtocol,
	removeProtocol,
	type AddProtocolAction,
	type ErrorEvent as MapErrorEvent,
	type Map as MapLibreMap,
	type StyleSpecification
} from 'maplibre-gl';
// Imported here, not in a `.svelte.test.ts` file: those are compiled by the
// Svelte compiler, which cannot parse import attributes on the 5.16 floor.
import sveltePackage from 'svelte/package.json' with { type: 'json' };
import type { MapState } from './StatusStack.svelte';

/**
 * Helpers for browser tests of the source, layer and style lifecycle: swapping
 * the style, reading what ended up in it, capturing errors, and simulating the
 * failures that headless Chromium can produce. Every helper that changes
 * global state undoes it when the test finishes.
 */

export const WAIT = { timeout: 15_000 } as const;

/**
 * True when the installed Svelte is older than `version` (`major.minor.patch`),
 * for behaviour that changed inside the peer range.
 */
export function svelteOlderThan(version: string): boolean {
	const installed = sveltePackage.version.split(/[.-]/).map(Number);
	const target = version.split('.').map(Number);

	for (let index = 0; index < 3; index += 1) {
		if (installed[index] !== target[index]) return installed[index] < target[index];
	}
	return false;
}

/** Lets pending Svelte effects run, then one rendered frame, then effects again. */
export async function settle(): Promise<void> {
	await tick();
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	await tick();
}

/**
 * Reports the map context's style epoch, which the library increments once
 * the map has loaded and again after each style swap has loaded. Pass
 * `onepoch` to the `EpochProbe` fixture rendered inside `<MapLibre>`.
 */
export function createEpochProbe() {
	let epoch = -1;

	return {
		onepoch(next: number) {
			epoch = next;
		},
		/** The last epoch seen, or -1 before the probe mounted. */
		get epoch() {
			return epoch;
		}
	};
}

export type EpochProbe = ReturnType<typeof createEpochProbe>;

/**
 * Swaps the map style and waits until the library has finished re-applying
 * what the component tree declares: the epoch moved on, and the effects that
 * re-add sources, layers and style state have run.
 *
 * @param rerender re-renders the fixture with the given props merged into the
 *   current ones.
 */
export async function swapStyle(
	rerender: (props: { mapStyle: StyleSpecification | string }) => Promise<unknown>,
	probe: EpochProbe,
	mapStyle: StyleSpecification | string
): Promise<void> {
	const before = probe.epoch;

	await rerender({ mapStyle });
	await vi.waitFor(() => {
		if (probe.epoch <= before) {
			throw new Error(`The library did not re-apply after the style swap (epoch ${probe.epoch}).`);
		}
	}, WAIT);
	await settle();
}

/** The ids of the given layers in the order the map draws them, bottom first. */
export function layerOrder(map: MapLibreMap, ids: readonly string[]): string[] {
	return map
		.getStyle()
		.layers.map((layer) => layer.id)
		.filter((id) => ids.includes(id));
}

type FeatureTarget = { source: string; id: string | number; sourceLayer?: string };

/**
 * What the map holds of the given entities, as one plain object to compare
 * with `toEqual`: the sources present, the layers present in draw order, the
 * terrain source, and the state of each feature (`null` when its source is
 * missing).
 */
export function readStyle(
	map: MapLibreMap,
	{
		sources = [],
		layers = [],
		featureStates = []
	}: { sources?: string[]; layers?: string[]; featureStates?: FeatureTarget[] }
) {
	return {
		sources: sources.filter((id) => map.getSource(id) !== undefined),
		layers: layerOrder(map, layers),
		terrain: map.getTerrain()?.source ?? null,
		featureState: Object.fromEntries(
			featureStates.map((target) => [
				`${target.source}/${target.id}`,
				map.getSource(target.source) ? map.getFeatureState(target) : null
			])
		)
	};
}

/**
 * Collects what the map reports through its `error` event. Pass `onerror` to
 * `<MapLibre>`; it is attached before any source or layer is added.
 */
export function createMapErrorLog() {
	const errors: MapErrorEvent['error'][] = [];

	return {
		onerror(event: MapErrorEvent) {
			errors.push(event.error);
		},
		errors,
		messages: () => errors.map((error) => error.message)
	};
}

/**
 * Collects what the `StatusStack` fixture reports. Pass `onstate` to it. The
 * history holds one entry per Svelte update, so changes made within one
 * update show up only as their outcome.
 */
export function createStateLog() {
	const history: MapState[] = [];

	return {
		onstate(state: MapState) {
			history.push(state);
		},
		history,
		/** The latest state, or one with no map before the fixture reported. */
		get current(): MapState {
			return history.at(-1) ?? { status: 'loading', error: null, ready: false, map: null };
		},
		/** The map, once there is one. */
		get map(): MapLibreMap {
			const map = this.current.map;
			if (!map) throw new Error('The fixture has not reported a map.');
			return map;
		}
	};
}

/**
 * Collects errors that escape to the window, uncaught throws and unhandled
 * rejections, for the rest of the test. While a listener is registered Vitest
 * logs such errors instead of failing the run, so a test can assert on them.
 * `attempt` runs an action and records what it throws in the same list.
 */
export function captureUncaughtErrors() {
	const errors: unknown[] = [];
	const onError = (event: ErrorEvent) => errors.push(event.error ?? event.message);
	const onRejection = (event: PromiseRejectionEvent) => errors.push(event.reason);

	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onRejection);
	onTestFinished(async () => {
		// Late errors from a teardown still land here rather than in the next test.
		await settle();
		window.removeEventListener('error', onError);
		window.removeEventListener('unhandledrejection', onRejection);
	});

	return {
		errors,
		async attempt(action: () => unknown): Promise<void> {
			try {
				await action();
			} catch (error) {
				errors.push(error);
			}
		},
		messages: () =>
			errors.map((error) => (error instanceof Error ? `${error.name}: ${error.message}` : error))
	};
}

/**
 * Silences `console.error` until the test finishes, and records the first
 * argument of each call as text.
 */
export function captureConsoleErrors() {
	const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
	onTestFinished(() => spy.mockRestore());

	return { messages: () => spy.mock.calls.map(([first]) => String(first)) };
}

/**
 * Makes every canvas refuse a WebGL context, as a browser without WebGL does,
 * until the test finishes. Call it before the map is created.
 */
export function withoutWebGL(): void {
	const original = HTMLCanvasElement.prototype.getContext;

	HTMLCanvasElement.prototype.getContext = function (
		this: HTMLCanvasElement,
		type: string,
		...rest: unknown[]
	) {
		if (type.includes('webgl')) return null;
		return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
	} as typeof original;

	onTestFinished(() => {
		HTMLCanvasElement.prototype.getContext = original;
	});
}

let protocols = 0;

/** Registers a URL scheme served by `handler` until the test finishes. */
function registerScheme(handler: AddProtocolAction): string {
	const scheme = `maplibrex-test-${++protocols}`;
	addProtocol(scheme, handler);
	onTestFinished(() => removeProtocol(scheme));
	return scheme;
}

/** A style URL whose request fails with `message`, without touching the network. */
export function failingStyleUrl(message = 'style unavailable'): string {
	const scheme = registerScheme(async () => {
		throw new Error(message);
	});
	return `${scheme}://style.json`;
}

/** A style URL that serves `style` as soon as it is requested. */
export function styleUrl(style: StyleSpecification): string {
	const scheme = registerScheme(async () => ({ data: style }));
	return `${scheme}://style.json`;
}

/** Tile URLs whose every request fails with `message`. */
export function failingTileUrls(message = 'tile unavailable'): string[] {
	const scheme = registerScheme(async () => {
		throw new Error(message);
	});
	return [`${scheme}://{z}/{x}/{y}`];
}

/** A style URL whose request stays pending until the test calls `resolve`. */
export function deferredStyleUrl() {
	let resolve!: (style: StyleSpecification) => void;
	const style = new Promise<StyleSpecification>((done) => (resolve = done));
	const scheme = registerScheme(async () => ({ data: await style }));

	return { url: `${scheme}://style.json`, resolve };
}

let flatTile: Promise<ArrayBuffer> | undefined;

/**
 * Tile URLs for a `raster-dem` source (`mapbox` encoding) whose every tile is
 * flat ground at sea level, generated in the browser.
 */
export function flatDemTiles(): string[] {
	flatTile ??= (async () => {
		const canvas = new OffscreenCanvas(256, 256);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('No 2D canvas to draw the DEM tile with.');
		// Mapbox Terrain-RGB: height = -10000 + (R * 65536 + G * 256 + B) * 0.1, so 0 m.
		context.fillStyle = 'rgb(1, 134, 160)';
		context.fillRect(0, 0, 256, 256);
		return (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
	})();

	const scheme = registerScheme(async () => ({ data: (await flatTile)!.slice(0) }));
	return [`${scheme}://{z}/{x}/{y}`];
}

/** An image URL that serves the 256-pixel PNG of {@link flatDemTiles}. */
export function pngUrl(): string {
	const [template] = flatDemTiles();
	return template.replace('{z}/{x}/{y}', 'image.png');
}

/** A TileJSON URL that lists `tiles`, served without touching the network. */
export function tileJsonUrl(tiles: string[]): string {
	const scheme = registerScheme(async () => ({ data: { tilejson: '3.0.0', tiles } }));
	return `${scheme}://tiles.json`;
}
