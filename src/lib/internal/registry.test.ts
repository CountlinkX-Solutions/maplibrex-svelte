import { describe, expect, it } from 'vitest';
import {
	createStyleRegistry,
	type DependentEntry,
	type RegistryMap,
	type SourceEntry
} from './registry.js';

/**
 * The registry decides when entries go into the style and where layers go in
 * the draw order. These tests drive it with a stand-in for the map that keeps
 * only what the registry reads, and with anchors that are plain positions in
 * place of DOM nodes, so the ordering rules are checked without a browser.
 */

class FakeMap implements RegistryMap {
	readonly sources = new Set<string>();
	order: string[] = [];
	readonly log: string[] = [];

	constructor(basemap: { sources?: string[]; layers?: string[] } = {}) {
		for (const id of basemap.sources ?? []) this.sources.add(id);
		this.order = [...(basemap.layers ?? [])];
	}

	getSource(id: string) {
		return this.sources.has(id) ? { id } : undefined;
	}

	getLayer(id: string) {
		return this.order.includes(id) ? { id } : undefined;
	}

	getLayersOrder() {
		return [...this.order];
	}

	moveLayer(id: string, beforeId?: string) {
		if (beforeId !== undefined && !this.order.includes(beforeId)) {
			throw new Error(`moveLayer before missing "${beforeId}"`);
		}
		this.log.push(`move ${id}${beforeId ? ` before ${beforeId}` : ''}`);
		this.order = this.order.filter((other) => other !== id);
		this.insert(id, beforeId);
	}

	addSource(id: string) {
		if (this.sources.has(id)) throw new Error(`Source "${id}" already exists.`);
		this.log.push(`add source ${id}`);
		this.sources.add(id);
	}

	removeSource(id: string) {
		this.log.push(`remove source ${id}`);
		this.sources.delete(id);
	}

	/** Mirrors MapLibre: a layer whose source is missing is refused, not thrown. */
	addLayer(id: string, source: string | undefined, beforeId?: string): boolean {
		if (beforeId !== undefined && !this.order.includes(beforeId)) {
			throw new Error(`addLayer before missing "${beforeId}"`);
		}
		if (source !== undefined && !this.sources.has(source)) return false;
		this.log.push(`add ${id}${beforeId ? ` before ${beforeId}` : ''}`);
		this.insert(id, beforeId);
		return true;
	}

	removeLayer(id: string) {
		this.log.push(`remove ${id}`);
		this.order = this.order.filter((other) => other !== id);
	}

	/** Stands in for a style swap: everything the app added is gone. */
	replaceStyle(basemap: { sources?: string[]; layers?: string[] } = {}) {
		this.sources.clear();
		for (const id of basemap.sources ?? []) this.sources.add(id);
		this.order = [...(basemap.layers ?? [])];
	}

	private insert(id: string, beforeId?: string) {
		const index = beforeId === undefined ? this.order.length : this.order.indexOf(beforeId);
		this.order.splice(index, 0, id);
	}
}

type Anchor = { position: number };

function setup(basemap?: { sources?: string[]; layers?: string[] }) {
	const map = new FakeMap(basemap);
	const reported: string[] = [];
	const deferred: Array<() => void> = [];
	const registry = createStyleRegistry<FakeMap, Anchor>({
		report: (error) => reported.push(error.message),
		compare: (a, b) => a.position - b.position,
		defer: (check) => deferred.push(check)
	});

	/** Runs the checks the registry deferred, as the end of a Svelte update would. */
	function settle() {
		for (const check of deferred.splice(0)) check();
	}

	function source(id: string): SourceEntry<FakeMap> {
		return {
			id,
			add: (target) => target.addSource(id),
			remove: (target) => target.removeSource(id)
		};
	}

	function layer(
		id: string,
		position: number,
		options: { source?: string; beforeId?: string } = {}
	): DependentEntry<FakeMap, Anchor> {
		return {
			source: options.source,
			layer: { id, anchor: { position }, beforeId: options.beforeId },
			apply: (target, beforeId) => target.addLayer(id, options.source, beforeId),
			unapply: (target) => target.removeLayer(id)
		};
	}

	function state(name: string, sourceId: string): DependentEntry<FakeMap, Anchor> {
		return {
			source: sourceId,
			name: `<${name}>`,
			apply: (target) => {
				target.log.push(`apply ${name}`);
			},
			unapply: (target) => {
				target.log.push(`unapply ${name}`);
			}
		};
	}

	return { map, registry, reported, settle, source, layer, state };
}

