<script lang="ts">
	import { ErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
	import type {
		CameraOptions,
		LngLatBoundsLike,
		LngLatLike,
		MapOptions,
		PaddingOptions,
		StyleSpecification
	} from 'maplibre-gl';
	import { tick, untrack, type Snippet } from 'svelte';
	import { setMapContext, setStyleRegistry } from '../context.js';
	import {
		CAMERA_KEYS,
		sameCamera,
		sameLngLat,
		sameNumber,
		type CameraKey,
		type CameraValues
	} from '../internal/camera.js';
	import { bindEvents } from '../internal/bind-events.svelte.js';
	import { createStyleRegistry } from '../internal/registry.js';
	import { trackStyle, type StyleTracker } from '../internal/style-status.js';
	import {
		planInteractionChanges,
		readInteractionState,
		type InteractionRequest
	} from '../internal/interactions.js';
	import type { CameraMode, MapEventProps, MapStatus } from '../types.js';

	type Props = MapEventProps & {
		/**
		 * A style URL or an inline style specification. Changing it swaps the
		 * style in place instead of recreating the map, whenever it changes:
		 * before the first style has loaded, and after a style failed.
		 */
		mapStyle: StyleSpecification | string;
		/** Two-way. Written back as a `[lng, lat]` tuple as the user pans. */
		center?: LngLatLike;
		/** Two-way. */
		zoom?: number;
		/** Two-way. */
		bearing?: number;
		/** Two-way. */
		pitch?: number;
		/** Applied once on creation; use `map.fitBounds` afterwards. */
		bounds?: LngLatBoundsLike;
		/**
		 * Insets the viewport, which moves the vanishing point off centre.
		 * Unsetting it goes back to no padding.
		 */
		padding?: PaddingOptions;
		/** Enables or disables gesture handlers at runtime. Omitted keys are left alone. */
		interactions?: InteractionRequest;
		/**
		 * How camera prop changes are applied. Each camera prop assigned is a
		 * target the map keeps moving to until it gets there, also when another
		 * one is assigned during the move; a gesture or a camera call on the map
		 * ends it. @defaultValue 'ease'
		 */
		cameraMode?: CameraMode;
		/**
		 * Escape hatch for any `MapOptions` this component does not surface.
		 * Read once, when the map is created: later changes have no effect,
		 * also for the options MapLibre can change at runtime, such as
		 * `minZoom`, `maxZoom`, `minPitch`, `maxPitch`, `maxBounds` and
		 * `renderWorldCopies`. Change those on the map from `bind:map`, with
		 * `setMinZoom`, `setMaxZoom`, `setMinPitch`, `setMaxPitch`,
		 * `setMaxBounds` and `setRenderWorldCopies`. The props of this
		 * component are what follows changes: `mapStyle`, the camera props,
		 * `padding`, `interactions` and `cameraMode`; `bounds` is read once too.
		 */
		options?: Partial<Omit<MapOptions, 'container' | 'style'>>;
		/**
		 * Read-only binding to the underlying instance. Stays `null` when the map
		 * could not be created.
		 */
		map?: MapLibreMap | null;
		/**
		 * Read-only binding: `true` from the map's first `load` event until the
		 * map is removed. It turns `true` in the same update in which `status`
		 * first becomes `'ready'`, and unlike `status` it stays `true` while a
		 * new `mapStyle` loads or after one fails.
		 */
		ready?: boolean;
		/**
		 * Read-only binding. `'loading'` until the first style is shown and again
		 * while a new `mapStyle` loads; `'ready'` when the map shows the current
		 * `mapStyle` and everything in the tree has been applied to it; `'error'`
		 * when the map could not be created or the current `mapStyle` failed to
		 * load. Setting another `mapStyle` after a failure loads it as usual.
		 * Errors about tiles, sprites, glyphs or images do not change it.
		 */
		status?: MapStatus;
		/** Read-only binding: the `Error` behind an `'error'` status, otherwise `null`. */
		error?: Error | null;
		/**
		 * Rendered inside the map container, in place of the map, when the map
		 * could not be created: from maplibre-gl 6.7 that means the browser could
		 * not provide a WebGL2 context. Not rendered when a style fails to load,
		 * since the map exists then and a new `mapStyle` recovers it.
		 */
		fallback?: Snippet<[{ error: Error }]>;
		/**
		 * MapLibre's `error` event: a style, tile, sprite or glyph request that
		 * fails, a style that does not validate, and the problems this library
		 * finds in the tree. Also called once when the map cannot be created,
		 * with an `ErrorEvent` the library builds and no `target`, as there is no
		 * map to fire it; `event.error` is then MapLibre's
		 * `GPUInitializationError`. Without a handler, all of these are written
		 * to the console.
		 */
		onerror?: (event: ErrorEvent) => void;
		class?: string;
		style?: string;
		children?: Snippet<[{ map: MapLibreMap }]>;
	};

	let {
		mapStyle,
		center = $bindable(),
		zoom = $bindable(),
		bearing = $bindable(),
		pitch = $bindable(),
		bounds,
		padding,
		interactions,
		cameraMode = 'ease',
		options,
		map = $bindable(null),
		ready = $bindable(false),
		// Written for the parent to read through `bind:`, and never read here.
		/* eslint-disable no-useless-assignment */
		status = $bindable('loading'),
		error = $bindable(null),
		/* eslint-enable no-useless-assignment */
		fallback,
		class: className,
		style: containerStyle,
		children,
		...events
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let styleEpoch = $state(0);
	/** Why the map could not be created, which the fallback is rendered for. */
	let failure = $state<Error | null>(null);
	let tracker: StyleTracker | null = null;

	setMapContext({
		get map() {
			return map;
		},
		get ready() {
			return ready;
		},
		get styleEpoch() {
			return styleEpoch;
		}
	});

	// Errors the library finds go where MapLibre's own go: to `onerror`, or to
	// the console when nobody listens. They are told apart from style failures.
	const ownErrors = new WeakSet<object>();
	const registry = createStyleRegistry({
		report: (reported) => {
			ownErrors.add(reported);
			untrack(() => map)?.fire(new ErrorEvent(reported));
		},
		// Once Svelte has run the effects of the current update, the components
		// mounting in it have registered their sources.
		defer: (check) => void tick().then(check)
	});
	setStyleRegistry(registry);

	function readCamera(instance: MapLibreMap, key: CameraKey): unknown {
		if (key === 'center') return instance.getCenter();
		if (key === 'zoom') return instance.getZoom();
		if (key === 'bearing') return instance.getBearing();
		return instance.getPitch();
	}

	function reportCreationFailure(reason: Error): void {
		const handler = events.onerror;
		if (handler) handler(new ErrorEvent(reason));
		else console.error(reason);
	}

	// Creation depends on the container element alone. Every other prop is read
	// untracked so that a zoom change never tears the WebGL context down.
	$effect(() => {
		const element = container;
		if (!element) return;

		return untrack(() => {
			status = 'loading';
			error = null;
			failure = null;

			let instance: MapLibreMap;
			try {
				instance = new MapLibreMap({
					...options,
					container: element,
					style: mapStyle,
					...(center !== undefined && { center }),
					...(zoom !== undefined && { zoom }),
					...(bearing !== undefined && { bearing }),
					...(pitch !== undefined && { pitch }),
					...(bounds !== undefined && { bounds })
				});
			} catch (thrown) {
				// From maplibre-gl 6.7 a missing WebGL context always ends here, as a
				// GPUInitializationError, with the container cleaned up. Thrown out of
				// this effect it would be uncaught, with no map to report it on.
				const reason = thrown instanceof Error ? thrown : new Error(String(thrown));
				failure = reason;
				status = 'error';
				error = reason;
				reportCreationFailure(reason);
				return;
			}

			const styles = trackStyle(instance, mapStyle, {
				onchange: (nextStatus, nextError) => {
					status = nextStatus;
					error = nextError;
				},
				isOwnError: (candidate) => ownErrors.has(candidate as object),
				transformStyle: options?.transformStyle
			});
			tracker = styles;
			map = instance;

			const subscriptions = [
				instance.on('load', () => {
					registry.start(instance);
					ready = true;
					styleEpoch += 1;
					styles.mapLoaded();
				}),
				// Fired only when a style is replaced wholesale, as opposed to diffed:
				// the previous style and everything added to it are already gone.
				instance.on('styledataloading', () => {
					styles.styleLoading();
					registry.styleLoading();
				}),
				// Fired once a replacement style is usable, whether MapLibre rebuilt it
				// or diffed the old one into it, on every release from 6.7. MapLibre
				// documents it as the moment to add sources and layers again.
				instance.on('style.load', () => {
					if (registry.started) {
						registry.styleLoaded();
						styleEpoch += 1;
					}
					styles.styleLoaded();
				}),
				instance.on('sourcedata', () => registry.sourcesChanged())
			];

			// A keyed `{#each}` moves layer anchors without running any effect, so
			// the document around the map is watched for moves. Changes inside
			// MapLibre's own container (markers, popups, controls) hold no anchor.
			const observer = new MutationObserver((records) => {
				const moved = records.some(
					(record) => record.addedNodes.length > 0 && !element.contains(record.target)
				);
				if (moved) registry.reorder();
			});
			if (element.parentNode) {
				observer.observe(element.parentNode, { childList: true, subtree: true });
			}

			return () => {
				observer.disconnect();
				for (const subscription of subscriptions) subscription.unsubscribe();
				styles.destroy();
				tracker = null;
				registry.stop();
				ready = false;
				status = 'loading';
				error = null;
				map = null;
				instance.remove();
			};
		});
	});

	// Every change is passed on, from the moment the map exists: a style picked
	// while the first one loads, or one assigned after it failed, must not be
	// lost. The registry puts back what a swap drops, on the `style.load` that
	// follows.
	$effect(() => {
		const instance = map;
		const nextStyle = mapStyle;
		if (!instance) return;

		// A diffed style fires `style.load` inside this call, and what reacts to
		// it must not subscribe this effect to anything.
		untrack(() => tracker?.request(nextStyle));
	});

	/**
	 * The camera as the props last held it, what this component last wrote
	 * back to them, and the targets of the camera move it started that the map
	 * has not reached yet. Plain variables: the effects below compare against
	 * them and must not re-run when they change.
	 */
	let seen: CameraValues = {};
	let written: CameraValues = {};
	let targets: CameraValues = {};
	/** A camera move this component started has not ended yet. */
	let commanded = false;
	/** A camera call of this component is running, which ends the move it replaces. */
	let commanding = false;

	// Map -> props. Every frame of a move is written back, including the frames
	// of an animation this component started, so a bound prop shows where the
	// map is. What was written is kept so that the opposite effect can tell
	// these writes from a value the parent assigned.
	$effect(() => {
		const instance = map;
		if (!instance) return;

		const sync = () => {
			const nextCenter = instance.getCenter();
			if (!sameLngLat(center, nextCenter)) {
				center = written.center = [nextCenter.lng, nextCenter.lat];
			}
			if (!sameNumber(zoom, instance.getZoom())) zoom = written.zoom = instance.getZoom();
			if (!sameNumber(bearing, instance.getBearing())) {
				bearing = written.bearing = instance.getBearing();
			}
			if (!sameNumber(pitch, instance.getPitch())) pitch = written.pitch = instance.getPitch();
		};

		// A move ends at its targets, or where a gesture or a call on the map that
		// interrupted it left the camera. Either way the targets are spent; the
		// end of a move replaced by this component's next call is not.
		const ended = () => {
			if (commanding) return;
			commanded = false;
			targets = {};
		};

		const subscriptions = [
			instance.on('move', sync),
			instance.on('rotate', sync),
			instance.on('pitch', sync),
			instance.on('moveend', ended)
		];

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	// Props -> map. Only a prop the parent assigned becomes a target: a value
	// this component wrote back is where the map already is. Each target is
	// kept until the move ends, and sent again with any later one, since a new
	// camera call stops the move in progress where it is.
	$effect(() => {
		const instance = map;
		const props: CameraValues = { center, zoom, bearing, pitch };
		if (!instance) return;

		untrack(() => {
			let assigned = false;
			for (const key of CAMERA_KEYS) {
				const value = props[key];
				if (sameCamera(key, value, seen[key])) continue;
				seen = { ...seen, [key]: value };
				if (value === undefined || sameCamera(key, value, written[key])) continue;
				targets = { ...targets, [key]: value };
				assigned = true;
			}
			if (!assigned) return;

			const away = CAMERA_KEYS.some(
				(key) =>
					targets[key] !== undefined && !sameCamera(key, targets[key], readCamera(instance, key))
			);
			// Where the map already is, nothing moves, unless a move of this
			// component's is under way that this one has to stop.
			if (!away && !commanded) {
				targets = {};
				return;
			}

			const options: CameraOptions = { ...targets };
			commanding = true;
			try {
				if (cameraMode === 'jump') instance.jumpTo(options);
				else if (cameraMode === 'fly') instance.flyTo(options);
				else instance.easeTo(options);
			} finally {
				commanding = false;
			}
			// A jump, or a move that reduced motion made instant, has ended already.
			commanded = instance.isMoving();
			if (!commanded) targets = {};
		});
	});

	/** This component has set the map's padding, which unsetting the prop takes back. */
	let padded = false;

	$effect(() => {
		const instance = map;
		const next = padding;
		if (!instance) return;

		untrack(() => {
			if (next !== undefined) {
				padded = true;
				instance.setPadding(next);
			} else if (padded) {
				padded = false;
				instance.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
			}
		});
	});

	// Gesture handlers are imperative objects rather than style state, so they
	// are compared against their live enabled flag instead of a shadow copy.
	$effect(() => {
		const instance = map;
		const requested = interactions;
		if (!instance || !requested) return;

		const changes = planInteractionChanges(readInteractionState(instance), requested);
		if (changes.length === 0) return;

		untrack(() => {
			for (const [name, enabled] of changes) {
				// The handlers share `enable`/`disable` but not their option types,
				// so the union is widened at this single call site.
				const handler = instance[name] as { enable(): void; disable(): void };
				if (enabled) handler.enable();
				else handler.disable();
			}
		});
	});

	bindEvents(
		() => map,
		() => events
	);
</script>

<div
	bind:this={container}
	class={['maplibrex-map', className]}
	style={containerStyle}
	data-maplibrex="map"
>
	{#if failure && fallback}
		{@render fallback({ error: failure })}
	{/if}
</div>

{#if map}
	{@render children?.({ map })}
{/if}

<style>
	/* Fills its parent by default: a map with no height renders nothing, and
	   that is the single most common first-run surprise. */
	.maplibrex-map {
		position: relative;
		width: 100%;
		height: 100%;
	}
</style>
