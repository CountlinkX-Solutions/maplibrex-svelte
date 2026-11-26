import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import type { Map as MapLibreMap, MapEventType, PaddingOptions } from 'maplibre-gl';
import CameraStack, { type Camera, type CameraControls } from './fixtures/CameraStack.svelte';
import { WAIT, settle } from './fixtures/lifecycle.js';
import type { CameraMode } from '#lib/types.js';

/**
 * Issue #18: each camera prop keeps its own latest target until the map
 * gets there or someone else moves the camera, so a second change during an
 * animation does not cut the first one short.
 *
 * Time is driven by MapLibre's own events rather than by sleeping: a test
 * waits for the first `move` of an animation, which proves it is under way
 * and not finished, and then for the map to come to rest.
 */

const START: Camera = { center: [0, 0], zoom: 2, bearing: 0, pitch: 0 };

type Options = {
	twoWay?: boolean;
	cameraMode?: CameraMode;
	padding?: PaddingOptions;
	onmove?: () => void;
	onmovestart?: () => void;
	onmoveend?: () => void;
};

async function mountCamera(options: Options = {}) {
	let map: MapLibreMap | null = null;
	let controls: CameraControls | null = null;

	await render(CameraStack, {
		initial: START,
		...options,
		oncontrols: (value: CameraControls) => {
			controls = value;
		},
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	});
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const camera = controls as unknown as CameraControls;
	/** Assigns camera props as an app would, and lets Svelte run its effects. */
	const set = async (next: Camera) => {
		camera.set(next);
		await tick();
	};

	return { map: map as unknown as MapLibreMap, camera, set };
}

function nextEvent(map: MapLibreMap, type: keyof MapEventType): Promise<void> {
	return new Promise((resolve) => map.once(type, () => resolve()));
}

async function atRest(map: MapLibreMap): Promise<void> {
	await vi.waitFor(() => expect(map.isMoving()).toBe(false), WAIT);
	await settle();
}

function readCamera(map: MapLibreMap) {
	const center = map.getCenter();
	return {
		center: [center.lng, center.lat],
		zoom: map.getZoom(),
		bearing: map.getBearing(),
		pitch: map.getPitch()
	};
}

