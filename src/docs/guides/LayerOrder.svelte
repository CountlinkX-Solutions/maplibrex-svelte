<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeBlock from '../ui/CodeBlock.svelte';

	// Split so the literal never contains a real closing script tag, which the
	// Svelte parser would treat as the end of this block.
	const CLOSE_SCRIPT = '<' + '/script>';

	const orderExample = `<script lang="ts">
  import { MapLibre, GeoJSONSource, FillLayer, LineLayer, CircleLayer } from 'maplibrex-svelte';

  let showRoutes = $state(false);
${CLOSE_SCRIPT}

<label><input type="checkbox" bind:checked={showRoutes} /> Routes</label>

<div style="height: 400px">
  <MapLibre mapStyle="https://example.com/style.json">
    <GeoJSONSource id="areas" data="https://example.com/areas.geojson">
      <FillLayer id="areas-fill" paint={{ 'fill-color': '#0f766e', 'fill-opacity': 0.4 }} />
    </GeoJSONSource>

    {#if showRoutes}
      <GeoJSONSource id="routes" data="https://example.com/routes.geojson">
        <LineLayer id="routes-line" paint={{ 'line-color': '#b3541e', 'line-width': 3 }} />
      </GeoJSONSource>
    {/if}

    <GeoJSONSource id="stops" data="https://example.com/stops.geojson">
      <CircleLayer id="stops-dots" paint={{ 'circle-radius': 5 }} />
    </GeoJSONSource>
  </MapLibre>
</div>`;

	const beforeIdExample = `<script lang="ts">
  import { MapLibre, GeoJSONSource, FillLayer } from 'maplibrex-svelte';
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre mapStyle="https://example.com/style.json">
    <GeoJSONSource id="areas" data="https://example.com/areas.geojson">
      <!-- place-labels: the id of a label layer in your style -->
      <FillLayer id="areas-fill" beforeId="place-labels" paint={{ 'fill-color': '#0f766e' }} />
    </GeoJSONSource>
  </MapLibre>
</div>`;

	const missingTarget =
		'[maplibrex] Layer "areas-fill" has beforeId "place-labels", which is not in the style. ' +
		'It was added on top, and moves below "place-labels" if a layer component adds it later.';

	const attachedExample = `<script lang="ts">
  import { MapLibre, GeoJSONSource, CircleLayer } from 'maplibrex-svelte';
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre mapStyle="https://example.com/style.json">
    <!-- Attached: names its source, and can sit anywhere inside <MapLibre> -->
    <CircleLayer
      id="stops-halo"
      source="stops"
      paint={{ 'circle-radius': 12, 'circle-color': '#0f766e', 'circle-opacity': 0.3 }}
    />

    <GeoJSONSource id="stops" data="https://example.com/stops.geojson">
      <!-- Nested: reads the source it sits in -->
      <CircleLayer id="stops-dots" paint={{ 'circle-radius': 5, 'circle-color': '#0f766e' }} />
    </GeoJSONSource>
  </MapLibre>
</div>`;

	const anchor = `<div hidden aria-hidden="true" data-maplibrex="layer"></div>`;
</script>

<p>
	Every layer component is drawn above the layer components that come before it in your markup and
	below the ones that come after it. That holds however each one mounts: in the first render, later
	inside an <code>{'{#if}'}</code>, inside a keyed or unkeyed <code>{'{#each}'}</code> whose items
	are added or reordered, or nested in a source component. Your layers are drawn above the style's
	own layers. The exception is a layer with <code>beforeId</code>, which is placed by the name it
	gives instead.
</p>

<CodeBlock code={orderExample} />

<p>
	From bottom to top the map draws <code>areas-fill</code>, <code>routes-line</code> and
	<code>stops-dots</code>. Turning <code>showRoutes</code> on later puts <code>routes-line</code>
	between the other two, not on top.
</p>

<h2 id="how">How a layer finds its place</h2>
<p>
	A layer without <code>beforeId</code> is added directly below the next layer component after it in
	the markup that is already on the map, or on top of everything when there is none. Because every
	layer is placed this way, the layers end up in markup order whatever order they arrive in. When a
	keyed <code>{'{#each}'}</code> reorders its items, Svelte moves the existing components without
	running them again, and the library moves their layers to match. A layer whose <code>id</code> or
	<code>source</code> changes is added again at the same place.
</p>

<h2 id="beforeid">Placing a layer by name with beforeId</h2>
<p>
	<code>beforeId</code> puts a layer directly below the layer with that id, which can be one of the
	style's own layers, such as the labels of a basemap, or one of yours. Changing
	<code>beforeId</code> moves the layer, and removing it puts the layer back at its place in the markup.
</p>

<CodeBlock code={beforeIdExample} />

