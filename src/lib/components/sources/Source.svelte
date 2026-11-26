<script lang="ts">
	import type {
		GeoJSONSource,
		ImageSource,
		Map as MapLibreMap,
		RasterTileSource,
		VectorTileSource
	} from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, getStyleRegistry, setSourceContext } from '../../context.js';
	import type { SourceRegistration } from '../../internal/registry.js';
	import {
		planSourceUpdate,
		type AnySourceSpecification,
		type SourceUpdatePlan
	} from '../../internal/source.js';
	import { removeLayersUsingSource, removeSourceIfPresent } from '../../internal/style-ops.js';

	type Props = {
		/** Unique within the style. Changing it recreates the source. */
		id: string;
		spec: AnySourceSpecification;
		/** Layers nested here inherit this source id automatically. */
		children?: Snippet<[{ id: string }]>;
	};

	let { id, spec, children }: Props = $props();

	const context = getMapContext();
	const registry = getStyleRegistry();
	// Read through `$derived`, which passes on only a new value: replacing a
	// spread props object with an equal one must not add the source anew,
	// which would take every layer that reads it out and back in.
	const stableId = $derived(id);

	let epoch = $state(0);
	/** In the style now. */
	let inStyle = $state(false);
	/**
	 * Added at least once. Children render from then on and stay through style
	 * swaps and recreates, which take the source out of the style for a moment.
	 */
	let added = $state(false);
	/** The specification in the style, to plan updates against. */
	let applied: AnySourceSpecification | undefined;
	let registration: SourceRegistration | undefined;

	setSourceContext({
		get id() {
			return id;
		},
		get epoch() {
			return epoch;
		}
	});

	// The registry decides when the source goes in: once the style is usable,
	// and again after a style swap drops it. It takes the layers and other
	// state that read the source out before removing it.
	$effect(() => {
		const sourceId = stableId;

		const current = registry.addSource({
			id: sourceId,
			add: (map) => {
				map.addSource(sourceId, spec);
				if (!map.getSource(sourceId)) return false;
				applied = spec;
				inStyle = true;
				added = true;
			},
			remove: (map) => {
				inStyle = false;
				applied = undefined;
				// Layers the app added by hand would make MapLibre refuse the removal
				// and leave the source behind, which a remount then trips over.
				removeLayersUsingSource(map, sourceId);
				removeSourceIfPresent(map, sourceId);
			},
			reset: () => {
				inStyle = false;
				applied = undefined;
			}
		});
		registration = current;

		return () => {
			current.unregister();
			if (registration === current) registration = undefined;
		};
	});

	/**
	 * Runs the setter `plan` names on the source in the style. Returns `false`
	 * when there is none to run, which leaves a recreate.
	 */
	function updateInPlace(map: MapLibreMap, plan: SourceUpdatePlan): boolean {
		const source = map.getSource(id);
		if (!source) return false;

		switch (plan.kind) {
			case 'set-data':
				(source as GeoJSONSource).setData(plan.data as Parameters<GeoJSONSource['setData']>[0]);
				return true;
			case 'set-cluster-options':
				(source as GeoJSONSource).setClusterOptions(plan.options);
				return true;
			case 'set-tiles':
				(source as VectorTileSource | RasterTileSource).setTiles(plan.tiles);
				return true;
			case 'set-url':
				(source as VectorTileSource | RasterTileSource).setUrl(plan.url);
				return true;
			case 'set-coordinates':
				(source as ImageSource).setCoordinates(plan.coordinates);
				return true;
			case 'update-image':
				(source as ImageSource).updateImage({
					url: plan.url,
					...(plan.coordinates ? { coordinates: plan.coordinates } : {})
				});
				return true;
			default:
				return false;
		}
	}

	// Update in place where MapLibre has a setter for the change, which keeps
	// the source's tiles and every layer that reads it. Anything else is a
	// recreate.
	$effect(() => {
		const map = context.map;
		const nextSpec = spec;
		if (!map || !inStyle) return;

		const plan = planSourceUpdate(applied, nextSpec);
		if (plan.kind === 'noop' || plan.kind === 'create') return;

		untrack(() => {
			if (updateInPlace(map, plan)) {
				applied = nextSpec;
				return;
			}

			// Removes and adds the source again with the current spec, taking every
			// layer that reads it out and back in at the same place.
			registration?.recreate();
			epoch += 1;
		});
	});
</script>

{#if added}
	{@render children?.({ id })}
{/if}
