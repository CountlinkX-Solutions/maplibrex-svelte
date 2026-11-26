import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StyleSpecification } from 'maplibre-gl';
import StatusStack from './fixtures/StatusStack.svelte';
import {
	WAIT,
	captureConsoleErrors,
	captureUncaughtErrors,
	createMapErrorLog,
	createStateLog,
	deferredStyleUrl,
	failingStyleUrl,
	failingTileUrls,
	layerOrder,
	settle,
	styleUrl
} from './fixtures/lifecycle.js';
import type { MapStatus } from '#lib/types.js';

/**
 * Issue #3: `status` and `error` tell whether the map shows the current
 * `mapStyle`, is still loading it, or could not load it, and a style that
 * failed can be replaced by changing `mapStyle`.
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

/** Fails validation, with one error: the colour does not parse. */
const invalidStyle: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'broken', type: 'background', paint: { 'background-color': 'not-a-colour' } }]
};

const TREE = ['base-a', 'base-b', 'top-level', 'points-circle'];

type Props = {
	mapStyle: StyleSpecification | string;
	withTree?: boolean;
	rasterTiles?: string[];
};

async function mountStatus(props: Props, { handleErrors = true } = {}) {
	const state = createStateLog();
	const errors = createMapErrorLog();
	const uncaught = captureUncaughtErrors();

	let current = {
		withTree: true,
		...props,
		onstate: state.onstate,
		...(handleErrors && { onerror: errors.onerror })
	};
	const screen = await render(StatusStack, current);

	const rerender = async (next: Partial<Props>) => {
		current = { ...current, ...next };
		await screen.rerender(current);
		await settle();
	};

	return { screen, rerender, state, errors, uncaught };
}

function waitForStatus(state: ReturnType<typeof createStateLog>, status: MapStatus) {
	return vi.waitFor(() => expect(state.current.status).toBe(status), WAIT);
}

