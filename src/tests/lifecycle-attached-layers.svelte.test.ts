import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import AttachedLayerStack from './fixtures/AttachedLayerStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createMapErrorLog,
	readStyle,
	settle
} from './fixtures/lifecycle.js';

/**
 * Issue #14 (audit D2): a layer that names its source with `source="id"`
 * behaves like one nested in the source.
 */

type Scenario =
	| 'after'
	| 'before'
	| 'together'
	| 'together-nested'
	| 'split'
	| 'split-before'
	| 'rename'
	| 'manual';

type Toggles = {
	tolerance?: number;
	show?: boolean;
	showSource?: boolean;
	showLayer?: boolean;
	sourceId?: string;
};

async function mountAttached(scenario: Scenario) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		scenario,
		tolerance: 0.375,
		show: true,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(AttachedLayerStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	let current: Toggles = {};
	const rerender = async (next: Toggles) => {
		current = { ...current, ...next };
		await screen.rerender({ ...initialProps, ...current });
		await settle();
	};

	return { screen, rerender, errors, map: map as unknown as MapLibreMap };
}

const BOTH = { sources: ['s'], layers: ['attached'] };
const NONE = { sources: [], layers: [] };

describe('layers attached with source="id" (#14)', () => {
	it('survive a source recreate', async () => {
		const { map, rerender } = await mountAttached('after');
		const before = map.getSource('s');
		expect(readStyle(map, BOTH)).toMatchObject(BOTH);

		await rerender({ tolerance: 0.5 });

		// The new tolerance has no setter, so the source must have been recreated.
		expect(map.getSource('s')).not.toBe(before);
		expect(readStyle(map, BOTH)).toMatchObject(BOTH);
	});

	it('leave no orphan source when unmounted with it, and remount without throwing', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, map, rerender } = await mountAttached('together');

		try {
			expect(readStyle(map, BOTH)).toMatchObject(BOTH);

			await uncaught.attempt(() => rerender({ show: false }));
			expect(readStyle(map, BOTH)).toMatchObject(NONE);

			await uncaught.attempt(() => rerender({ show: true }));
			expect(uncaught.messages()).toEqual([]);
			expect(readStyle(map, BOTH)).toMatchObject(BOTH);
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});

	it('appear once their source mounts when declared before it', async () => {
		const { map } = await mountAttached('before');

		expect(readStyle(map, BOTH)).toMatchObject(BOTH);
	});

	// Control: the nested form already behaved; the attached one must match it.
	it('behave like a nested layer when unmounted and remounted with the source', async () => {
		const { map, rerender, errors } = await mountAttached('together-nested');

		await rerender({ show: false });
		expect(readStyle(map, BOTH)).toMatchObject(NONE);

		await rerender({ show: true });
		expect(readStyle(map, BOTH)).toMatchObject(BOTH);
		expect(errors.messages()).toEqual([]);
	});

	for (const scenario of ['split', 'split-before'] as const) {
		const where = scenario === 'split' ? 'after' : 'before';

		it(`leave the style clean whichever unmounts first (layer ${where} the source)`, async () => {
			for (const first of ['showLayer', 'showSource'] as const) {
				const uncaught = captureUncaughtErrors();
				const { screen, map, rerender, errors } = await mountAttached(scenario);
				const second = first === 'showLayer' ? 'showSource' : 'showLayer';

				try {
					expect(readStyle(map, BOTH), first).toMatchObject(BOTH);

					await uncaught.attempt(() => rerender({ [first]: false }));
					await uncaught.attempt(() => rerender({ [second]: false }));
					expect(readStyle(map, BOTH), first).toMatchObject(NONE);

					await uncaught.attempt(() => rerender({ [first]: true, [second]: true }));
					expect(readStyle(map, BOTH), first).toMatchObject(BOTH);
					expect(uncaught.messages(), first).toEqual([]);
					expect(errors.messages(), first).toEqual([]);
				} finally {
					await uncaught.attempt(() => screen.unmount());
				}
			}
		});

		it(`wait for their source to come back (layer ${where} the source)`, async () => {
			const { map, rerender, errors } = await mountAttached(scenario);

			await rerender({ showSource: false });
			expect(readStyle(map, BOTH)).toMatchObject(NONE);

			await rerender({ showSource: true });
			expect(readStyle(map, BOTH)).toMatchObject(BOTH);
			expect(errors.messages()).toEqual([]);
		});
	}

	it('follow a source whose id changes when they name it by that id, and wait when they do not', async () => {
		const { map, rerender, errors } = await mountAttached('rename');
		const layers = ['nested', 'fixed', 'following'];
		expect(readStyle(map, { sources: ['s', 't'], layers })).toMatchObject({
			sources: ['s'],
			layers
		});

		await rerender({ sourceId: 't' });
		expect(readStyle(map, { sources: ['s', 't'], layers })).toMatchObject({
			sources: ['t'],
			layers: ['nested', 'following']
		});
		expect(map.getLayer('nested')?.source).toBe('t');
		expect(map.getLayer('following')?.source).toBe('t');

		await rerender({ sourceId: 's' });
		expect(readStyle(map, { sources: ['s', 't'], layers })).toMatchObject({
			sources: ['s'],
			layers
		});
		expect(errors.messages()).toEqual([]);
	});

	it('wait for a source the app adds by hand', async () => {
		const { map, errors } = await mountAttached('manual');
		expect(map.getLayer('attached')).toBeUndefined();

		map.addSource('manual', {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});

		await vi.waitFor(() => expect(map.getLayer('attached')?.source).toBe('manual'), WAIT);
		// The source arrived after the update in which the style loaded, so the
		// wait was reported once (#55), and the layer still went in.
		expect(errors.messages()).toEqual([
			expect.stringMatching(/Layer "attached" is waiting for source "manual"/)
		]);
	});
});
