<script lang="ts">
	import { Marker as MapLibreMarker } from 'maplibre-gl';
	import type { LngLatLike, MarkerOptions } from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, setMarkerContext } from '../../context.js';
	import { bindEvents } from '../../internal/bind-events.svelte.js';
	import { sameLngLat, sameNumber } from '../../internal/camera.js';
	import { stableKey } from '../../internal/stable-key.js';
	import type { MarkerEventProps } from '../../types.js';

	type Props = MarkerEventProps &
		Omit<MarkerOptions, 'element'> & {
			/** Two-way while `draggable`: the drag writes the new position back. */
			lngLat: LngLatLike;
			/** Applied to the custom element wrapper when `content` is given. */
			class?: string;
			/** Read-only binding to the underlying marker. */
			marker?: MapLibreMarker | null;
			/**
			 * Replaces the default pin with your own markup. Only this snippet
			 * becomes the marker element.
			 */
			content?: Snippet<[{ marker: MapLibreMarker }]>;
			/**
			 * Components that attach to this marker, such as a nested `<Popup>`.
			 * They render no marker DOM, so the default pin survives.
			 */
			children?: Snippet;
		};

	let {
		lngLat = $bindable(),
		class: className,
		marker = $bindable(null),
		content,
		children,
		offset,
		draggable,
		rotation,
		rotationAlignment,
		pitchAlignment,
		opacity,
		opacityWhenCovered,
		subpixelPositioning,
		...rest
	}: Props = $props();

	const context = getMapContext();

	// Split by capability: these have no setter on Marker, so a change to any of
	// them can only be honoured by building a new marker.
	const constructorOnly = $derived({
		color: rest.color,
		scale: rest.scale,
		anchor: rest.anchor,
		className: rest.className,
		clickTolerance: rest.clickTolerance
	});
	const recreateKey = $derived(stableKey(constructorOnly));

	let contentNode = $state<HTMLDivElement | null>(null);

	// Decided by the `content` snippet alone. Keying this on `children` made a
	// nested <Popup> count as marker markup, which replaced the default pin with
	// an empty element and produced an invisible 0x0 marker.
	const usesCustomElement = $derived(content !== undefined);

	setMarkerContext({
		get marker() {
			return marker;
		}
	});

	$effect(() => {
		const map = context.map;
		const element = contentNode;
		void recreateKey;

		if (!map) return;
		if (usesCustomElement && !element) return;

		const instance = untrack(() => {
			const created = new MapLibreMarker({
				...constructorOnly,
				...(element ? { element } : {}),
				...(offset !== undefined ? { offset } : {}),
				...(draggable !== undefined ? { draggable } : {}),
				...(rotation !== undefined ? { rotation } : {}),
				...(rotationAlignment !== undefined ? { rotationAlignment } : {}),
				...(pitchAlignment !== undefined ? { pitchAlignment } : {}),
				...(opacity !== undefined ? { opacity } : {}),
				...(opacityWhenCovered !== undefined ? { opacityWhenCovered } : {}),
				...(subpixelPositioning !== undefined ? { subpixelPositioning } : {})
			});

			return created.setLngLat(lngLat).addTo(map);
		});

		marker = instance;

		return () => {
			marker = null;
			instance.remove();
		};
	});

	// Position: props to marker, guarded so the drag write-back below cannot
	// bounce back and fight the pointer.
	$effect(() => {
		const instance = marker;
		const next = lngLat;
		if (!instance) return;
		if (sameLngLat(instance.getLngLat(), next)) return;

		untrack(() => instance.setLngLat(next));
	});

	// Position: marker to props, so `bind:lngLat` reflects a drag.
	$effect(() => {
		const instance = marker;
		if (!instance) return;

		const sync = () => {
			const next = instance.getLngLat();
			if (!sameLngLat(lngLat, next)) lngLat = [next.lng, next.lat];
		};

		const subscriptions = [instance.on('drag', sync), instance.on('dragend', sync)];

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	// Everything MapLibre exposes a setter for is updated in place. An unset
	// prop goes back to the value MapLibre uses when the option is not given,
	// since none of these setters has a way to reset.
	$effect(() => {
		const instance = marker;
		// MapLibre's default offset lifts its own pin so that the tip marks the
		// position; a custom element has none.
		const next = offset ?? (usesCustomElement ? [0, 0] : [0, -14]);
		if (!instance) return;
		untrack(() => instance.setOffset(next));
	});

	$effect(() => {
		const instance = marker;
		const next = draggable ?? false;
		if (!instance) return;
		untrack(() => instance.setDraggable(next));
	});

	$effect(() => {
		const instance = marker;
		const next = rotation ?? 0;
		if (!instance) return;
		if (sameNumber(instance.getRotation(), next)) return;
		untrack(() => instance.setRotation(next));
	});

	$effect(() => {
		const instance = marker;
		const next = rotationAlignment ?? 'auto';
		if (!instance) return;
		untrack(() => instance.setRotationAlignment(next));
	});

	// Unset, the pitch alignment follows the rotation alignment, as MapLibre
	// does for a marker created without one.
	$effect(() => {
		const instance = marker;
		const next = pitchAlignment ?? 'auto';
		void rotationAlignment;
		if (!instance) return;
		untrack(() => instance.setPitchAlignment(next));
	});

	$effect(() => {
		const instance = marker;
		const next = { opacity, opacityWhenCovered };
		if (!instance) return;
		untrack(() => {
			// The setter keeps a value it is not given, and called with neither
			// it puts both defaults back, so it is called that way first.
			instance.setOpacity();
			if (next.opacity !== undefined || next.opacityWhenCovered !== undefined) {
				instance.setOpacity(next.opacity, next.opacityWhenCovered);
			}
		});
	});

	$effect(() => {
		const instance = marker;
		const next = subpixelPositioning ?? false;
		if (!instance) return;
		untrack(() => instance.setSubpixelPositioning(next));
	});

	bindEvents(
		() => marker,
		() => rest
	);
</script>

{#if usesCustomElement}
	<!-- `hidden`, not an inline style: a strict CSP blocks style attributes. -->
	<div hidden aria-hidden="true">
		<div bind:this={contentNode} class={className}>
			{#if marker}
				{@render content?.({ marker })}
			{/if}
		</div>
	</div>
{/if}

{#if marker}
	{@render children?.()}
{/if}
