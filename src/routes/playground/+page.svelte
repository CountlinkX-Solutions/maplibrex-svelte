<script lang="ts">
	import type { LngLatLike } from 'maplibre-gl';
	import {
		CircleLayer,
		CustomControl,
		FeatureState,
		FillLayer,
		GeoJSONSource,
		GlobeControl,
		LineLayer,
		MapLibre,
		Marker,
		NavigationControl,
		Popup,
		Projection,
		ScaleControl
	} from '$lib/index.js';
	import { CITIES, DEMO_STYLE, grid } from '../../docs/demos/data.js';

	const cells = grid();

	let center = $state<LngLatLike>([6, 46]);
	let zoom = $state(3.4);
	let pin = $state<LngLatLike>([2.1734, 41.3851]);

	let radius = $state(5);
	let fill = $state('#0d9488');
	let globe = $state(false);
	let hoveredId = $state<number | null>(null);
	let scrollZoom = $state(true);

	const readout = $derived(
		Array.isArray(center) ? `${center[0].toFixed(2)}, ${center[1].toFixed(2)}` : '—'
	);
</script>

<svelte:head>
	<title>Playground — MapLibreX</title>
	<meta name="description" content="One map wired to every kind of MapLibreX component at once." />
</svelte:head>

<article>
	<h1>Playground</h1>
	<p class="summary">
		One map wired to a source, two layers, feature state, overlays, controls and a projection at
		once. Every control below drives a prop — nothing here reaches for the map instance.
	</p>

	<div class="stage">
		<MapLibre
			mapStyle={DEMO_STYLE}
			bind:center
			bind:zoom
			cameraMode="fly"
			interactions={{ scrollZoom }}
		>
			<NavigationControl position="top-right" visualizePitch />
			<GlobeControl position="top-right" />
			<ScaleControl position="bottom-left" />

			<CustomControl position="top-left">
				<button
					type="button"
					onclick={() => {
						center = [6, 46];
						zoom = 3.4;
					}}>Reset view</button
				>
			</CustomControl>

			{#if globe}
				<Projection type="globe" />
			{/if}

			<GeoJSONSource id="cells" data={cells}>
				{#if hoveredId !== null}
					<FeatureState id={hoveredId} state={{ hover: true }} />
				{/if}

				<FillLayer
					id="cells-fill"
					paint={{
						'fill-color': fill,
						'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.8, 0.25]
					}}
					onmousemove={(event) => (hoveredId = Number(event.features?.[0]?.id ?? 0) || null)}
					onmouseleave={() => (hoveredId = null)}
				/>
				<LineLayer id="cells-outline" paint={{ 'line-color': fill, 'line-width': 1 }} />
			</GeoJSONSource>

			<GeoJSONSource id="cities" data={CITIES}>
				<CircleLayer
					id="cities-dots"
					paint={{
						'circle-radius': radius,
						'circle-color': '#b91c1c',
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ffffff'
					}}
				/>
			</GeoJSONSource>

			<Marker bind:lngLat={pin} draggable color="#b91c1c">
				<Popup>
					<strong>Drag me</strong>
				</Popup>
			</Marker>
		</MapLibre>
	</div>

	<div class="panel">
		<label>
			circle radius
			<input type="range" min="2" max="16" bind:value={radius} />
			<output>{radius}px</output>
		</label>

		<label>
			cell colour
			<input type="color" bind:value={fill} />
		</label>

		<label>
			<input type="checkbox" bind:checked={globe} />
			globe projection
		</label>

		<label>
			<input type="checkbox" bind:checked={scrollZoom} />
			scroll zoom
		</label>
	</div>

	<dl>
		<div>
			<dt>center</dt>
			<dd>{readout}</dd>
		</div>
		<div>
			<dt>zoom</dt>
			<dd>{zoom.toFixed(2)}</dd>
		</div>
		<div>
			<dt>hovered cell</dt>
			<dd>{hoveredId ?? '—'}</dd>
		</div>
		<div>
			<dt>marker</dt>
			<dd>{Array.isArray(pin) ? `${pin[0].toFixed(3)}, ${pin[1].toFixed(3)}` : '—'}</dd>
		</div>
	</dl>
</article>

<style>
	article {
		max-width: 64rem;
		margin: 0 auto;
	}

	h1 {
		font-size: clamp(1.9rem, 1.4rem + 1.8vw, 2.6rem);
	}

	.summary {
		margin: 0.75rem 0 1.75rem;
		font-size: 1.1rem;
		color: var(--text-muted);
		max-width: 44rem;
	}

	.stage {
		height: 30rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: var(--shadow);
	}

	.panel {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		margin-top: 1.25rem;
		padding: 1rem 1.15rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-subtle);
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
		margin: 1.25rem 0 0;
	}

	dl > div {
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	dt {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	dd {
		margin: 0.15rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	button {
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
		color: #222;
	}
</style>
