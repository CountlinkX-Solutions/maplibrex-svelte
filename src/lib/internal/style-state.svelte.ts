import { untrack } from 'svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { getMapContext, getStyleRegistry } from '../context.js';
import { deepEqual } from './deep-equal.js';

/**
 * How one kind of style-level state is read and written. `S` is what the
 * style held before the component wrote anything, which unmounting puts back.
 */
export interface StyleStateAccess<T, S> {
	/** How the registry names the component in reports. */
	readonly name: string;
	/** The value the props ask for. Read when it is applied and whenever it changes. */
	value(): T;
	/** What the style holds now. */
	snapshot(map: MapLibreMap): S;
	/** Writes `next` over `last`, the value written before, if any. */
	write(map: MapLibreMap, next: T, last: T | undefined, snapshot: S): void;
	/** Puts `snapshot` back in place of `last`. */
	restore(map: MapLibreMap, snapshot: S, last: T): void;
}

/**
 * Holds a piece of style-level state (light, sky, projection, global state)
 * for as long as the calling component is mounted.
 *
 * It goes through the style registry as a dependent that reads no source, so
 * it follows the same rules as layers and terrain: it is applied once the
 * style can take it, which a style being rebuilt or one that failed to load
 * cannot, and again after every style swap. The style's own value is read
 * each time it is applied, so what unmounting puts back belongs to the style
 * the map shows then, not to the one the component first replaced.
 */
export function holdStyleState<T, S>(access: StyleStateAccess<T, S>): void {
	const context = getMapContext();
	const registry = getStyleRegistry();

	/** Written to the style that is shown now. */
	let applied = $state(false);
	let last: T | undefined;
	let snapshot: S | undefined;

	$effect(() => {
		const registration = registry.addDependent({
			source: undefined,
			name: access.name,
			apply: (map) => {
				const held = access.snapshot(map);
				const next = access.value();
				access.write(map, next, undefined, held);
				snapshot = held;
				last = next;
				applied = true;
			},
			unapply: (map) => {
				applied = false;
				access.restore(map, snapshot as S, last as T);
			},
			reset: () => {
				applied = false;
			}
		});

		return () => registration.unregister();
	});

	// Changes while applied go straight to the style; while not applied, the
	// next apply reads the props anyway.
	$effect(() => {
		const map = context.map;
		const next = access.value();
		if (!map || !applied) return;

		untrack(() => {
			if (deepEqual(last, next)) return;
			access.write(map, next, last, snapshot as S);
			last = next;
		});
	});
}
