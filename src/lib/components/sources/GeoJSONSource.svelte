<script lang="ts">
	import type { GeoJSONSourceSpecification } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import Source from './Source.svelte';

	type Props = Omit<GeoJSONSourceSpecification, 'type'> & {
		/**
		 * Inline GeoJSON or a URL. Compared by reference, never walked: replace it
		 * to update the map, which calls `setData` even when the new value is
		 * equal. A mutation in place, including on a `$state` object, keeps the
		 * reference and does not reach the map.
		 */
		data: GeoJSONSourceSpecification['data'];
		/** Unique within the style. Changing it recreates the source. */
		id: string;
		/** Layers nested here inherit this source id automatically. */
		children?: Snippet<[{ id: string }]>;
	};

	let { id, children, ...spec }: Props = $props();
</script>

<Source {id} spec={{ type: 'geojson', ...spec }} {children} />
