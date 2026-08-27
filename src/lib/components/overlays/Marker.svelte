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
			/** Applied to the custom element wrapper when `children` is used. */
			class?: string;
			/** Read-only binding to the underlying marker. */
			marker?: MapLibreMarker | null;
			/** Replaces the default pin with your own markup. */
			children?: Snippet<[{ marker: MapLibreMarker }]>;
		};

	let {
		lngLat = $bindable(),
		class: className,
		marker = $bindable(null),
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

	let content = $state<HTMLDivElement | null>(null);
	const usesCustomElement = $derived(children !== undefined);

	setMarkerContext({
		get marker() {
			return marker;
		}
	});

	$effect(() => {
		const map = context.map;
		const element = content;
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

	// Everything MapLibre exposes a setter for is updated in place.
	$effect(() => {
		const instance = marker;
		const next = offset;
		if (!instance || next === undefined) return;
		untrack(() => instance.setOffset(next));
	});

	$effect(() => {
		const instance = marker;
		const next = draggable;
		if (!instance || next === undefined) return;
		untrack(() => instance.setDraggable(next));
	});

	$effect(() => {
		const instance = marker;
		const next = rotation;
		if (!instance || next === undefined) return;
		if (sameNumber(instance.getRotation(), next)) return;
		untrack(() => instance.setRotation(next));
	});

	$effect(() => {
		const instance = marker;
		const next = rotationAlignment;
		if (!instance || next === undefined) return;
		untrack(() => instance.setRotationAlignment(next));
	});

	$effect(() => {
		const instance = marker;
		const next = pitchAlignment;
		if (!instance || next === undefined) return;
		untrack(() => instance.setPitchAlignment(next));
	});

	$effect(() => {
		const instance = marker;
		const next = { opacity, opacityWhenCovered };
		if (!instance || (next.opacity === undefined && next.opacityWhenCovered === undefined)) return;
		untrack(() => instance.setOpacity(next.opacity, next.opacityWhenCovered));
	});

	$effect(() => {
		const instance = marker;
		const next = subpixelPositioning;
		if (!instance || next === undefined) return;
		untrack(() => instance.setSubpixelPositioning(next));
	});

	bindEvents(
		() => marker,
		() => rest
	);
</script>

{#if usesCustomElement}
	<div style="display: none" aria-hidden="true">
		<div bind:this={content} class={className}>
			{#if marker}
				{@render children?.({ marker })}
			{/if}
		</div>
	</div>
{/if}
