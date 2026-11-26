import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { getWorkerUrl, type Map as MapLibreMap } from 'maplibre-gl';
import { workerUrl } from 'virtual:maplibrex-svelte/worker';
import MapStack from './fixtures/MapStack.svelte';

/**
 * The setup file points MapLibre at the worker `maplibrex-svelte/vite` serves.
 * Without a working worker the map still loads and the canvas still appears,
 * but no source data is ever parsed, so this checks for parsed features.
 */

const WAIT = { timeout: 15_000 } as const;

describe('the worker served by maplibrex-svelte/vite', () => {
	it('is the one MapLibre loads', () => {
		expect(workerUrl).toMatch(/\/maplibre\/maplibre-gl-worker\.mjs\?v=\d+\.\d+\.\d+/);
		expect(getWorkerUrl()).toBe(workerUrl);
	});

	it('parses source data', async () => {
		let map: MapLibreMap | null = null;

		await render(MapStack, {
			onmapready: (instance: MapLibreMap) => {
				map = instance;
			}
		});

		await vi.waitFor(() => {
			expect(map).not.toBeNull();
			const features = (map as unknown as MapLibreMap).querySourceFeatures('squares');
			expect(features.length).toBeGreaterThan(0);
		}, WAIT);
	});
});
