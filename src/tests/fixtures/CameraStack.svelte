<script lang="ts" module>
	import type { LngLatLike } from 'maplibre-gl';

	export type Camera = {
		center?: LngLatLike;
		zoom?: number;
		bearing?: number;
		pitch?: number;
	};

	/** What the test drives the fixture's own camera state with. */
	export type CameraControls = {
		set(next: Camera): void;
		readonly values: Camera;
	};
</script>

<script lang="ts">
	import type { Map as MapLibreMap, MapLibreEvent, StyleSpecification } from 'maplibre-gl';
	import type { PaddingOptions } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import type { CameraMode } from '#lib/types.js';

	/**
	 * A map whose camera props come from the fixture's own state, either bound
	 * (`twoWay`) or passed one way, so the test can assign them the way an app
	 * does and read back what the map wrote.
	 */
	type Props = {
		initial: Camera;
		twoWay?: boolean;
		cameraMode?: CameraMode;
		padding?: PaddingOptions;
		oncontrols?: (controls: CameraControls) => void;
		onmapready?: (map: MapLibreMap) => void;
		onmove?: (event: MapLibreEvent) => void;
		onmovestart?: (event: MapLibreEvent) => void;
		onmoveend?: (event: MapLibreEvent) => void;
	};

	let {
		initial,
		twoWay = true,
		cameraMode,
		padding,
		oncontrols,
		onmapready,
		onmove,
		onmovestart,
		onmoveend
	}: Props = $props();

	// Seeded once from the props, as an app seeds its own state.
	const seed = untrack(() => initial);
	let center = $state(seed.center);
	let zoom = $state(seed.zoom);
	let bearing = $state(seed.bearing);
	let pitch = $state(seed.pitch);

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	untrack(() => oncontrols)?.({
		set(next) {
			if ('center' in next) center = next.center;
			if ('zoom' in next) zoom = next.zoom;
			if ('bearing' in next) bearing = next.bearing;
			if ('pitch' in next) pitch = next.pitch;
		},
		get values() {
			return { center, zoom, bearing, pitch };
		}
	});

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});
</script>

{#if twoWay}
	<MapLibre
		mapStyle={emptyStyle}
		bind:center
		bind:zoom
		bind:bearing
		bind:pitch
		{cameraMode}
		{padding}
		bind:map
		bind:ready
		{onmove}
		{onmovestart}
		{onmoveend}
		style="width: 320px; height: 240px"
	/>
{:else}
	<MapLibre
		mapStyle={emptyStyle}
		{center}
		{zoom}
		{bearing}
		{pitch}
		{cameraMode}
		{padding}
		bind:map
		bind:ready
		{onmove}
		{onmovestart}
		{onmoveend}
		style="width: 320px; height: 240px"
	/>
{/if}
