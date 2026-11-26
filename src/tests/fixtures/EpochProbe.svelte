<script lang="ts">
	import { getMapContext } from '#lib/context.js';

	/**
	 * Renders nothing. Reports the map context's style epoch each time it
	 * changes, so a test can tell when the library has re-applied the tree.
	 */
	let { onepoch }: { onepoch: (epoch: number) => void } = $props();

	const context = getMapContext();

	$effect(() => {
		onepoch(context.styleEpoch);
	});
</script>
