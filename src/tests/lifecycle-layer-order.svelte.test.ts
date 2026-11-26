import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Map as MapLibreMap } from 'maplibre-gl';
import EachStack from './fixtures/EachStack.svelte';
import OrderStack from './fixtures/OrderStack.svelte';
import { WAIT, createMapErrorLog, layerOrder, settle } from './fixtures/lifecycle.js';

/**
 * Issues #1 and #8: the map draws layers in the order the component tree
 * declares them, whenever each layer mounted.
 */

type OrderProps = {
	scenario: 'nested' | 'late' | 'missing-before' | 'before-late' | 'move' | 'rename' | 'resource';
	showLate?: boolean;
	bBefore?: string;
	middleId?: string;
	lineSource?: string;
};

async function mountOrderStack(scenario: OrderProps['scenario'], props: Partial<OrderProps> = {}) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		scenario,
		showLate: false,
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(OrderStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const rerender = async (next: Partial<OrderProps>) => {
		await screen.rerender({ ...initialProps, ...next });
		await settle();
	};

	return { rerender, errors, map: map as unknown as MapLibreMap };
}

async function mountEachStack(ids: string[], keyed: boolean) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		ids,
		keyed,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(EachStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const setIds = async (next: string[]) => {
		await screen.rerender({ ...initialProps, ids: next });
		await settle();
	};

	return { setIds, errors, map: map as unknown as MapLibreMap };
}

describe('layer order (#1, #8)', () => {
	// Passes on every version tried: layers at the same depth keep tree order,
	// as the audit expected.
	it('keeps sibling layers nested in one source in markup order', async () => {
		const { map } = await mountOrderStack('nested');

		expect(layerOrder(map, ['grid', 'grid-2'])).toEqual(['grid', 'grid-2']);
	});

	// Issue #1's own example. Before the registry, Svelte releases older than
	// 5.58.1 ran the nested layers one flush after the top-level ones and the
	// map drew `a, b, grid, grid-2`. Order now comes from the markup.
	it('draws layers nested in a source between the top-level layers around it', async () => {
		const { map } = await mountOrderStack('nested');

		expect(layerOrder(map, ['a', 'grid', 'grid-2', 'b'])).toEqual(['a', 'grid', 'grid-2', 'b']);
	});

	it('puts a layer that mounts late in its markup position, not on top', async () => {
		const { map, rerender } = await mountOrderStack('late');
		expect(layerOrder(map, ['a', 'late', 'b'])).toEqual(['a', 'b']);

		await rerender({ showLate: true });

		await vi.waitFor(() => expect(map.getLayer('late')).toBeDefined(), WAIT);
		expect(layerOrder(map, ['a', 'late', 'b'])).toEqual(['a', 'late', 'b']);
	});

	it('never moves a layer when it mounts without a beforeId', async () => {
		const moveLayer = vi.spyOn(MapLibreMap.prototype, 'moveLayer');

		try {
			const { map, rerender } = await mountOrderStack('late');
			await rerender({ showLate: true });
			await vi.waitFor(() => expect(map.getLayer('late')).toBeDefined(), WAIT);

			expect(moveLayer).not.toHaveBeenCalled();
		} finally {
			moveLayer.mockRestore();
		}
	});

	it('does not silently lose a layer whose beforeId names no layer', async () => {
		const { map } = await mountOrderStack('missing-before');

		expect(map.getLayer('lost')).toBeDefined();
	});

	it('reports a beforeId that names no layer through onerror, once', async () => {
		const { errors } = await mountOrderStack('missing-before');

		expect(errors.messages().filter((message) => message.includes('no-such-layer'))).toEqual([
			'[maplibrex] Layer "lost" has beforeId "no-such-layer", which is not in the style. ' +
				'It was added on top, and moves below "no-such-layer" if a layer component adds it later.'
		]);
	});

	it('moves a layer below its beforeId target when the target mounts later', async () => {
		const { map, rerender } = await mountOrderStack('before-late');
		expect(layerOrder(map, ['a', 'under', 'target', 'b'])).toEqual(['a', 'b', 'under']);

		await rerender({ showLate: true });

		await vi.waitFor(() => expect(map.getLayer('target')).toBeDefined(), WAIT);
		expect(layerOrder(map, ['a', 'under', 'target', 'b'])).toEqual(['a', 'under', 'target', 'b']);
	});

	it('moves a layer when beforeId changes, and back to its markup position when it is cleared', async () => {
		const { map, rerender } = await mountOrderStack('move');
		const ids = ['a', 'b', 'c'];
		expect(layerOrder(map, ids)).toEqual(['a', 'b', 'c']);

		await rerender({ bBefore: 'a' });
		expect(layerOrder(map, ids)).toEqual(['b', 'a', 'c']);

		await rerender({ bBefore: undefined });
		expect(layerOrder(map, ids)).toEqual(['a', 'b', 'c']);
	});

	it('keeps the markup position of a layer whose id changes', async () => {
		const { map, rerender, errors } = await mountOrderStack('rename');
		expect(layerOrder(map, ['a', 'middle', 'b'])).toEqual(['a', 'middle', 'b']);

		await rerender({ middleId: 'renamed' });

		expect(layerOrder(map, ['a', 'middle', 'renamed', 'b'])).toEqual(['a', 'renamed', 'b']);
		expect(errors.messages()).toEqual([]);
	});

	it('keeps the markup position of a layer whose source changes', async () => {
		const { map, rerender, errors } = await mountOrderStack('resource');
		expect(layerOrder(map, ['a', 'line', 'b'])).toEqual(['a', 'line', 'b']);

		await rerender({ lineSource: 's2' });

		expect(map.getLayer('line')?.source).toBe('s2');
		expect(layerOrder(map, ['a', 'line', 'b'])).toEqual(['a', 'line', 'b']);
		expect(errors.messages()).toEqual([]);
	});
});

describe('layers generated by {#each} (#1)', () => {
	const ALL = ['bottom', 'x', 'y', 'z', 'w', 'top'];

	it('follows the list when an unkeyed block is reordered', async () => {
		const { map, setIds, errors } = await mountEachStack(['x', 'y', 'z'], false);
		expect(layerOrder(map, ALL)).toEqual(['bottom', 'x', 'y', 'z', 'top']);

		await setIds(['z', 'x', 'y']);

		expect(layerOrder(map, ALL)).toEqual(['bottom', 'z', 'x', 'y', 'top']);
		expect(errors.messages()).toEqual([]);
	});

	it('puts an item inserted in the middle of an unkeyed block in its place', async () => {
		const { map, setIds, errors } = await mountEachStack(['x', 'z'], false);

		await setIds(['x', 'y', 'z']);

		expect(layerOrder(map, ALL)).toEqual(['bottom', 'x', 'y', 'z', 'top']);
		expect(errors.messages()).toEqual([]);
	});

	it('puts an item inserted in the middle of a keyed block in its place', async () => {
		const { map, setIds, errors } = await mountEachStack(['x', 'z'], true);

		await setIds(['x', 'y', 'z']);

		expect(layerOrder(map, ALL)).toEqual(['bottom', 'x', 'y', 'z', 'top']);
		expect(errors.messages()).toEqual([]);
	});
});