describe('map status (#3)', () => {
	it('is loading until the first style has loaded, then ready', async () => {
		const first = deferredStyleUrl();
		const { state, uncaught } = await mountStatus({ mapStyle: first.url });
		await settle();
		expect(state.current).toMatchObject({ status: 'loading', error: null, ready: false });

		first.resolve(styleA);
		await waitForStatus(state, 'ready');

		expect(state.current).toMatchObject({ error: null, ready: true });
		expect(state.map.getLayer('base-a')).toBeDefined();
		// `ready` turns true in the same update that first makes the status ready.
		expect(state.history.filter((entry) => entry.status === 'ready' && !entry.ready)).toEqual([]);
		expect(uncaught.messages()).toEqual([]);
	});

	it('is loading while a replacement style loads, and ready once it is shown', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');
		const next = deferredStyleUrl();

		await rerender({ mapStyle: next.url });
		// The previous style stays up, and `ready` stays true, while the next one is fetched.
		expect(state.current).toMatchObject({ status: 'loading', error: null, ready: true });
		expect(state.map.getLayer('base-a')).toBeDefined();

		next.resolve(styleB);
		await waitForStatus(state, 'ready');

		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	it('is ready after an inline style swap', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(state.current.error).toBeNull();
		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	// MapLibre fires nothing for a diff with no changes: no `style.load`, no error.
	it('is ready when the replacement style changes nothing', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');

		await rerender({ mapStyle: structuredClone(styleA) });
		await waitForStatus(state, 'ready');

		const loadingBefore = state.history.filter((entry) => entry.status === 'loading').length;
		await rerender({ mapStyle: styleUrl(structuredClone(styleA)) });
		await waitForStatus(state, 'ready');

		// The URL is fetched asynchronously, so the swap was seen loading first.
		expect(state.history.filter((entry) => entry.status === 'loading').length).toBeGreaterThan(
			loadingBefore
		);
		expect(state.current.error).toBeNull();
		expect(state.map.getLayer('base-a')).toBeDefined();
		expect(uncaught.messages()).toEqual([]);
	});

	it('reports a first style that fails to load, and recovers when mapStyle changes', async () => {
		const { state, rerender, errors, uncaught } = await mountStatus({
			mapStyle: failingStyleUrl('style unavailable')
		});

		await waitForStatus(state, 'error');
		expect(state.current.error?.message).toContain('style unavailable');
		expect(state.current.ready).toBe(false);
		expect(errors.messages()).toContainEqual(expect.stringContaining('style unavailable'));

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(state.current).toMatchObject({ error: null, ready: true });
		expect(state.map.getSource('points')).toBeDefined();
		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	it('reports a first style that does not validate, and recovers', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: invalidStyle });

		await waitForStatus(state, 'error');
		expect(state.current.error?.message).toContain('not-a-colour');

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	it('reports a replacement URL that fails, keeps the previous style, and recovers', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');

		await rerender({ mapStyle: failingStyleUrl('replacement unavailable') });
		await waitForStatus(state, 'error');

		expect(state.current.error?.message).toContain('replacement unavailable');
		expect(state.current.ready).toBe(true);
		expect(layerOrder(state.map, TREE)).toEqual(['base-a', 'top-level', 'points-circle']);

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(state.current.error).toBeNull();
		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	it('reports a replacement style that does not validate, and recovers', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');

		await rerender({ mapStyle: invalidStyle });
		await waitForStatus(state, 'error');

		expect(state.current.error?.message).toContain('not-a-colour');
		expect(layerOrder(state.map, TREE)).toEqual(['base-a', 'top-level', 'points-circle']);

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	// A style that is not loaded cannot be diffed, so each of these is a
	// rebuild, which starts from an empty style: after a failure nothing of the
	// tree is in the map until a style loads.
	it('brings the tree back after rebuilt styles failed', async () => {
		const { state, rerender, uncaught } = await mountStatus({
			mapStyle: failingStyleUrl('first unavailable')
		});
		await waitForStatus(state, 'error');

		await rerender({ mapStyle: failingStyleUrl('second unavailable') });
		await vi.waitFor(
			() => expect(state.current.error?.message).toContain('second unavailable'),
			WAIT
		);
		expect(state.current.status).toBe('error');

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(state.map.getSource('points')).toBeDefined();
		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	// MapLibre rebuilds by itself when it cannot diff and after a WebGL context
	// loss; calling `setStyle` with `diff: false` forces the same path.
	it('brings the tree back when a style MapLibre rebuilt fails and a good one follows', async () => {
		const { state, rerender, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');

		state.map.setStyle(failingStyleUrl('rebuild unavailable'), { diff: false });
		await waitForStatus(state, 'error');
		expect(state.current.error?.message).toContain('rebuild unavailable');
		expect(state.map.getLayer('points-circle')).toBeUndefined();

		await rerender({ mapStyle: styleB });
		await waitForStatus(state, 'ready');

		expect(state.map.getSource('points')).toBeDefined();
		expect(layerOrder(state.map, TREE)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(uncaught.messages()).toEqual([]);
	});

	it('ignores a tile that fails to load', async () => {
		const { state, errors, uncaught } = await mountStatus({
			mapStyle: styleA,
			rasterTiles: failingTileUrls('tile unavailable')
		});
		await waitForStatus(state, 'ready');

		await vi.waitFor(
			() => expect(errors.messages()).toContainEqual(expect.stringContaining('tile unavailable')),
			WAIT
		);
		await settle();

		expect(state.current).toMatchObject({ status: 'ready', error: null });
		expect(uncaught.messages()).toEqual([]);
	});

	it('ignores a tile that fails while a replacement style loads', async () => {
		const { state, rerender, errors, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');
		const next = deferredStyleUrl();

		await rerender({ mapStyle: next.url });
		// The source goes into the style still shown, and its tiles fail there.
		await rerender({ rasterTiles: failingTileUrls('tile unavailable') });
		await vi.waitFor(
			() => expect(errors.messages()).toContainEqual(expect.stringContaining('tile unavailable')),
			WAIT
		);
		await settle();
		expect(state.current.status).toBe('loading');

		next.resolve(styleB);
		await waitForStatus(state, 'ready');

		expect(state.current.error).toBeNull();
		expect(uncaught.messages()).toEqual([]);
	});

	it('ignores a sprite that fails to load with an otherwise good style', async () => {
		const { state, rerender, errors, uncaught } = await mountStatus({ mapStyle: styleA });
		await waitForStatus(state, 'ready');
		// Every path under the scheme fails, so it serves as a sprite URL too.
		const sprite = failingStyleUrl('sprite unavailable').replace(/style\.json$/, 'sprite');

		await rerender({ mapStyle: { ...styleB, sprite } });
		await vi.waitFor(
			() => expect(errors.messages()).toContainEqual(expect.stringContaining('sprite unavailable')),
			WAIT
		);
		await settle();

		expect(state.current).toMatchObject({ status: 'ready', error: null });
		expect(state.map.getLayer('base-b')).toBeDefined();
		expect(uncaught.messages()).toEqual([]);
	});

	it('keeps the status of two maps apart', async () => {
		const failing = await mountStatus({ mapStyle: failingStyleUrl('first map unavailable') });
		const working = await mountStatus({ mapStyle: styleA });

		await waitForStatus(failing.state, 'error');
		await waitForStatus(working.state, 'ready');
		expect(failing.state.current.error?.message).toContain('first map unavailable');
		expect(working.state.current.error).toBeNull();

		await failing.rerender({ mapStyle: styleB });
		await waitForStatus(failing.state, 'ready');

		expect(working.state.current).toMatchObject({ status: 'ready', error: null });
		expect(failing.state.map.getLayer('base-b')).toBeDefined();
		expect(working.state.map.getLayer('base-a')).toBeDefined();
		expect(working.state.map.getLayer('base-b')).toBeUndefined();
	});
});

describe('map errors without a handler', () => {
	// MapLibre writes errors to the console when nothing listens for them. The
	// library listens while a style loads, so it has to keep that promise.
	it('still writes a failed style to the console when nothing handles errors', async () => {
		const log = captureConsoleErrors();
		const { state } = await mountStatus(
			{ mapStyle: failingStyleUrl('style unavailable') },
			{ handleErrors: false }
		);

		await waitForStatus(state, 'error');

		expect(log.messages()).toContainEqual(expect.stringContaining('style unavailable'));
	});

	it('does not write a failed style to the console when onerror handles it', async () => {
		const log = captureConsoleErrors();
		const { state, errors } = await mountStatus({ mapStyle: failingStyleUrl('style unavailable') });

		await waitForStatus(state, 'error');

		expect(errors.messages()).toContainEqual(expect.stringContaining('style unavailable'));
		expect(log.messages()).not.toContainEqual(expect.stringContaining('style unavailable'));
	});
});

describe('unmounting in each status', () => {
	it.each([
		{
			name: 'loading the first style',
			setup: async () => {
				const mounted = await mountStatus({ mapStyle: deferredStyleUrl().url });
				await settle();
				expect(mounted.state.current.status).toBe('loading');
				return mounted;
			}
		},
		{
			name: 'ready',
			setup: async () => {
				const mounted = await mountStatus({ mapStyle: styleA });
				await waitForStatus(mounted.state, 'ready');
				return mounted;
			}
		},
		{
			name: 'loading a replacement style',
			setup: async () => {
				const mounted = await mountStatus({ mapStyle: styleA });
				await waitForStatus(mounted.state, 'ready');
				await mounted.rerender({ mapStyle: deferredStyleUrl().url });
				expect(mounted.state.current.status).toBe('loading');
				return mounted;
			}
		},
		{
			name: 'error',
			setup: async () => {
				const mounted = await mountStatus({ mapStyle: failingStyleUrl() });
				await waitForStatus(mounted.state, 'error');
				return mounted;
			}
		}
	])('does not throw when unmounted while $name', async ({ setup }) => {
		const { screen, uncaught } = await setup();

		await uncaught.attempt(() => screen.unmount());
		await settle();

		expect(uncaught.messages()).toEqual([]);
	});
});
