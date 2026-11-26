<script lang="ts">
	import { untrack } from 'svelte';
	import { getMapContext, getSourceContext } from '../../context.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = {
		/** Defaults to the id of the enclosing source component. */
		source?: string;
		/** Required for vector tile sources with more than one layer. */
		sourceLayer?: string;
		/** The feature id. Vector features need `promoteId` if their id is a property. */
		id: string | number;
		/**
		 * Read from style expressions through `["feature-state", key]`. Unmounting
		 * removes these keys and no others, so several components can hold state
		 * on the same feature.
		 */
		state: Record<string, unknown>;
	};

	let { source, sourceLayer, id, state }: Props = $props();

	const context = getMapContext();
	const sourceContext = getSourceContext();
	const resolvedSource = $derived(source ?? sourceContext?.id);

	// Declarative hover and selection: mount the component while a feature is
	// active and remove it when it is not, instead of pairing every
	// setFeatureState call with a matching removeFeatureState by hand.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		void sourceContext?.epoch;

		const sourceId = resolvedSource;
		const featureId = id;
		const next = state;

		if (!map || !ready) return;

		if (!sourceId) {
			throw new Error(
				'[maplibrex] <FeatureState> needs a source: pass `source` or nest it inside a source component.'
			);
		}

		const target = {
			source: sourceId,
			id: featureId,
			...(sourceLayer ? { sourceLayer } : {})
		};

		const keys = untrack(() => {
			map.setFeatureState(target, next);
			return Object.keys(next);
		});

		// Only the keys set here: other components may hold state on the same
		// feature, such as a selection alongside a hover. A key that leaves
		// `state` is removed by this cleanup and not set again by the next run.
		return () => {
			if (!isStyleAlive(map)) return;
			for (const key of keys) map.removeFeatureState(target, key);
		};
	});
</script>
