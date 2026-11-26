<script lang="ts">
	import type { SkySpecification } from 'maplibre-gl';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	type Props = SkySpecification;

	let sky: Props = $props();

	// Unmounting puts back the sky of the style shown at that moment.
	holdStyleState({
		name: '<Sky>',
		value: () => ({ ...sky }),
		snapshot: (map) => map.getSky(),
		write: (map, next) => map.setSky(next),
		restore: (map, previous) => map.setSky(previous)
	});
</script>
