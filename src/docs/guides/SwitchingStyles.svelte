<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import StyleSwitchDemo from '../demos/StyleSwitchDemo.svelte';

	// Split so the literal never contains a real closing script tag, which the
	// Svelte parser would treat as the end of this block.
	const CLOSE_SCRIPT = '<' + '/script>';

	const switchExample = `<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { MapLibre, GeoJSONSource, CircleLayer } from 'maplibrex-svelte';

  const lightStyle = 'https://example.com/light-style.json';
  const darkStyle = 'https://example.com/dark-style.json';

  let mapStyle = $state(lightStyle);
${CLOSE_SCRIPT}

<button onclick={() => (mapStyle = mapStyle === lightStyle ? darkStyle : lightStyle)}>
  Switch style
</button>

<div style="height: 400px">
  <MapLibre {mapStyle} center={[2.17, 41.38]} zoom={4}>
    <GeoJSONSource id="stops" data="https://example.com/stops.geojson">
      <CircleLayer id="stops-dots" paint={{ 'circle-radius': 6, 'circle-color': '#0f766e' }} />
    </GeoJSONSource>
  </MapLibre>
</div>`;
</script>

<p>
	Assign a new value to <code>mapStyle</code> and the map shows that style. The map is not created
	again: <code>bind:map</code> keeps the same instance, and controls, markers and popups, which
	belong to the map rather than to the style, stay as they are. Once the new style can take them,
	the library puts back everything your components had added to the old one, so there is nothing to
	add again by hand. You can assign <code>mapStyle</code> at any moment, also while a style is still loading.
</p>

<CodeBlock code={switchExample} />

<StyleSwitchDemo />

<h2 id="what-comes-back">What comes back</h2>
<p>A switch drops everything added to the previous style. The library adds back:</p>
<ul>
	<li>
		every source component, and every layer that reads one, whether it is nested in the source or
		attached to it with <code>source="id"</code>;
	</li>
	<li><code>&lt;CustomLayer&gt;</code>;</li>
	<li>
		<code>&lt;Terrain&gt;</code> and <code>&lt;FeatureState&gt;</code>, once their source is back;
	</li>
	<li>
		<code>&lt;Light&gt;</code>, <code>&lt;Sky&gt;</code>, <code>&lt;Projection&gt;</code> and
		<code>&lt;GlobalState&gt;</code>, which apply their props to the new style. When one of them
		unmounts later, the map goes back to what the style shown at that moment declares;
	</li>
	<li><code>&lt;Image&gt;</code>, which registers its image again.</li>
</ul>
<p>
	Your layers are drawn above the new style's own layers, in the order of your markup. A layer with
	<code>beforeId</code> goes below the layer it names, as long as a layer with that id is on the map,
	from the new style or from one of your components.
</p>
<p>
	Two things can be missing from the new style. A layer that reads a source of the style itself,
	such as a vector source the old basemap declared, waits until a source with that id is on the map.
	A
	<code>beforeId</code> that names a layer the new style does not have puts its layer on top. Each
	is reported once through <code>onerror</code>; see
	<a href={resolve('/guides/[slug]', { slug: 'layer-order' })}>Layer order</a> and
	<a href={resolve('/guides/[slug]', { slug: 'errors-and-fallback' })}>Errors and fallback</a>.
</p>

<h2 id="added-by-hand">What does not come back</h2>
<p>
	Anything you added to the map without a component, for example with <code>map.addLayer</code> on
	the instance from <code>bind:map</code>, belonged to the old style and is gone. Declare it with a
	component where one exists. Otherwise, add it from a component rendered inside
	<code>&lt;MapLibre&gt;</code>, in an effect that reads <code>styleEpoch</code> from
	<code>getMapContext()</code>. That number goes up each time a style finishes loading, including
	after a switch, so the effect runs again on the new style.
</p>

<h2 id="status">While the new style loads</h2>
<p>
	The map loads the last value you assigned, also when you change <code>mapStyle</code> before the first
	style has finished loading, or after a style failed to load.
</p>
<p>
	<code>bind:status</code> is <code>'loading'</code> from the moment you assign a new style until
	the map shows it with your layers on it, then <code>'ready'</code>. <code>bind:ready</code> turns
	<code>true</code> at the first load and stays <code>true</code> through later switches, so read
	<code>status</code>, not <code>ready</code>, to know whether the style you asked for is on screen.
	The
	<a href={resolve('/docs/[slug]', { slug: 'maplibre' })}><code>&lt;MapLibre&gt;</code> page</a> lists
	both bindings.
</p>

<h2 id="diff-or-rebuild">Diff or rebuild</h2>
<p>
	MapLibre moves to a new style in one of two ways. The library brings your components back after
	either, but the difference shows on screen.
</p>
<ul>
	<li>
		A <strong>diff</strong> applies only what differs between the two styles. The library asks for one
		whenever the map has a loaded style. While a new style URL is being fetched, the old style stays on
		screen with your layers, and a layer that mounts in the meantime is added to it and carried over.
		If the new style fails to load, the old one stays.
	</li>
	<li>
		A <strong>rebuild</strong> drops the old style first and loads the new one from scratch, so your layers
		are off the map until the new style has loaded, and stay off if it fails. A switch made while the
		map has no loaded style, before the first one has loaded or after a rebuild failed, is a rebuild.
		MapLibre also rebuilds on its own when it cannot express the change as a diff.
	</li>
</ul>
