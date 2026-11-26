<script lang="ts">
	import type { TerrainSpecification } from 'maplibre-gl';
	import { getSourceContext, getStyleRegistry } from '../../context.js';

	type Props = {
		/** A raster-dem source id. Defaults to the enclosing source component. */
		source?: string;
		/** @defaultValue 1 */
		exaggeration?: number;
	};

	let { source, exaggeration }: Props = $props();

	const sourceContext = getSourceContext();
	const registry = getStyleRegistry();
	const resolvedSource = $derived(source ?? sourceContext?.id);

	// Terrain needs its source in the style, so the registry sets it once the
	// source is there, clears it before the source goes, and sets it again
	// after a style swap or a recreate. It is style-level state rather than a
	// layer, so clearing restores whatever the style declared when it was set,
	// read afresh each time instead of blindly disabling terrain.
	$effect(() => {
		const sourceId = resolvedSource;
		const next = exaggeration;

		if (!sourceId) {
			throw new Error(
				'[maplibrex] <Terrain> needs a raster-dem source: pass `source` or nest it inside <RasterDEMSource>.'
			);
		}

		let previous: TerrainSpecification | null = null;

		const registration = registry.addDependent({
			source: sourceId,
			name: '<Terrain>',
			apply: (map) => {
				previous = map.getTerrain();
				map.setTerrain({
					source: sourceId,
					...(next !== undefined ? { exaggeration: next } : {})
				} satisfies TerrainSpecification);
				return map.getTerrain()?.source === sourceId;
			},
			unapply: (map) => {
				map.setTerrain(previous);
			}
		});

		return () => registration.unregister();
	});
</script>
