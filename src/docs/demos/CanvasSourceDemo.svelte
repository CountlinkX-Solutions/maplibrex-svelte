<script lang="ts">
	import { CanvasSource, MapLibre, NavigationControl, RasterLayer } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, type Corners } from './data.js';

	let canvas = $state<HTMLCanvasElement | null>(null);
	let animate = $state(true);

	const coordinates: Corners = [
		[-6, 46],
		[6, 46],
		[6, 38],
		[-6, 38]
	];

	// Whatever is painted here is what the map shows. With `animate`, MapLibre
	// re-reads the canvas every frame, so the map follows the drawing live.
	$effect(() => {
		const element = canvas;
		if (!element) return;

		const context = element.getContext('2d');
		if (!context) return;

		let frame = 0;
		let handle = 0;

		const draw = () => {
			frame += 1;
			const { width, height } = element;

			context.clearRect(0, 0, width, height);
			context.fillStyle = '#0b1b22';
			context.fillRect(0, 0, width, height);

			for (let ring = 0; ring < 5; ring += 1) {
				const radius = ((frame * 1.6 + ring * 42) % 220) + 12;
				context.beginPath();
				context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
				context.strokeStyle = ring % 2 === 0 ? '#35c9b8' : '#b91c1c';
				context.lineWidth = 6;
				context.globalAlpha = 1 - radius / 260;
				context.stroke();
			}

			context.globalAlpha = 1;
			handle = requestAnimationFrame(draw);
		};

		draw();

		return () => cancelAnimationFrame(handle);
	});
</script>

<DemoFrame
	title="A canvas as a live source"
	caption="The rings are drawn in a 2D canvas on every frame. Turn the animation off and MapLibre stops re-reading it, so the last frame freezes on the map."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[0, 42]} zoom={3.6}>
		<NavigationControl />

		{#if canvas}
			<CanvasSource id="painted" {canvas} {coordinates} {animate}>
				<RasterLayer id="painted-layer" paint={{ 'raster-opacity': 0.9 }} />
			</CanvasSource>
		{/if}
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={animate} />
			animate
		</label>
		<span>the canvas itself is never in the page</span>
	{/snippet}
</DemoFrame>

<!-- The source reads pixels straight off this element; it is never displayed. -->
<canvas bind:this={canvas} width="512" height="512" style="display: none"></canvas>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
