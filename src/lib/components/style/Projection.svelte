<script lang="ts">
	import type { ProjectionSpecification } from 'maplibre-gl';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	type Props = ProjectionSpecification;

	let projection: Props = $props();

	// Unmounting puts back the projection of the style shown at that moment,
	// including none: a style that declares no projection reports `undefined`.
	holdStyleState({
		name: '<Projection>',
		value: () => ({ ...projection }),
		snapshot: (map) => map.getProjection(),
		write: (map, next) => map.setProjection(next),
		restore: (map, previous) => map.setProjection(previous)
	});
</script>
