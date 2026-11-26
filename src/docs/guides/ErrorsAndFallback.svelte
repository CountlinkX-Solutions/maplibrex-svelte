<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeBlock from '../ui/CodeBlock.svelte';
	import MapStatusDemo from '../demos/MapStatusDemo.svelte';

	// Split so the literal never contains a real closing script tag, which the
	// Svelte parser would treat as the end of this block.
	const CLOSE_SCRIPT = '<' + '/script>';

	const onerrorExample = `<script lang="ts">
  import { MapLibre } from 'maplibrex-svelte';
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre
    mapStyle="https://example.com/style.json"
    onerror={(event) => console.warn('Map error:', event.error.message)}
  />
</div>`;

	const statusExample = `<script lang="ts">
  import { MapLibre, type MapStatus } from 'maplibrex-svelte';

  let status = $state<MapStatus>('loading');
  let error = $state<Error | null>(null);
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre mapStyle="https://example.com/style.json" bind:status bind:error />
</div>

{#if status === 'loading'}
  <p>Loading the map…</p>
{:else if status === 'error'}
  <p role="alert">The map could not be shown: {error?.message}</p>
{/if}`;

	const backupExample = `<script lang="ts">
  import { MapLibre, type MapLibreMap, type MapStatus } from 'maplibrex-svelte';

  const primaryStyle = 'https://example.com/style.json';
  const backupStyle = 'https://example.com/backup-style.json';

  let mapStyle = $state(primaryStyle);
  let status = $state<MapStatus>('loading');
  let map = $state<MapLibreMap | null>(null);

  // The map exists, so its style failed: load the backup, once.
  $effect(() => {
    if (map && status === 'error' && mapStyle === primaryStyle) mapStyle = backupStyle;
  });
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre {mapStyle} bind:status bind:map />
</div>`;

	const fallbackExample = `<script lang="ts">
  import { MapLibre } from 'maplibrex-svelte';
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre mapStyle="https://example.com/style.json">
    {#snippet fallback({ error })}
      <p>The map cannot be shown in this browser ({error.name}).</p>
    {/snippet}
  </MapLibre>
</div>`;

	const missingSource =
		'[maplibrex] Layer "stops-dots" is waiting for source "stop", which no source component ' +
		'provides and the style does not have. It is applied once that source is added.';
</script>

<p>
	A map that cannot be created, a style that fails to load, a tile that fails, and a layer that
	cannot be placed are not thrown out of <code>&lt;MapLibre&gt;</code>. They reach
	<code>onerror</code>, or the console when you pass no <code>onerror</code>.
	<code>bind:status</code>
	and
	<code>bind:error</code> tell you whether the map shows the style you asked for, and the
	<code>fallback</code> snippet is rendered when there is no map at all. Only mistakes in the markup throw;
	they are listed at the end.
</p>

<h2 id="onerror">onerror</h2>
<p>
	<code>onerror</code> receives MapLibre's <code>error</code> event, with the error in
	<code>event.error</code>:
</p>
<ul>
	<li>a style, tile or sprite request that fails, and a style that does not validate;</li>
	<li>
		a source or layer that MapLibre refuses, for example because its specification is invalid. The
		rest of your components are still added;
	</li>
	<li>
		the problems the library finds in your markup: a <code>beforeId</code> that names no layer, and
		a layer, <code>&lt;Terrain&gt;</code> or <code>&lt;FeatureState&gt;</code> waiting for a source that
		nothing provides. Each is reported once.
	</li>
</ul>
<p>
	It is also called once when the map cannot be created, with an event the library builds. That
	event has no <code>target</code>, since there is no map. Without <code>onerror</code>, all of
	these are written to the console; with it, they are not, so log what you need.
</p>

<CodeBlock code={onerrorExample} />

<h2 id="status">status, error and ready</h2>
<table>
	<thead>
		<tr><th><code>status</code></th><th>When</th></tr>
	</thead>
	<tbody>
		<tr>
			<td><code>'loading'</code></td>
			<td>
				Until the first style is shown, and again from the moment you assign a new
				<code>mapStyle</code> until it is shown.
			</td>
		</tr>
		<tr>
			<td><code>'ready'</code></td>
			<td>The map shows the current <code>mapStyle</code>, with your layers on it.</td>
		</tr>
		<tr>
			<td><code>'error'</code></td>
			<td>
				The map could not be created, or the current <code>mapStyle</code> failed to load: its URL could
				not be fetched, or it does not validate.
			</td>
		</tr>
	</tbody>