function permutations<T>(items: T[]): T[][] {
	if (items.length <= 1) return [items];
	return items.flatMap((item, index) =>
		permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
			item,
			...rest
		])
	);
}

describe('style registry: when entries are applied', () => {
	it('applies nothing before the map has loaded its style', () => {
		const { map, registry, source, layer } = setup();

		registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		expect(map.log).toEqual([]);

		registry.start(map);
		expect(map.log).toEqual(['add source s', 'add l']);
	});

	it('keeps a dependent pending until its source is in the style', () => {
		const { map, registry, source, layer, state } = setup();
		registry.start(map);

		registry.addDependent(layer('l', 1, { source: 's' }));
		registry.addDependent(state('terrain', 's'));
		expect(map.log).toEqual([]);

		registry.addSource(source('s'));
		expect(map.log).toEqual(['add source s', 'add l', 'apply terrain']);
	});

	it('counts a source it does not manage, from the basemap or added by hand', () => {
		const { map, registry, layer } = setup({ sources: ['basemap'] });
		registry.start(map);

		registry.addDependent(layer('on-basemap', 1, { source: 'basemap' }));
		registry.addDependent(layer('on-manual', 2, { source: 'manual' }));
		expect(map.order).toEqual(['on-basemap']);

		map.sources.add('manual');
		registry.sourcesChanged();
		expect(map.order).toEqual(['on-basemap', 'on-manual']);
	});

	it('does not retry a refused dependent on every source event', () => {
		const { map, registry } = setup({ sources: ['basemap'] });
		let attempts = 0;
		registry.start(map);

		registry.addDependent({
			source: 'basemap',
			apply: () => {
				attempts += 1;
				return false;
			},
			unapply: () => {}
		});
		registry.sourcesChanged();
		registry.sourcesChanged();

		expect(attempts).toBe(1);
	});

	it('takes dependents out before their source goes, and leaves them pending', () => {
		const { map, registry, source, layer, state } = setup();
		registry.start(map);
		const registration = registry.addSource(source('s'));
		registry.addDependent(layer('a', 1, { source: 's' }));
		registry.addDependent(state('hover', 's'));
		map.log.length = 0;

		registration.unregister();
		expect(map.log).toEqual(['unapply hover', 'remove a', 'remove source s']);

		map.log.length = 0;
		registry.addSource(source('s'));
		expect(map.log).toEqual(['add source s', 'add a', 'apply hover']);
	});

	it('takes dependents out and back in when the source is recreated', () => {
		const { map, registry, source, layer } = setup();
		registry.start(map);
		const registration = registry.addSource(source('s'));
		registry.addDependent(layer('below', 1, { source: 's' }));
		registry.addDependent(layer('other', 2));
		registry.addDependent(layer('above', 3, { source: 's' }));
		map.log.length = 0;

		registration.recreate();

		expect(map.log).toEqual([
			'remove above',
			'remove below',
			'remove source s',
			'add source s',
			'add below before other',
			'add above'
		]);
		expect(map.order).toEqual(['below', 'other', 'above']);
	});

	it('unapplies a dependent that unregisters, and forgets it', () => {
		const { map, registry, layer } = setup();
		registry.start(map);
		const registration = registry.addDependent(layer('l', 1));

		registration.unregister();
		registration.unregister();

		expect(map.log).toEqual(['add l', 'remove l']);
	});

	it('lets one registration hold a layer id at a time, and hands it over in place', () => {
		const { map, registry, reported, layer } = setup();
		registry.start(map);
		registry.addDependent(layer('bottom', 0));
		const first = registry.addDependent(layer('x', 1));
		const second = registry.addDependent(layer('y', 2));
		registry.addDependent(layer('top', 9));

		// An unkeyed `{#each}` going from [x, y] to [y, x]: the first item takes
		// `y` while the second item still holds it.
		first.unregister();
		registry.addDependent(layer('y', 1));
		expect(map.order).toEqual(['bottom', 'y', 'top']);

		second.unregister();
		registry.addDependent(layer('x', 2));

		expect(map.order).toEqual(['bottom', 'y', 'x', 'top']);
		expect(reported).toEqual([]);
	});

	it('lets one registration hold a source id at a time', () => {
		const { map, registry, reported, source, layer } = setup();
		registry.start(map);
		const first = registry.addSource(source('s'));
		const second = registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		expect(reported).toEqual([]);
		map.log.length = 0;

		second.unregister();
		expect(map.log).toEqual([]);

		first.unregister();
		expect(map.log).toEqual(['remove l', 'remove source s']);
	});

	it('hands a source id over to the registration that waited for it', () => {
		const { map, registry, source, layer } = setup();
		registry.start(map);
		const first = registry.addSource(source('s'));
		registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		map.log.length = 0;

		first.unregister();

		expect(map.log).toEqual(['remove l', 'remove source s', 'add source s', 'add l']);
	});

	it('reports an entry that throws and still applies the others', () => {
		const { map, registry, reported, source, layer } = setup();
		registry.addSource({
			id: 'broken',
			add: () => {
				throw new Error('invalid source');
			},
			remove: () => {}
		});
		registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));

		registry.start(map);

		expect(reported).toEqual(['invalid source']);
		expect(map.order).toEqual(['l']);
	});
});

