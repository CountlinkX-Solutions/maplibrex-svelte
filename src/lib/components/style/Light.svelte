<script lang="ts">
	import type { LightSpecification } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { deepEqual } from '../../internal/deep-equal.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = LightSpecification;

	let light: Props = $props();

	const context = getMapContext();

	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		const next = { ...light };

		if (!map || !ready) return;

		const previous = untrack(() => map.getLight());
		if (deepEqual(previous, next)) return;

		map.setLight(next);

		return () => {
			if (isStyleAlive(map)) map.setLight(previous);
		};
	});
</script>
