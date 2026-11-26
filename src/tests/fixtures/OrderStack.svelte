<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import LineLayer from '#lib/components/layers/LineLayer.svelte';

	/**
	 * Layer ordering cases, one per `scenario`:
	 * - `nested`: issue #1's markup, a source with nested layers between two
	 *   top-level layers;
	 * - `late`: a layer between two others that mounts after them;
	 * - `missing-before`: a layer whose `beforeId` names no layer.
	 */
	type Props = {
		scenario: 'nested' | 'late' | 'missing-before';
		/** In the `late` scenario, mounts the middle layer. */
		showLate?: boolean;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let { scenario, showLate = false, onmapready, onerror }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	const grid = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				properties: {},
				geometry: {
					type: 'LineString' as const,
					coordinates: [
						[-1, 0],
						[1, 0]
					]
				}
			}
		]
	};

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});
</script>

<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	{onerror}
	style="width: 320px; height: 240px"
>
	{#if scenario === 'nested'}
		<BackgroundLayer id="a" />
		<GeoJSONSource id="s" data={grid}>
			<LineLayer id="grid" />
			<LineLayer id="grid-2" />
		</GeoJSONSource>
		<BackgroundLayer id="b" />
	{:else if scenario === 'late'}
		<BackgroundLayer id="a" />
		{#if showLate}
			<BackgroundLayer id="late" />
		{/if}
		<BackgroundLayer id="b" />
	{:else}
		<BackgroundLayer id="a" />
		<BackgroundLayer id="lost" beforeId="no-such-layer" />
	{/if}
</MapLibre>