describe('style registry: draw order', () => {
	it('keeps markup order whatever order the layers arrive in', () => {
		for (const arrival of permutations([0, 1, 2, 3])) {
			const { map, registry, source, layer } = setup({ layers: ['basemap'] });
			registry.start(map);

			// Each layer reads its own source, which arrives in the given order.
			for (const position of [0, 1, 2, 3]) {
				registry.addDependent(layer(`l${position}`, position, { source: `s${position}` }));
			}
			for (const position of arrival) registry.addSource(source(`s${position}`));

			expect(map.order, `arrival ${arrival.join(',')}`).toEqual([
				'basemap',
				'l0',
				'l1',
				'l2',
				'l3'
			]);
		}
	});

	it('puts a layer with beforeId where it says, and never places others relative to it', () => {
		const { map, registry, layer } = setup({ layers: ['basemap-labels'] });
		registry.start(map);

		registry.addDependent(layer('c', 3));
		registry.addDependent(layer('under-labels', 2, { beforeId: 'basemap-labels' }));
		// `under-labels` sits between `a` and `c` in the markup, but `a` must go
		// below `c`, not below a layer that put itself elsewhere.
		registry.addDependent(layer('a', 1));

		expect(map.order).toEqual(['under-labels', 'basemap-labels', 'a', 'c']);
	});

	it('reports a missing beforeId once, adds the layer on top, and moves it when that layer arrives', () => {
		const { map, registry, reported, layer } = setup({ layers: ['basemap'] });
		registry.start(map);
		registry.addDependent(layer('x', 2));

		registry.addDependent(layer('lost', 1, { beforeId: 'later' }));
		expect(map.order).toEqual(['basemap', 'x', 'lost']);
		expect(reported).toEqual([
			'[maplibrex] Layer "lost" has beforeId "later", which is not in the style. It was added on top, and moves below "later" if a layer component adds it later.'
		]);

		registry.styleLoading();
		map.replaceStyle({ layers: ['basemap'] });
		registry.styleLoaded();
		expect(map.order).toEqual(['basemap', 'x', 'lost']);
		expect(reported).toHaveLength(1);

		// `later` goes below `x`, its successor in the markup, and `lost` follows it.
		map.log.length = 0;
		registry.addDependent(layer('later', 0));
		expect(map.log).toEqual(['add later before x', 'move lost before later']);
		expect(map.order).toEqual(['basemap', 'lost', 'later', 'x']);
	});

	it('does not report a beforeId naming a layer it will add later', () => {
		const { map, registry, reported, source, layer } = setup();
		registry.start(map);

		registry.addDependent(layer('target', 2, { source: 's' }));
		registry.addDependent(layer('under', 1, { beforeId: 'target' }));
		expect(reported).toEqual([]);

		registry.addSource(source('s'));
		expect(map.order).toEqual(['under', 'target']);
	});

	it('moves a layer when beforeId changes, and back into markup order when it is cleared', () => {
		const { map, registry, layer } = setup();
		registry.start(map);
		registry.addDependent(layer('a', 1));
		const b = registry.addDependent(layer('b', 2));
		registry.addDependent(layer('c', 3));
		map.log.length = 0;

		b.setBeforeId('a');
		expect(map.order).toEqual(['b', 'a', 'c']);

		b.setBeforeId('a');
		b.setBeforeId(undefined);
		expect(map.order).toEqual(['a', 'b', 'c']);
		expect(map.log).toEqual(['move b before a', 'move b before c']);
	});

	it('does not move a layer that has no beforeId when it mounts', () => {
		const { map, registry, layer } = setup();
		registry.start(map);

		registry.addDependent(layer('a', 1));
		registry.addDependent(layer('b', 2));

		expect(map.log).toEqual(['add a', 'add b']);
	});

	it('puts layers back in markup order when their anchors move', () => {
		const { map, registry } = setup();
		registry.start(map);
		const anchors = [1, 2, 3].map((position) => ({ position }));
		const ids = ['a', 'b', 'c'];
		ids.forEach((id, index) =>
			registry.addDependent({
				source: undefined,
				layer: { id, anchor: anchors[index] },
				apply: (target, beforeId) => target.addLayer(id, undefined, beforeId),
				unapply: (target) => target.removeLayer(id)
			})
		);
		registry.addDependent({
			source: undefined,
			layer: { id: 'under-b', anchor: { position: 0 }, beforeId: 'b' },
			apply: (target, beforeId) => target.addLayer('under-b', undefined, beforeId),
			unapply: (target) => target.removeLayer('under-b')
		});
		expect(map.order).toEqual(['a', 'under-b', 'b', 'c']);

		// A keyed `{#each}` reordered to c, a, b: the nodes move, no effect runs.
		anchors[2].position = 0;
		registry.reorder();

		expect(map.order).toEqual(['c', 'a', 'under-b', 'b']);
	});
});

