<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { LngLatLike } from 'maplibre-gl';
	import {
		CircleLayer,
		CustomControl,
		GeoJSONSource,
		GlobeControl,
		MapLibre,
		Marker,
		NavigationControl,
		Popup,
		ScaleControl
	} from '$lib/index.js';

	let center = $state<LngLatLike>([2.1734, 41.3851]);
	let zoom = $state(4);
	let markerAt = $state<LngLatLike>([2.1734, 41.3851]);
	let radius = $state(6);

	const capitals = {
		type: 'FeatureCollection' as const,
		features: [
			{ name: 'Madrid', coordinates: [-3.7038, 40.4168] },
			{ name: 'Lisbon', coordinates: [-9.1393, 38.7223] },
			{ name: 'Paris', coordinates: [2.3522, 48.8566] },
			{ name: 'Rome', coordinates: [12.4964, 41.9028] },
			{ name: 'Berlin', coordinates: [13.405, 52.52] }
		].map((city) => ({
			type: 'Feature' as const,
			properties: { name: city.name },
			geometry: { type: 'Point' as const, coordinates: city.coordinates }
		}))
	};
</script>

<main>
	<header>
		<h1>MapLibreX</h1>
		<p>Svelte 5 components for MapLibre GL JS. Every panel below is driven by props.</p>
	</header>

	<section class="map">
		<MapLibre
			mapStyle="https://demotiles.maplibre.org/style.json"
			bind:center
			bind:zoom
			cameraMode="fly"
		>
			<NavigationControl position="top-right" />
			<ScaleControl position="bottom-left" />
			<GlobeControl position="top-right" />

			<CustomControl position="top-left">
				<button type="button" onclick={() => (zoom = 4)}>Reset zoom</button>
			</CustomControl>

			<GeoJSONSource id="capitals" data={capitals}>
				<CircleLayer
					id="capitals-dots"
					paint={{
						'circle-radius': radius,
						'circle-color': '#0f766e',
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ffffff'
					}}
				/>
			</GeoJSONSource>

			<Marker bind:lngLat={markerAt} draggable color="#b91c1c">
				<Popup>
					<strong>Drag me</strong>
				</Popup>
			</Marker>
		</MapLibre>
	</section>

	<section class="panel">
		<label>
			Circle radius
			<input type="range" min="2" max="20" bind:value={radius} />
			<output>{radius}px</output>
		</label>

		<dl>
			<dt>Zoom</dt>
			<dd>{zoom.toFixed(2)}</dd>
			<dt>Marker</dt>
			<dd>{JSON.stringify(markerAt)}</dd>
		</dl>
	</section>
</main>

<style>
	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	.map {
		height: 28rem;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.panel {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: center;
		margin-top: 1.5rem;
	}

	dl {
		display: grid;
		grid-template-columns: auto auto;
		gap: 0.25rem 1rem;
		margin: 0;
	}

	dt {
		font-weight: 600;
	}

	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
</style>
