<script lang="ts">
	import type { GeoJSONSource, SourceSpecification } from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, setSourceContext } from '../../context.js';
	import { planSourceUpdate } from '../../internal/source.js';
	import { removeLayersUsingSource, removeSourceIfPresent } from '../../internal/style-ops.js';

	type Props = {
		/** Unique within the style. Changing it recreates the source. */
		id: string;
		spec: SourceSpecification;
		/** Layers nested here inherit this source id automatically. */
		children?: Snippet<[{ id: string }]>;
	};

	let { id, spec, children }: Props = $props();

	const context = getMapContext();

	let epoch = $state(0);
	let mounted = $state(false);
	let applied = $state<SourceSpecification | undefined>();

	setSourceContext({
		get id() {
			return id;
		},
		get epoch() {
			return epoch;
		}
	});

	// Add and remove. Re-runs when the map appears, when the style is replaced
	// (which wipes user-added sources), and when the id itself changes.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		const sourceId = id;

		if (!map || !ready) return;

		untrack(() => {
			map.addSource(sourceId, spec);
			applied = spec;
			mounted = true;
		});

		return () => {
			mounted = false;
			applied = undefined;
			removeSourceIfPresent(map, sourceId);
		};
	});

	// Update in place. GeoJSON data is the hot path and survives via `setData`;
	// anything else has no setter in MapLibre and forces a recreate.
	$effect(() => {
		const map = context.map;
		const nextSpec = spec;
		if (!map || !mounted) return;

		const plan = planSourceUpdate(
			untrack(() => applied),
			nextSpec
		);
		if (plan.kind === 'noop' || plan.kind === 'create') return;

		untrack(() => {
			if (plan.kind === 'set-data') {
				const source = map.getSource(id) as GeoJSONSource | undefined;
				source?.setData(plan.data as Parameters<GeoJSONSource['setData']>[0]);
				applied = nextSpec;
				return;
			}

			removeLayersUsingSource(map, id);
			removeSourceIfPresent(map, id);
			map.addSource(id, nextSpec);
			applied = nextSpec;
			epoch += 1;
		});
	});
</script>

{#if mounted}
	{@render children?.({ id })}
{/if}