describe('style registry: style swaps', () => {
	it('forgets everything when a new style starts loading, without touching the map', () => {
		const { map, registry, source, layer, state } = setup();
		const resets: string[] = [];
		registry.start(map);
		registry.addSource({ ...source('s'), reset: () => resets.push('s') });
		registry.addDependent({ ...layer('l', 1, { source: 's' }), reset: () => resets.push('l') });
		registry.addDependent({ ...state('hover', 's'), reset: () => resets.push('hover') });
		map.log.length = 0;

		registry.styleLoading();
		map.replaceStyle();
		registry.addDependent(layer('late', 2));

		expect(map.log).toEqual([]);
		expect(resets).toEqual(['l', 'hover', 's']);

		registry.styleLoaded();
		expect(map.log).toEqual(['add source s', 'add l', 'add late', 'apply hover']);
		expect(map.order).toEqual(['l', 'late']);
	});

	it('after a diff, re-applies what the new style lost in markup order', () => {
		const { map, registry, source, layer, state } = setup();
		registry.start(map);
		registry.addSource(source('s'));
		registry.addDependent(layer('a', 1));
		registry.addDependent(layer('b', 2, { source: 's' }));
		registry.addDependent(state('terrain', 's'));

		// A diff applies in place: no loading phase, and the style it leaves holds
		// only what the new specification declares.
		map.replaceStyle({ layers: ['basemap'] });
		map.log.length = 0;
		registry.styleLoaded();

		expect(map.log).toEqual(['add source s', 'add a', 'add b', 'apply terrain']);
		expect(map.order).toEqual(['basemap', 'a', 'b']);
	});

	it('keeps a source and layers the diff left in place', () => {
		const { map, registry, source, layer } = setup();
		registry.start(map);
		registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		map.log.length = 0;

		registry.styleLoaded();

		expect(map.log).toEqual([]);
	});

	it('forgets everything when the map goes away', () => {
		const { map, registry, source, layer } = setup();
		registry.start(map);
		const registration = registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		map.log.length = 0;

		registry.stop();
		registration.unregister();
		registry.addDependent(layer('late', 2));

		expect(map.log).toEqual([]);
		expect(registry.started).toBe(false);
	});
});

