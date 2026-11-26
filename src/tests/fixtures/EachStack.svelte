<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';

	/**
	 * Layers generated from a list between two fixed ones, in an `{#each}` that
	 * is keyed by id or not. A keyed block moves the existing components when
	 * the list is reordered; an unkeyed one hands each component a new id.
	 */
	type Props = {
		ids: string[];
		keyed?: boolean;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let { ids, keyed = false, onmapready, onerror }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

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
	<BackgroundLayer id="bottom" />
	{#if keyed}
		{#each ids as id (id)}
			<BackgroundLayer {id} />
		{/each}
	{:else}
		<!-- eslint-disable-next-line svelte/require-each-key -- unkeyed on purpose -->
		{#each ids as id}
			<BackgroundLayer {id} />
		{/each}
	{/if}
	<BackgroundLayer id="top" />
</MapLibre>