</table>
<p>
	<code>error</code> holds the error behind an <code>'error'</code> status, and is <code>null</code>
	otherwise. A tile or sprite that fails to load reaches <code>onerror</code> but leaves
	<code>status</code> as it is. <code>ready</code> answers a different question: it turns
	<code>true</code> at the map's first load and stays <code>true</code> while a later style loads or after
	one fails.
</p>

<CodeBlock code={statusExample} />

<h2 id="style-fails">A style that fails to load</h2>
<p>
	When a style URL cannot be fetched or the style does not validate, <code>status</code> becomes
	<code>'error'</code> and <code>error</code> says why. What the map shows depends on what it showed before:
</p>
<ul>
	<li>If it was showing a style, that style stays on screen with your layers on it.</li>
	<li>
		If it had no loaded style, because the failing style is the first one or an earlier failure left
		the map without one, it shows no style and none of your layers.
	</li>
</ul>
<p>
	Either way the map itself works. Assign another <code>mapStyle</code> and the map loads it; once
	it has loaded, your components are back on it and <code>status</code> is <code>'ready'</code>. The
	<code>fallback</code> snippet is not rendered for a failed style.
</p>
<p>
	To switch to a backup style automatically, watch <code>status</code> rather than
	<code>onerror</code>: <code>onerror</code> is also called for a tile or sprite that fails, while the
	style stays in place.
</p>

<CodeBlock code={backupExample} />

<h2 id="fallback">No map at all: the fallback snippet</h2>
<p>
	When MapLibre cannot create the map, for example because the browser provides no WebGL2 context,
	nothing is thrown. Instead:
</p>
<ul>
	<li>
		<code>onerror</code> is called once, with MapLibre's error; for a missing WebGL2 context that is
		a
		<code>GPUInitializationError</code>;
	</li>
	<li>
		<code>status</code> is <code>'error'</code> and <code>error</code> holds the same error, while
		<code>map</code> stays <code>null</code> and <code>ready</code> stays <code>false</code>;
	</li>
	<li>
		the <code>fallback</code> snippet, if you pass one, is rendered inside the map container and receives
		the error. Without it the container stays empty;
	</li>
	<li>nothing you put inside <code>&lt;MapLibre&gt;</code> is rendered.</li>
</ul>

<CodeBlock code={fallbackExample} />

<p>
	The map is created once, when <code>&lt;MapLibre&gt;</code> mounts. To try again, mount it again,
	for example inside a <code>{'{#key}'}</code> block, as the demo below does. Two of its styles fail on
	purpose.
</p>

<MapStatusDemo />

<h2 id="missing-source">A layer waiting for a source that never appears</h2>
<p>
	A layer attached with <code>source="id"</code>, a <code>&lt;Terrain&gt;</code> or a
	<code>&lt;FeatureState&gt;</code> waits until a source with that id is on the map. If no source
	component provides it and the style does not have it once the current update is over, the library
	reports it once through <code>onerror</code>:
</p>

<CodeBlock code={missingSource} language="text" />

<p>
	It keeps waiting, and is added as soon as a source with that id appears, from a source component,
	a style you switch to, or <code>map.addSource</code>. A later style load does not report it again.
</p>
<p>
	This happens with a typo, or after a switch to a style without that source. A source added later
	also produces the report, although the layer is then added: a source component that mounts in a
	later update than the layer naming it, such as one inside an <code>{'{#if}'}</code> that turns
	true when data arrives, or a source you add by hand after the map has loaded. To avoid it, nest
	the layer in its source component, mount both in the same update, for example inside the same
	<code>{'{#if}'}</code>, or add a source by hand in <code>onload</code>. See
	<a href={resolve('/guides/[slug]', { slug: 'layer-order' })}>Layer order</a> for nested and attached
	layers.
</p>

<h2 id="throws">What throws</h2>
<p>Mistakes in the markup throw, so they show up while you develop:</p>
<ul>
	<li>
		a component that needs <code>&lt;MapLibre&gt;</code> rendered outside it, as
		<a href={resolve('/guides/[slug]', { slug: 'layer-order' }) + '#inside-maplibre'}>Layer order</a
		>
		describes;
	</li>
	<li>
		a layer that draws the data of a source, <code>&lt;Terrain&gt;</code> or
		<code>&lt;FeatureState&gt;</code>, neither nested in a source component nor given
		<code>source</code>;
	</li>
	<li><code>&lt;Image&gt;</code> with neither <code>url</code> nor <code>image</code>.</li>
</ul>
<p>
	<code>&lt;Image url&gt;</code> downloads the image itself, and a download that fails does not
	reach the map's <code>onerror</code>. Pass <code>onerror</code> to <code>&lt;Image&gt;</code>;
	without it the failure is silent.
</p>
