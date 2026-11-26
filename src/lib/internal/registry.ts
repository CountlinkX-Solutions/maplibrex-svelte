import type { Map as MapLibreMap } from 'maplibre-gl';
import { untrack } from 'svelte';

/**
 * The style registry: one per `<MapLibre>`, the single place that decides when
 * sources, layers and other source-bound style state go into the style and
 * where layers go in the draw order.
 *
 * Components no longer add themselves from their own effects, because Svelte
 * runs those in an order that has nothing to do with what the style needs: a
 * layer can run before its source, or after the layers drawn above it. They
 * register what they need instead, and the registry applies each entry once
 * the style can take it:
 *
 * - a source as soon as the style is usable;
 * - a dependent (layer, terrain, feature state) once the source it reads is in
 *   the style, whoever added it: a source component, the basemap, or the app
 *   by hand;
 * - every entry again after the style is replaced, since MapLibre drops what
 *   was added to the previous one.
 *
 * Layers carry an anchor, a node the component renders where it sits in the
 * markup. Document order of the anchors is the draw order the registry keeps,
 * whenever each layer happened to mount.
 */

/** What the registry reads and moves on the map; the rest is up to the entries. */
export interface RegistryMap {
	getSource(id: string): unknown;
	getLayer(id: string): unknown;
	moveLayer(id: string, beforeId?: string): unknown;
	getLayersOrder(): string[];
}

export interface SourceEntry<M> {
	readonly id: string;
	/** Adds the source to the style. Returning `false` means it is not there. */
	add(map: M): boolean | void;
	/** Removes it from the style, which the registry has emptied of dependents. */
	remove(map: M): void;
	/** The style no longer holds it: forget it without touching the map. */
	reset?(): void;
}

/** How a layer keeps its place in the draw order. */
export interface LayerPlacement<A> {
	readonly id: string;
	/** Rendered where the component sits in the markup. */
	readonly anchor: A;
	/** An explicit position, which overrides the markup. */
	readonly beforeId?: string;
}

export interface DependentEntry<M, A> {
	/** The source this entry reads, or `undefined` when it reads none. */
	readonly source: string | undefined;
	/** Present for layers. */
	readonly layer?: LayerPlacement<A>;
	/**
	 * Puts the entry in the style. `beforeId` is where a layer goes. Returning
	 * `false` means the map refused it, which MapLibre reports on its own.
	 */
	apply(map: M, beforeId: string | undefined): boolean | void;
	/** Takes it out of a style that is still usable, before its source goes. */
	unapply(map: M): void;
	/** The style no longer holds it: forget it without touching the map. */
	reset?(): void;
}

export interface SourceRegistration {
	/** Replaces the source in place, taking its dependents out and back in. */
	recreate(): void;
	unregister(): void;
}

export interface DependentRegistration {
	/** For layers: moves the layer when its explicit position changes. */
	setBeforeId(beforeId: string | undefined): void;
	unregister(): void;
}

export interface StyleRegistry<M extends RegistryMap = MapLibreMap, A = Node> {
	addSource(entry: SourceEntry<M>): SourceRegistration;
	addDependent(entry: DependentEntry<M, A>): DependentRegistration;
	/** The map's first style has loaded: apply everything registered so far. */
	start(map: M): void;
	/** The map is going away: forget every entry without touching it. */
	stop(): void;
	/** A replacement style started loading; the previous one is gone. */
	styleLoading(): void;
	/** A style finished loading or was changed by a diff: re-apply what it lost. */
	styleLoaded(): void;
	/** A source may have appeared that no component manages. */
	sourcesChanged(): void;
	/** Anchors may have moved in the document: put the layers back in that order. */
	reorder(): void;
	readonly started: boolean;
}

export interface RegistryOptions<A> {
	/** Where errors go: a missing `beforeId`, or an entry that threw. */
	report(error: Error): void;
	/** Document order of two anchors, as a sort comparator. */
	compare?(a: A, b: A): number;
}

type SourceRecord<M> = { entry: SourceEntry<M>; applied: boolean };

type DependentRecord<M, A> = {
	entry: DependentEntry<M, A>;
	applied: boolean;
	/** Tried while its source was there and refused; retried on a real change only. */
	failed: boolean;
	beforeId: string | undefined;
	/** The missing `beforeId` already reported, so a re-apply does not repeat it. */
	reported: string | undefined;
};

type LayerRecord<M, A> = DependentRecord<M, A> & { entry: { layer: LayerPlacement<A> } };