<p>
	A layer with <code>beforeId</code> takes no part in the markup order: the layers without one are placed
	as if it were not in the markup.
</p>
<p>
	If no layer with that id is on the map when the layer is added, the layer is drawn on top instead,
	and moves below its target as soon as a layer component adds it. Unless a layer component with
	that id is already mounted and waiting to be added, the library also reports it once through
	<code>onerror</code>:
</p>

<CodeBlock code={missingTarget} language="text" />

<p>
	This happens with a typo, after switching to a style that has no layer with that id, and when the
	layer it names belongs to a layer component that mounts later.
</p>

<h2 id="nested-or-attached">Nested in a source, or attached to one</h2>
<p>
	A layer nested in a source component reads that source. A layer anywhere else inside
	<code>&lt;MapLibre&gt;</code> names its source with <code>source="id"</code>.
</p>

<CodeBlock code={attachedExample} />

<p>
	Here <code>stops-halo</code> is drawn below <code>stops-dots</code>, because it comes first in the
	markup, although its source comes after it. A layer is drawn by where the layer component sits,
	not by where its source sits.
</p>
<p>
	Both forms wait until their source is on the map, are taken out before the source goes, and come
	back when the source is recreated or the style is switched. They differ in a few ways:
</p>
<ul>
	<li>
		A nested layer mounts once its source is on the map and unmounts with the source component. When
		the source's <code>id</code> changes, nested layers follow it.
	</li>
	<li>
		An attached layer stays mounted on its own. When its source component unmounts, the layer leaves
		the map and waits for a source with that id to come back. When the source's <code>id</code>
		changes, it follows only if its own <code>source</code> prop changes too.
	</li>
	<li>
		An attached layer can read any source on the map: one of your source components, a source the
		style declares, or one you add with <code>map.addSource</code>. If none of these provides it,
		the wait is reported once through <code>onerror</code>; see
		<a href={resolve('/guides/[slug]', { slug: 'errors-and-fallback' })}>Errors and fallback</a>.
	</li>
</ul>
<p>
	Outside a source component, a layer that draws the data of a source needs a <code>source</code>
	prop, and throws without one. <code>&lt;BackgroundLayer&gt;</code> and
	<code>&lt;CustomLayer&gt;</code> read no source.
</p>

<h2 id="anchor">The hidden element each layer renders</h2>
<p>
	To know where a layer sits in the markup, each layer component, <code>&lt;CustomLayer&gt;</code>
	included, renders an empty element at that place:
</p>

<CodeBlock code={anchor} language="html" />

<p>
	<code>&lt;MapLibre&gt;</code> renders what you put inside it after its map container, as siblings,
	so these elements end up next to the map container, in the element that wraps
	<code>&lt;MapLibre&gt;</code>, not inside the map. They are rendered only once the map exists, so
	server-rendered HTML has none.
</p>
<p>For your own CSS, two things follow:</p>
<ul>
	<li>
		The <code>hidden</code> attribute hides an element through the browser's default
		<code>display: none</code>, and any rule of yours that sets <code>display</code> on these
		elements wins over it. A rule such as <code>.map-panel &gt; * {'{ display: block; }'}</code>
		brings them back into the layout: they are empty, but if the wrapper is a grid they take a cell, and
		if it is a grid or flex container with a <code>gap</code> they add one.
	</li>
	<li>
		Selectors that count siblings count them too. In the wrapper, <code>:last-child</code>,
		<code>:nth-child()</code> or <code>* + *</code> can match a layer element instead of the map container.
	</li>
</ul>
<p>
	Select the map container by its class instead of its position: it always has the class
	<code>maplibrex-map</code>, besides any <code>class</code> you pass. To leave the layer elements
	out of a rule, add <code>:not([data-maplibrex='layer'])</code>.
</p>

<h2 id="inside-maplibre">Inside &lt;MapLibre&gt; only</h2>
<p>
	The source components, the layer components, <code>&lt;CustomLayer&gt;</code>,
	<code>&lt;Terrain&gt;</code>, <code>&lt;FeatureState&gt;</code>, <code>&lt;Light&gt;</code>,
	<code>&lt;Sky&gt;</code>, <code>&lt;Projection&gt;</code> and <code>&lt;GlobalState&gt;</code>
	must be rendered inside <code>&lt;MapLibre&gt;</code>: as its children, or anywhere below them,
	including inside your own components. Rendered anywhere else, they throw
	<code>[maplibrex] This component must be rendered inside &lt;MapLibre&gt;.</code> A map context
	you build yourself with <code>setMapContext</code> is not enough for them. The other components,
	apart from <code>&lt;Protocol&gt;</code>, need a <code>&lt;MapLibre&gt;</code> above them too.
</p>
