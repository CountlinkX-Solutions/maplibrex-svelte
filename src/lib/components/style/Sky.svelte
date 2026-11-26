<script lang="ts">
	import type { SkySpecification } from 'maplibre-gl';
	import { unsetKeys } from '../../internal/diff.js';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	type Props = SkySpecification;

	let sky: Props = $props();

	// Unmounting puts back the sky of the style shown at that moment, which may
	// declare no sky, or less of it than this component set. `setSky` changes
	// only the keys it is given, so the others are reset first. MapLibre resets
	// a key given `undefined`, which its validation rejects, and there is no
	// value in that call to validate. Given no sky at all, MapLibre then puts
	// back the sky it draws for a style without one.
	holdStyleState({
		name: '<Sky>',
		value: () => ({ ...sky }),
		snapshot: (map) => map.getSky(),
		write: (map, next) => map.setSky(next),
		restore: (map, previous, last) => {
			map.setSky(unsetKeys(last, previous), { validate: false });
			map.setSky(previous);
		}
	});
</script>