function documentOrder(a: Node, b: Node): number {
	if (a === b) return 0;
	return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function isLayer<M, A>(record: DependentRecord<M, A>): record is LayerRecord<M, A> {
	return record.entry.layer !== undefined;
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export function createStyleRegistry<M extends RegistryMap = MapLibreMap, A = Node>(
	options: RegistryOptions<A>
): StyleRegistry<M, A> {
	const compare = options.compare ?? (documentOrder as unknown as (a: A, b: A) => number);

	let map: M | null = null;
	let usable = false;
	const sources: SourceRecord<M>[] = [];
	const dependents: DependentRecord<M, A>[] = [];

	// Entries run component code, which reads props and state. The registry is
	// often called from inside another component's effect, and those reads must
	// not subscribe that effect to them.
	function run<T>(action: () => T, fallback: T): T {
		try {
			return untrack(action);
		} catch (error) {
			options.report(asError(error));
			return fallback;
		}
	}

	function isRegisteredSource(id: string): boolean {
		return sources.some((record) => record.entry.id === id);
	}

	function sourceAvailable(id: string | undefined): boolean {
		if (!map || !usable) return false;
		if (id === undefined) return true;

		return isRegisteredSource(id)
			? sources.some((record) => record.entry.id === id && record.applied)
			: map.getSource(id) !== undefined;
	}

	/**
	 * Two registrations can claim one id for a moment, as when an unkeyed
	 * `{#each}` hands its items each other's ids. The one in the style keeps it;
	 * the other waits until it is let go instead of failing as a duplicate.
	 */
	function sourceIdTaken(record: SourceRecord<M>): boolean {
		return sources.some(
			(other) => other !== record && other.applied && other.entry.id === record.entry.id
		);
	}

	function layerIdTaken(record: DependentRecord<M, A>): boolean {
		if (!isLayer(record)) return false;
		const { id } = record.entry.layer;
		return dependents.some(
			(other) => other !== record && other.applied && isLayer(other) && other.entry.layer.id === id
		);
	}

	/**
	 * Layers placed by the markup go first, in markup order, then layers with
	 * an explicit `beforeId`, so their targets are usually there already, then
	 * terrain and feature state, which have no place in the draw order.
	 */
	function rank(record: DependentRecord<M, A>): number {
		if (!isLayer(record)) return 2;
		return record.beforeId === undefined ? 0 : 1;
	}

	function applicationOrder(a: DependentRecord<M, A>, b: DependentRecord<M, A>): number {
		const byRank = rank(a) - rank(b);
		if (byRank !== 0 || !isLayer(a) || !isLayer(b)) return byRank;
		return compare(a.entry.layer.anchor, b.entry.layer.anchor);
	}

	function inStyle(record: LayerRecord<M, A>): boolean {
		return record.applied && map !== null && map.getLayer(record.entry.layer.id) !== undefined;
	}

	/**
	 * Where a layer goes. Without an explicit `beforeId`, it goes below the next
	 * layer in the markup that is in the style and placed by the markup too, or
	 * on top when there is none. Inserting every layer this way keeps the
	 * markup-placed layers in markup order whatever order they arrive in.
	 */
	function placement(record: DependentRecord<M, A>): string | undefined {
		if (!map || !isLayer(record)) return undefined;

		const { id, anchor } = record.entry.layer;
		const beforeId = record.beforeId;

		if (beforeId !== undefined) {
			if (map.getLayer(beforeId) !== undefined) return beforeId;

			// A layer this registry will add later is not a mistake: it waits on top
			// and moves below its target when the target arrives.
			const managed = dependents.some(
				(other) => isLayer(other) && other.entry.layer.id === beforeId
			);
			if (!managed && record.reported !== beforeId) {
				record.reported = beforeId;
				options.report(
					new Error(
						`[maplibrex] Layer "${id}" has beforeId "${beforeId}", which is not in the style. ` +
							`It was added on top, and moves below "${beforeId}" if a layer component adds it later.`
					)
				);
			}
			return undefined;
		}

		let next: LayerRecord<M, A> | undefined;
		for (const other of dependents) {
			if (other === record || !isLayer(other) || other.beforeId !== undefined) continue;
			if (!inStyle(other) || compare(anchor, other.entry.layer.anchor) >= 0) continue;
			if (!next || compare(other.entry.layer.anchor, next.entry.layer.anchor) < 0) next = other;
		}
		return next?.entry.layer.id;
	}

	/** Layers placed explicitly before `id` follow it wherever it went. */
	function followTarget(id: string): void {
		if (!map) return;
		const current = map;

		for (const other of dependents) {
			if (!isLayer(other) || other.beforeId !== id || !inStyle(other)) continue;
			run(() => current.moveLayer(other.entry.layer.id, id), undefined);
		}
	}

	function applyDependent(record: DependentRecord<M, A>): void {
		if (!map || record.applied || !sourceAvailable(record.entry.source)) return;
		if (layerIdTaken(record)) return;
		const current = map;

		const beforeId = placement(record);
		const result = run(() => record.entry.apply(current, beforeId), false);

		record.applied = result !== false;
		record.failed = !record.applied;
		if (record.applied && isLayer(record)) followTarget(record.entry.layer.id);
	}

	function unapplyDependent(record: DependentRecord<M, A>): void {
		if (!record.applied) return;
		record.applied = false;
		if (map && usable) {
			const current = map;
			run(() => record.entry.unapply(current), undefined);
		}
	}

	function resetDependent(record: DependentRecord<M, A>): void {
		record.failed = false;
		if (!record.applied) return;
		record.applied = false;
		run(() => record.entry.reset?.(), undefined);
	}

	function resetSource(record: SourceRecord<M>): void {
		if (!record.applied) return;
		record.applied = false;
		run(() => record.entry.reset?.(), undefined);
	}

	function applyPending(filter: (record: DependentRecord<M, A>) => boolean = () => true): void {
		const pending = dependents
			.filter((record) => !record.applied && filter(record))
			.sort(applicationOrder);

		for (const record of pending) applyDependent(record);
	}

	function applySource(record: SourceRecord<M>, withDependents = true): void {
		if (!map || !usable || record.applied || sourceIdTaken(record)) return;
		const current = map;

		record.applied = run(() => record.entry.add(current), false) !== false;
		if (record.applied && withDependents) {
			applyPending((dependent) => dependent.entry.source === record.entry.id);
		}
	}

	/** Every source first, then every dependent in one ordered pass. */
	function applyAll(): void {
		for (const record of [...sources]) applySource(record, false);
		applyPending();
	}

	/** Dependents of `id` in the style, in the reverse of the order they go in. */
	function appliedDependentsOf(id: string): DependentRecord<M, A>[] {
		return dependents
			.filter((record) => record.applied && record.entry.source === id)
			.sort(applicationOrder)
			.reverse();
	}

	function removeSource(record: SourceRecord<M>): void {
		if (!record.applied) return;
		for (const dependent of appliedDependentsOf(record.entry.id)) unapplyDependent(dependent);

		record.applied = false;
		if (map && usable) {
			const current = map;
			run(() => record.entry.remove(current), undefined);
		}
	}

	return {
		get started() {
			return map !== null;
		},

		addSource(entry) {
			const record: SourceRecord<M> = { entry, applied: false };
			sources.push(record);
			applySource(record);

			return {
				recreate() {
					if (!sources.includes(record) || !record.applied) return;
					removeSource(record);
					applySource(record);
				},
				unregister() {
					const index = sources.indexOf(record);
					if (index === -1) return;
					removeSource(record);
					sources.splice(index, 1);

					const waiting = sources.find((other) => other.entry.id === record.entry.id);
					if (waiting) applySource(waiting);
				}
			};
		},

		addDependent(entry) {
			const record: DependentRecord<M, A> = {
				entry,
				applied: false,
				failed: false,
				beforeId: entry.layer?.beforeId,
				reported: undefined
			};
			dependents.push(record);
			applyDependent(record);

			return {
				setBeforeId(beforeId) {
					if (!isLayer(record) || record.beforeId === beforeId) return;
					record.beforeId = beforeId;
					if (!map || !inStyle(record)) return;

					const current = map;
					const target = placement(record);
					run(() => current.moveLayer(record.entry.layer.id, target), undefined);
					followTarget(record.entry.layer.id);
				},
				unregister() {
					const index = dependents.indexOf(record);
					if (index === -1) return;
					unapplyDependent(record);
					dependents.splice(index, 1);

					if (isLayer(record)) {
						const { id } = record.entry.layer;
						applyPending((other) => isLayer(other) && other.entry.layer.id === id);
					}
				}
			};
		},

		start(next) {
			map = next;
			usable = true;
			applyAll();
		},

		stop() {
			for (const record of dependents) resetDependent(record);
			for (const record of sources) resetSource(record);
			map = null;
			usable = false;
		},

		styleLoading() {
			if (!map) return;
			usable = false;
			for (const record of dependents) resetDependent(record);
			for (const record of sources) resetSource(record);
		},

		styleLoaded() {
			if (!map) return;
			const current = map;
			usable = true;

			// A full rebuild left nothing applied. A diff removed what the new style
			// does not declare, and may have reset terrain, so only a source or layer
			// still there is kept: terrain and feature state are applied again.
			for (const record of sources) {
				if (current.getSource(record.entry.id) === undefined) resetSource(record);
			}
			for (const record of dependents) {
				if (isLayer(record) && inStyle(record)) continue;
				resetDependent(record);
			}
			applyAll();
		},

		sourcesChanged() {
			if (!map || !usable) return;
			const current = map;

			applyPending(
				(record) =>
					!record.failed &&
					record.entry.source !== undefined &&
					!isRegisteredSource(record.entry.source) &&
					current.getSource(record.entry.source) !== undefined
			);
		},

		reorder() {
			if (!map || !usable) return;
			const current = map;

			const placed = dependents
				.filter(
					(record): record is LayerRecord<M, A> =>
						isLayer(record) && record.beforeId === undefined && inStyle(record)
				)
				.sort(applicationOrder);
			if (placed.length < 2) return;

			// From the last layer down, each one goes below its successor if it is
			// above it. Layers already in order stay where they are.
			let order = current.getLayersOrder();
			for (let index = placed.length - 2; index >= 0; index -= 1) {
				const { id } = placed[index].entry.layer;
				const successor = placed[index + 1].entry.layer.id;
				if (order.indexOf(id) < order.indexOf(successor)) continue;

				run(() => current.moveLayer(id, successor), undefined);
				order = current.getLayersOrder();
				followTarget(id);
			}
		}
	};
}
