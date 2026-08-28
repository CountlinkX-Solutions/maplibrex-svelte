<script lang="ts">
	import type { RequestParameters } from 'maplibre-gl';
	import {
		CircleLayer,
		GeoJSONSource,
		MapLibre,
		NavigationControl,
		Protocol,
		SymbolLayer
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { CITIES, DEMO_FONT, DEMO_STYLE } from './data.js';

	let threshold = $state(2.5);
	let served = $state(0);
	let lastUrl = $state('—');
	let returned = $state(0);

	/**
	 * A protocol is where you decide what a URL means, and what comes back.
	 *
	 * This one reads a threshold out of the path, keeps the cities above it, and
	 * attaches a `rank` that exists nowhere in the source data. The layers below
	 * style by that rank, so they are drawing something the protocol invented.
	 * A real one would fetch, unpack or convert here instead.
	 */
	const handler = async (request: RequestParameters) => {
		const minimum = Number(request.url.split('/').pop() ?? 0);

		const kept = CITIES.features
			.filter((city) => city.properties.population >= minimum)
			.sort((a, b) => b.properties.population - a.properties.population)
			.map((city, index) => ({
				...city,
				properties: { ...city.properties, rank: index + 1 }
			}));

		served += 1;
		lastUrl = request.url;
		returned = kept.length;

		return { data: { type: 'FeatureCollection' as const, features: kept } };
	};

	const dataUrl = $derived(`cities://above/${threshold.toFixed(1)}`);
</script>

<!--
	Above the map on purpose: sibling effects run in document order, so the
	scheme is registered before the map ever asks for it.
-->
<Protocol name="cities" {handler} />

<DemoFrame
	title="A URL scheme you implement yourself"
	caption="The source asks for cities://above/2.5 exactly as it would ask for a file on a server. There is no server: your function reads the threshold, filters, and adds a rank the raw data never had — which is what the colours are drawn from."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[9, 46]} zoom={3.3}>
		<NavigationControl />

		<GeoJSONSource id="from-protocol" data={dataUrl}>
			<CircleLayer
				id="from-protocol-dots"
				paint={{
					'circle-radius': ['interpolate', ['linear'], ['get', 'population'], 1, 5, 12, 22],
					'circle-color': ['interpolate', ['linear'], ['get', 'rank'], 1, '#b91c1c', 12, '#0d9488'],
					'circle-opacity': 0.85,
					'circle-stroke-width': 1.5,
					'circle-stroke-color': '#ffffff'
				}}
			/>
			<SymbolLayer
				id="from-protocol-labels"
				layout={{
					'text-field': ['concat', ['get', 'name'], '  #', ['to-string', ['get', 'rank']]],
					'text-font': DEMO_FONT,
					'text-size': 11,
					'text-offset': [0, 1.4],
					'text-allow-overlap': false
				}}
				paint={{ 'text-color': '#10181c', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 }}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			above
			<input type="range" min="1" max="10" step="0.5" bind:value={threshold} />
			<output>{threshold.toFixed(1)}M</output>
		</label>
		<span><strong>handler calls</strong> {served}</span>
		<span><strong>cities returned</strong> {returned}</span>
		<span><code>{lastUrl}</code></span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