describe('camera targets (#18)', () => {
	it.each([
		{ twoWay: true, cameraMode: 'ease' },
		{ twoWay: true, cameraMode: 'fly' },
		{ twoWay: false, cameraMode: 'ease' },
		{ twoWay: false, cameraMode: 'fly' }
	] as const)(
		'keeps the zoom target when center changes during the animation (two-way: $twoWay, $cameraMode)',
		async (options) => {
			const { map, set } = await mountCamera(options);

			const moving = nextEvent(map, 'move');
			await set({ zoom: 6 });
			await moving;
			expect(map.isMoving()).toBe(true);
			expect(map.getZoom()).toBeLessThan(6);

			await set({ center: [10, 10] });
			await atRest(map);

			expect(map.getZoom()).toBeCloseTo(6, 6);
			expect(map.getCenter().lng).toBeCloseTo(10, 6);
			expect(map.getCenter().lat).toBeCloseTo(10, 6);
		}
	);

	it('keeps both earlier targets through a third change', async () => {
		const { map, set } = await mountCamera();

		let moving = nextEvent(map, 'move');
		await set({ zoom: 6 });
		await moving;
		moving = nextEvent(map, 'move');
		await set({ center: [10, 10] });
		await moving;
		await set({ bearing: 30 });
		await atRest(map);

		const camera = readCamera(map);
		expect(camera.zoom).toBeCloseTo(6, 6);
		expect(camera.center[0]).toBeCloseTo(10, 6);
		expect(camera.center[1]).toBeCloseTo(10, 6);
		expect(camera.bearing).toBeCloseTo(30, 6);
	});

	it('writes the camera back to bound props, ending at the targets', async () => {
		const { map, camera, set } = await mountCamera();

		const moving = nextEvent(map, 'move');
		await set({ zoom: 6 });
		await moving;
		await set({ center: [10, 10] });
		await atRest(map);

		expect(camera.values.zoom).toBeCloseTo(6, 6);
		expect(camera.values.center).toEqual([map.getCenter().lng, map.getCenter().lat]);
	});

	it('applies both changes in jump mode', async () => {
		const { map, set } = await mountCamera({ cameraMode: 'jump' });
		const jumpTo = vi.spyOn(map, 'jumpTo');

		await set({ zoom: 6 });
		await set({ center: [10, 10] });
		await atRest(map);

		expect(jumpTo).toHaveBeenCalledTimes(2);
		expect(map.getZoom()).toBeCloseTo(6, 6);
		expect(map.getCenter().lng).toBeCloseTo(10, 6);
	});

	it.each(['jump', 'ease', 'fly'] as const)(
		'moves the map with one call in %s mode, and not again once it is there',
		async (cameraMode) => {
			const { map, set } = await mountCamera({ cameraMode });
			const calls = {
				jump: vi.spyOn(map, 'jumpTo'),
				ease: vi.spyOn(map, 'easeTo'),
				fly: vi.spyOn(map, 'flyTo')
			};
			const starts = vi.fn();
			map.on('movestart', starts);

			await set({ zoom: 5, bearing: 15 });
			await atRest(map);
			// Assigning where the map already is moves nothing.
			await set({ zoom: 5 });
			await atRest(map);

			expect(calls[cameraMode]).toHaveBeenCalledTimes(1);
			expect(starts).toHaveBeenCalledTimes(1);
			expect(map.getZoom()).toBeCloseTo(5, 6);
			expect(map.getBearing()).toBeCloseTo(15, 6);
		}
	);

	it('lets a camera move made elsewhere win over the targets in flight', async () => {
		const { map, camera, set } = await mountCamera();

		const moving = nextEvent(map, 'move');
		await set({ zoom: 6 });
		await moving;
		// What a gesture does: stop the animation and move the camera itself.
		map.jumpTo({ center: [-20, 5] });
		await atRest(map);
		const left = map.getZoom();
		expect(left).toBeLessThan(6);
		expect(camera.values.zoom).toBeCloseTo(left, 6);

		await set({ bearing: 20 });
		await atRest(map);

		expect(map.getZoom()).toBeCloseTo(left, 6);
		expect(map.getCenter().lng).toBeCloseTo(-20, 6);
		expect(map.getBearing()).toBeCloseTo(20, 6);
	});

	it('lets a drag during the animation win over the targets in flight', async () => {
		const { map, set } = await mountCamera();
		const canvas = map.getCanvasContainer();
		const box = canvas.getBoundingClientRect();
		const at = (dx: number) => ({
			bubbles: true,
			button: 0,
			buttons: 1,
			clientX: box.left + box.width / 2 + dx,
			clientY: box.top + box.height / 2
		});

		const moving = nextEvent(map, 'move');
		await set({ zoom: 6 });
		await moving;

		canvas.dispatchEvent(new MouseEvent('mousedown', at(0)));
		for (const dx of [10, 20, 40]) {
			window.dispatchEvent(new MouseEvent('mousemove', at(dx)));
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		}
		window.dispatchEvent(new MouseEvent('mouseup', { ...at(40), buttons: 0 }));
		await atRest(map);
		const left = map.getZoom();
		expect(left).toBeLessThan(6);

		await set({ bearing: 20 });
		await atRest(map);

		expect(map.getZoom()).toBeCloseTo(left, 6);
		expect(map.getBearing()).toBeCloseTo(20, 6);
	});

	it('moves the map when the parent assigns a one-way prop', async () => {
		const { map, set } = await mountCamera({ twoWay: false, cameraMode: 'jump' });

		await set({ zoom: 4 });
		await atRest(map);
		expect(map.getZoom()).toBeCloseTo(4, 6);

		await set({ zoom: 3 });
		await atRest(map);
		expect(map.getZoom()).toBeCloseTo(3, 6);
	});
});
