<script lang="ts">
	import type { TerrainSpecification } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext, getSourceContext } from '../../context.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = {
		/** A raster-dem source id. Defaults to the enclosing source component. */
		source?: string;
		/** @defaultValue 1 */
		exaggeration?: number;
	};

	let { source, exaggeration }: Props = $props();

	const context = getMapContext();
	const sourceContext = getSourceContext();
	const resolvedSource = $derived(source ?? sourceContext?.id);

	// Terrain is style-level state rather than a layer, so unmounting restores
	// whatever the style itself declared instead of blindly disabling it.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		void sourceContext?.epoch;

		const sourceId = resolvedSource;
		const next = exaggeration;

		if (!map || !ready) return;

		if (!sourceId) {
			throw new Error(
				'[maplibrex] <Terrain> needs a raster-dem source: pass `source` or nest it inside <RasterDEMSource>.'
			);
		}

		const previous = untrack(() => map.getTerrain());

		map.setTerrain({
			source: sourceId,
			...(next !== undefined ? { exaggeration: next } : {})
		} satisfies TerrainSpecification);

		return () => {
			if (isStyleAlive(map)) map.setTerrain(previous);
		};
	});
</script>
