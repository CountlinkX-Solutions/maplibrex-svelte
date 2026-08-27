<script lang="ts">
	import { Map as MapLibreMap } from 'maplibre-gl';
	import type {
		LngLatBoundsLike,
		LngLatLike,
		MapOptions,
		PaddingOptions,
		StyleSpecification
	} from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { setMapContext } from '../context.js';
	import { sameLngLat, sameNumber } from '../internal/camera.js';
	import { bindEvents } from '../internal/bind-events.svelte.js';
	import {
		planInteractionChanges,
		readInteractionState,
		type InteractionRequest
	} from '../internal/interactions.js';
	import type { CameraMode, MapEventProps } from '../types.js';

	type Props = MapEventProps & {
		/**
		 * A style URL or an inline style specification. Changing it swaps the
		 * style in place instead of recreating the map.
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
		/** Insets the viewport, which moves the vanishing point off centre. */
		padding?: PaddingOptions;
		/** Enables or disables gesture handlers at runtime. Omitted keys are left alone. */
		interactions?: InteractionRequest;
		/** How camera prop changes are applied. @defaultValue 'ease' */
		cameraMode?: CameraMode;
		/** Escape hatch for any `MapOptions` this component does not surface. */
		options?: Partial<Omit<MapOptions, 'container' | 'style'>>;
		/** Read-only binding to the underlying instance. */
		map?: MapLibreMap | null;
		/** Read-only binding: `true` once the style is loaded. */
		ready?: boolean;
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
		class: className,
		style: containerStyle,
		children,
		...events
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let styleEpoch = $state(0);

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

	// Creation depends on the container element alone. Every other prop is read
	// untracked so that a zoom change never tears the WebGL context down.
	$effect(() => {
		const element = container;
		if (!element) return;

		return untrack(() => {
			const instance = new MapLibreMap({
				...options,
				container: element,
				style: mapStyle,
				...(center !== undefined && { center }),
				...(zoom !== undefined && { zoom }),
				...(bearing !== undefined && { bearing }),
				...(pitch !== undefined && { pitch }),
				...(bounds !== undefined && { bounds })
			});

			map = instance;

			const loaded = instance.on('load', () => {
				ready = true;
				styleEpoch += 1;
			});

			return () => {
				loaded.unsubscribe();
				ready = false;
				map = null;
				instance.remove();
			};
		});
	});

	// Style swaps wipe user-added sources and layers, so descendants are told to
	// re-add themselves only once the replacement style has finished loading.
	let appliedStyle = $state<StyleSpecification | string | undefined>();

	$effect(() => {
		const instance = map;
		const nextStyle = mapStyle;
		if (!instance || !ready) return;

		if (untrack(() => appliedStyle) === undefined) {
			appliedStyle = nextStyle;
			return;
		}
		if (untrack(() => appliedStyle) === nextStyle) return;

		appliedStyle = nextStyle;
		instance.setStyle(nextStyle);

		let cancelled = false;
		void instance.once('styledata').then(() => {
			if (!cancelled) styleEpoch += 1;
		});

		return () => {
			cancelled = true;
		};
	});

	// Map -> props. Guarded by value comparison rather than a mutex flag, which
	// also absorbs the write the opposite effect is about to make.
	$effect(() => {
		const instance = map;
		if (!instance) return;

		const sync = () => {
			const nextCenter = instance.getCenter();
			if (!sameLngLat(center, nextCenter)) center = [nextCenter.lng, nextCenter.lat];
			if (!sameNumber(zoom, instance.getZoom())) zoom = instance.getZoom();
			if (!sameNumber(bearing, instance.getBearing())) bearing = instance.getBearing();
			if (!sameNumber(pitch, instance.getPitch())) pitch = instance.getPitch();
		};

		const subscriptions = [
			instance.on('move', sync),
			instance.on('rotate', sync),
			instance.on('pitch', sync)
		];

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	// Props -> map. A no-op when the map is already where the props say it is,
	// which is what stops the two directions from feeding each other.
	$effect(() => {
		const instance = map;
		const target = { center, zoom, bearing, pitch };
		if (!instance) return;

		const moved =
			(target.center !== undefined && !sameLngLat(target.center, instance.getCenter())) ||
			(target.zoom !== undefined && !sameNumber(target.zoom, instance.getZoom())) ||
			(target.bearing !== undefined && !sameNumber(target.bearing, instance.getBearing())) ||
			(target.pitch !== undefined && !sameNumber(target.pitch, instance.getPitch()));

		if (!moved) return;

		const cameraOptions = {
			...(target.center !== undefined && { center: target.center }),
			...(target.zoom !== undefined && { zoom: target.zoom }),
			...(target.bearing !== undefined && { bearing: target.bearing }),
			...(target.pitch !== undefined && { pitch: target.pitch })
		};

		untrack(() => {
			if (cameraMode === 'jump') instance.jumpTo(cameraOptions);
			else if (cameraMode === 'fly') instance.flyTo(cameraOptions);
			else instance.easeTo(cameraOptions);
		});
	});

	$effect(() => {
		const instance = map;
		const next = padding;
		if (!instance || next === undefined) return;

		untrack(() => instance.setPadding(next));
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
></div>

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