describe('style registry: sources nothing provides (#55)', () => {
	it('reports a dependent still waiting once the update that loaded the style is over', () => {
		const { map, registry, reported, settle, layer, state } = setup();
		registry.addDependent(layer('l', 1, { source: 'typo' }));
		registry.addDependent(state('Terrain', 'no-dem'));

		registry.start(map);
		expect(reported).toEqual([]);

		settle();
		expect(reported).toEqual([
			expect.stringMatching(/^\[maplibrex\] Layer "l" is waiting for source "typo"/),
			expect.stringMatching(/^\[maplibrex\] <Terrain> is waiting for source "no-dem"/)
		]);
	});

	it('reports each entry once, across style loads', () => {
		const { map, registry, reported, settle, layer } = setup();
		registry.addDependent(layer('l', 1, { source: 'typo' }));
		registry.start(map);
		settle();

		registry.styleLoading();
		registry.styleLoaded();
		settle();

		expect(reported).toHaveLength(1);
	});

	it('does not report a source a component registers within the same update', () => {
		const { map, registry, reported, settle, source, layer } = setup();
		registry.start(map);

		registry.addDependent(layer('l', 1, { source: 's' }));
		registry.addSource(source('s'));
		settle();

		expect(reported).toEqual([]);
		expect(map.order).toEqual(['l']);
	});

	it('does not report a source the map already has, from the basemap or added by hand', () => {
		const { map, registry, reported, settle, layer } = setup({ sources: ['basemap'] });
		registry.addDependent(layer('on-basemap', 1, { source: 'basemap' }));
		registry.addDependent(layer('on-manual', 2, { source: 'manual' }));

		registry.start(map);
		map.sources.add('manual');
		settle();

		expect(reported).toEqual([]);
	});

	it('does not report a registered source that the map refused', () => {
		const { map, registry, reported, settle, layer } = setup();
		registry.addSource({ id: 'refused', add: () => false, remove: () => {} });
		registry.addDependent(layer('l', 1, { source: 'refused' }));

		registry.start(map);
		settle();

		expect(reported).toEqual([]);
	});

	it('checks nothing before the style is usable', () => {
		const { map, registry, reported, settle, layer } = setup();
		registry.addDependent(layer('early', 1, { source: 'typo' }));
		settle();
		expect(reported).toEqual([]);

		registry.start(map);
		registry.styleLoading();
		registry.addDependent(layer('during-swap', 2, { source: 'typo-2' }));
		settle();

		expect(reported).toEqual([]);
	});

	it('reports a dependent that registers after the style loaded', () => {
		const { map, registry, reported, settle, layer } = setup();
		registry.start(map);
		settle();

		registry.addDependent(layer('late', 1, { source: 'typo' }));
		settle();

		expect(reported).toEqual([
			expect.stringContaining('Layer "late" is waiting for source "typo"')
		]);
	});

	it('does not report a dependent whose source the app removed after it was applied', () => {
		const { map, registry, reported, settle, source, layer } = setup();
		registry.start(map);
		const registration = registry.addSource(source('s'));
		registry.addDependent(layer('l', 1, { source: 's' }));
		settle();

		// The source goes, and in the same update a new dependent waits for a
		// source that arrives right after it, which runs the check.
		registration.unregister();
		registry.addDependent(layer('other', 2, { source: 't' }));
		registry.addSource(source('t'));
		settle();

		expect(reported).toEqual([]);
		expect(map.order).toEqual(['other']);
	});

	it('reports a dependent whose source the new style no longer has', () => {
		const { map, registry, reported, settle, layer } = setup({ sources: ['basemap'] });
		registry.addDependent(layer('l', 1, { source: 'basemap' }));
		registry.start(map);
		settle();
		expect(reported).toEqual([]);

		registry.styleLoading();
		map.replaceStyle();
		registry.styleLoaded();
		settle();

		expect(reported).toEqual([
			expect.stringContaining('Layer "l" is waiting for source "basemap"')
		]);
	});

	it('does not report a dependent that left before the check', () => {
		const { map, registry, reported, settle, layer } = setup();
		registry.start(map);

		registry.addDependent(layer('gone', 1, { source: 'typo' })).unregister();
		settle();

		expect(reported).toEqual([]);
	});
});
