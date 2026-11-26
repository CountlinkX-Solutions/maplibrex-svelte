<script lang="ts">
	import type { TerrainSpecification } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext, getSourceContext, getStyleRegistry } from '../../context.js';

	type Props = {
		/** A raster-dem source id. Defaults to the enclosing source component. */
		source?: string;
		/** @defaultValue 1 */
		exaggeration?: number;
	};

	let { source, exaggeration }: Props = $props();

	const context = getMapContext();
	const sourceContext = getSourceContext();
	const registry = getStyleRegistry();
	const resolvedSource = $derived(source ?? sourceContext?.id);

	/** Set in the style shown now. */
	let applied = $state(false);
	let appliedExaggeration: number | undefined;

	function specification(sourceId: string, value: number | undefined): TerrainSpecification {
		return { source: sourceId, ...(value !== undefined ? { exaggeration: value } : {}) };
	}

	// Terrain needs its source in the style, so the registry sets it once the
	// source is there, clears it before the source goes, and sets it again
	// after a style swap or a recreate. It is style-level state rather than a
	// layer, so clearing restores whatever the style declared when it was set,
	// read afresh each time instead of blindly disabling terrain.
	$effect(() => {
		const sourceId = resolvedSource;

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
				const value = exaggeration;
				map.setTerrain(specification(sourceId, value));
				if (map.getTerrain()?.source !== sourceId) return false;
				appliedExaggeration = value;
				applied = true;
			},
			unapply: (map) => {
				applied = false;
				map.setTerrain(previous);
			},
			reset: () => {
				applied = false;
			}
		});

		return () => registration.unregister();
	});

	// One `setTerrain` moves the exaggeration; clearing terrain first would
	// flatten the ground for a frame.
	$effect(() => {
		const map = context.map;
		const sourceId = resolvedSource;
		const value = exaggeration;
		if (!map || !sourceId || !applied) return;

		untrack(() => {
			if (value === appliedExaggeration) return;
			map.setTerrain(specification(sourceId, value));
			appliedExaggeration = value;
		});
	});
</script>
