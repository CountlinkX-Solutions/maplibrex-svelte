<script lang="ts">
	import {
		FillExtrusionLayer,
		GeoJSONSource,
		Light,
		MapLibre,
		NavigationControl
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { OSM_STYLE, blocks } from './data.js';

	const buildings = blocks();

	let anchor = $state<'map' | 'viewport'>('viewport');
	let azimuth = $state(210);
	let polar = $state(45);
	let intensity = $state(0.6);
	let colour = $state('#ffffff');
</script>

<DemoFrame
	title="Where the light comes from"
	caption="Nothing here moves except the light. Rotate the map with the right mouse button and compare the two anchors: 'map' keeps the sun over the same ground, 'viewport' keeps it over the same corner of your screen."
>
	<MapLibre
		mapStyle={OSM_STYLE}
		center={[2.3522, 48.8566]}
		zoom={15.1}
		pitch={58}
		bearing={-22}
		options={{ maxPitch: 85 }}
	>
		<NavigationControl visualizePitch />

		<Light {anchor} position={[1.15, azimuth, polar]} color={colour} {intensity} />

		<GeoJSONSource id="lit-blocks" data={buildings}>
			<FillExtrusionLayer
				id="lit-blocks-3d"
				paint={{
					'fill-extrusion-height': ['get', 'height'],
					'fill-extrusion-color': '#c9c2b4',
					'fill-extrusion-opacity': 1
				}}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			anchor
			<select bind:value={anchor}>
				<option value="viewport">viewport</option>
				<option value="map">map</option>
			</select>
		</label>
		<label>
			azimuth
			<input type="range" min="0" max="360" bind:value={azimuth} />
			<output>{azimuth}°</output>
		</label>
		<label>
			polar
			<input type="range" min="0" max="90" bind:value={polar} />
			<output>{polar}°</output>
		</label>
		<label>
			intensity
			<input type="range" min="0" max="1" step="0.05" bind:value={intensity} />
			<output>{intensity.toFixed(2)}</output>
		</label>
		<label>
			colour
			<input type="color" bind:value={colour} />
		</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
	}
</style>
