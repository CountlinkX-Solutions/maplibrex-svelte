<script lang="ts">
	import type { LightSpecification } from 'maplibre-gl';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	type Props = LightSpecification;

	let light: Props = $props();

	// Unmounting puts back the light of the style shown at that moment.
	holdStyleState({
		name: '<Light>',
		value: () => ({ ...light }),
		snapshot: (map) => map.getLight(),
		write: (map, next) => map.setLight(next),
		restore: (map, previous) => map.setLight(previous)
	});
</script>
