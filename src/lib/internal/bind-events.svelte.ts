import { untrack } from 'svelte';
import type { Map as MapLibreMap, Subscription } from 'maplibre-gl';
import { pickEventHandlers, type EventHandler } from './events.js';

/**
 * MapLibre's `on` is a family of overloads with no single structural type:
 * `Map` adds layer-scoped variants, while `Marker` and `Popup` narrow the
 * payload to their own event maps. Components already type their `on<event>`
 * props against those maps, so the erasure stays confined to this module.
 */
interface EventSource {
	on(type: never, listener: never): Subscription;
}

function keySetOf(handlers: Record<string, EventHandler>): string {
	return Object.keys(handlers).sort().join(' ');
}

/**
 * Keeps MapLibre subscriptions in sync with a component's `on<event>` props.
 *
 * Subscriptions are rebuilt only when the SET OF EVENT NAMES changes. Handler
 * identity is deliberately not tracked: inline arrow functions get a new
 * identity on every render, and re-subscribing on each of them would churn
 * listeners on a hot path. The indirection below always calls the current
 * handler, so the latest closure still wins.
 */
export function bindEvents(
	getTarget: () => EventSource | null | undefined,
	getProps: () => Record<string, unknown>
): void {
	const handlers = $derived(pickEventHandlers(getProps()));
	const names = $derived(keySetOf(handlers));

	$effect(() => {
		const target = getTarget();
		if (!target) return;
		void names;

		const subscriptions = untrack(() =>
			Object.keys(handlers).map((name) =>
				target.on(name as never, ((event: never) => handlers[name]?.(event)) as never)
			)
		);

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});
}

/**
 * The layer-scoped variant: MapLibre filters these events by rendered features,
 * so the layer id is part of the subscription and a layer rename must rebuild it.
 */
export function bindLayerEvents(
	getMap: () => MapLibreMap | null | undefined,
	getLayerId: () => string | null | undefined,
	getProps: () => Record<string, unknown>
): void {
	const handlers = $derived(pickEventHandlers(getProps()));
	const names = $derived(keySetOf(handlers));

	$effect(() => {
		const map = getMap();
		const layerId = getLayerId();
		if (!map || !layerId) return;
		void names;

		const subscriptions = untrack(() =>
			Object.keys(handlers).map((name) =>
				map.on(name as never, layerId, (event: never) => handlers[name]?.(event))
			)
		);

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});
}
