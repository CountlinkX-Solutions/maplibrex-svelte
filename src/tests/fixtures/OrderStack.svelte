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
	 * - `missing-before`: a layer whose `beforeId` names no layer;
	 * - `before-late`: a layer whose `beforeId` names a layer that mounts later;
	 * - `move`: a layer between two others whose `beforeId` is `bBefore`;
	 * - `rename`: a layer between two others whose id is `middleId`;
	 * - `resource`: a layer between two others that reads the source `lineSource`.
	 */
	type Props = {
		scenario: 'nested' | 'late' | 'missing-before' | 'before-late' | 'move' | 'rename' | 'resource';
		/** In the `late` and `before-late` scenarios, mounts the layer that comes late. */
		showLate?: boolean;
		bBefore?: string;
		middleId?: string;
		lineSource?: string;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let {
		scenario,
		showLate = false,
		bBefore,
		middleId = 'middle',
		lineSource = 's1',
		onmapready,
		onerror
	}: Props = $props();

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
	{:else if scenario === 'missing-before'}
		<BackgroundLayer id="a" />
		<BackgroundLayer id="lost" beforeId="no-such-layer" />
	{:else if scenario === 'before-late'}
		<BackgroundLayer id="a" />
		<BackgroundLayer id="under" beforeId="target" />
		{#if showLate}
			<BackgroundLayer id="target" />
		{/if}
		<BackgroundLayer id="b" />
	{:else if scenario === 'move'}
		<BackgroundLayer id="a" />
		<BackgroundLayer id="b" beforeId={bBefore} />
		<BackgroundLayer id="c" />
	{:else if scenario === 'rename'}
		<BackgroundLayer id="a" />
		<BackgroundLayer id={middleId} />
		<BackgroundLayer id="b" />
	{:else}
		<GeoJSONSource id="s1" data={grid} />
		<GeoJSONSource id="s2" data={grid} />
		<BackgroundLayer id="a" />
		<LineLayer id="line" source={lineSource} />
		<BackgroundLayer id="b" />
	{/if}
</MapLibre>
