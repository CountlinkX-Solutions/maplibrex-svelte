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
 *
 * `deliver` is asked at the time of each event whether it reaches the
 * handler, for events the component causes itself and keeps from the
 * consumer, such as the `close` of a popup it replaces.
 *
 * The returned `target` is the one the handlers listen on, or `null`. The
 * order in which Svelte runs a component's effects is not something to rely
 * on, so a component whose own effect makes the target fire, as opening a
 * popup does, waits for it to be the target it is about to act on.
 */
export function bindEvents(
	getTarget: () => EventSource | null | undefined,
	getProps: () => Record<string, unknown>,
	deliver: (name: string) => boolean = () => true
): { readonly target: EventSource | null } {
	const handlers = $derived(pickEventHandlers(getProps()));
	const names = $derived(keySetOf(handlers));
	let listening = $state<EventSource | null>(null);

	$effect(() => {
		const target = getTarget();
		if (!target) return;
		void names;

		const subscriptions = untrack(() =>
			Object.keys(handlers).map((name) =>
				target.on(
					name as never,
					((event: never) => {
						if (deliver(name)) handlers[name]?.(event);
					}) as never
				)
			)
		);
		listening = target;

		return () => {
			listening = null;
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	return {
		get target() {
			return listening;
		}
	};
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
