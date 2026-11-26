<script lang="ts">
	import type { LightSpecification } from 'maplibre-gl';
	import { unsetKeys } from '../../internal/diff.js';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	type Props = LightSpecification;

	let light: Props = $props();

	// Unmounting puts back the light of the style shown at that moment, which
	// may declare no light, or less of it than this component set. `setLight`
	// changes only the keys it is given, so the others are reset first. MapLibre
	// resets a key given `undefined`, which its validation rejects, and there is
	// no value in that call to validate.
	holdStyleState({
		name: '<Light>',
		value: () => ({ ...light }),
		snapshot: (map) => map.getLight(),
		write: (map, next) => map.setLight(next),
		restore: (map, previous, last) => {
			map.setLight(unsetKeys(last, previous), { validate: false });
			map.setLight(previous);
		}
	});
</script>
