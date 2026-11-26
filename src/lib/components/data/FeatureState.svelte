<script lang="ts">
	import { getSourceContext, getStyleRegistry } from '../../context.js';

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

	const sourceContext = getSourceContext();
	const registry = getStyleRegistry();
	const resolvedSource = $derived(source ?? sourceContext?.id);
	// Read through `$derived`, which passes on only a new value: replacing a
	// spread props object with an equal one must not set the state anew.
	const stableSourceLayer = $derived(sourceLayer);
	const stableId = $derived(id);
	const stableState = $derived(state);

	// Declarative hover and selection: mount the component while a feature is
	// active and remove it when it is not, instead of pairing every
	// setFeatureState call with a matching removeFeatureState by hand. Feature
	// state lives in the source, so the registry sets it once the source is in
	// the style and again whenever the source is added anew.
	$effect(() => {
		const sourceId = resolvedSource;
		const sourceLayerId = stableSourceLayer;
		const featureId = stableId;
		const next = stableState;

		if (!sourceId) {
			throw new Error(
				'[maplibrex] <FeatureState> needs a source: pass `source` or nest it inside a source component.'
			);
		}

		const target = {
			source: sourceId,
			id: featureId,
			...(sourceLayerId ? { sourceLayer: sourceLayerId } : {})
		};
		let keys: string[] = [];

		// Only the keys set here: other components may hold state on the same
		// feature, such as a selection alongside a hover. A key that leaves
		// `state` is removed by this cleanup and not set again by the next run.
		const registration = registry.addDependent({
			source: sourceId,
			name: `<FeatureState id="${featureId}">`,
			apply: (map) => {
				map.setFeatureState(target, next);
				keys = Object.keys(next);
			},
			unapply: (map) => {
				for (const key of keys) map.removeFeatureState(target, key);
			}
		});

		return () => registration.unregister();
	});
</script>
