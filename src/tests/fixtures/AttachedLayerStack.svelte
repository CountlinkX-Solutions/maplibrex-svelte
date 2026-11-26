<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';

	/**
	 * A layer that names its source by id instead of nesting in it, one case
	 * per `scenario`:
	 * - `after`: the layer follows its source in the markup;
	 * - `before`: the layer comes first in the markup;
	 * - `together`: source and layer sit in one `{#if show}` block;
	 * - `together-nested`: the same with the layer nested in the source;
	 * - `split`: source and layer in `{#if}` blocks of their own, source first;
	 * - `split-before`: the same with the layer first;
	 * - `rename`: a source whose id is `sourceId`, with a nested layer, a layer
	 *   attached to `s` by a fixed id, and one attached by `sourceId`;
	 * - `manual`: a layer attached to `manual`, a source no component adds.
	 */
	type Props = {
		scenario:
			| 'after'
			| 'before'
			| 'together'
			| 'together-nested'
			| 'split'
			| 'split-before'
			| 'rename'
			| 'manual';
		/** A source option with no setter: changing it recreates the source. */
		tolerance?: number;
		show?: boolean;
		showSource?: boolean;
		showLayer?: boolean;
		sourceId?: string;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let {
		scenario,
		tolerance = 0.375,
		show = true,
		showSource = true,
		showLayer = true,
		sourceId = 's',
		onmapready,
		onerror
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	const points = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				properties: {},
				geometry: { type: 'Point' as const, coordinates: [0, 0] }
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
	{#if scenario === 'after'}
		<GeoJSONSource id="s" data={points} {tolerance} />
		<CircleLayer id="attached" source="s" />
	{:else if scenario === 'before'}
		<CircleLayer id="attached" source="s" />
		<GeoJSONSource id="s" data={points} />
	{:else if scenario === 'together'}
		{#if show}
			<GeoJSONSource id="s" data={points} />
			<CircleLayer id="attached" source="s" />
		{/if}
	{:else if scenario === 'together-nested'}
		{#if show}
			<GeoJSONSource id="s" data={points}>
				<CircleLayer id="attached" />
			</GeoJSONSource>
		{/if}
	{:else if scenario === 'split'}
		{#if showSource}
			<GeoJSONSource id="s" data={points} />
		{/if}
		{#if showLayer}
			<CircleLayer id="attached" source="s" />
		{/if}
	{:else if scenario === 'split-before'}
		{#if showLayer}
			<CircleLayer id="attached" source="s" />
		{/if}
		{#if showSource}
			<GeoJSONSource id="s" data={points} />
		{/if}
	{:else if scenario === 'manual'}
		<CircleLayer id="attached" source="manual" />
	{:else}
		<GeoJSONSource id={sourceId} data={points}>
			<CircleLayer id="nested" />
		</GeoJSONSource>
		<CircleLayer id="fixed" source="s" />
		<CircleLayer id="following" source={sourceId} />
	{/if}
</MapLibre>
