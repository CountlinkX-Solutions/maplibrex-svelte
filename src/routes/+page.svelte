<script lang="ts">
	import { resolve } from '$app/paths';
	import CodeBlock from '../docs/ui/CodeBlock.svelte';
	import BasicMap from '../docs/demos/BasicMap.svelte';
	import { COMPONENTS, COMPONENTS_BY_CATEGORY } from '../docs/registry.js';

	const install = `npm install maplibrex-svelte maplibre-gl`;

	// Split so the literal never contains a real closing script tag, which the
	// Svelte parser would treat as the end of this block.
	const CLOSE_SCRIPT = '<' + '/script>';

	const quickStart = `<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { MapLibre, NavigationControl, GeoJSONSource, CircleLayer } from 'maplibrex-svelte';

  let zoom = $state(4);
${CLOSE_SCRIPT}

<div style="height: 400px">
  <MapLibre mapStyle={styleUrl} center={[2.17, 41.38]} bind:zoom>
    <NavigationControl />

    <GeoJSONSource id="cities" data={cities}>
      <CircleLayer id="cities-dots" paint={{ 'circle-radius': 6 }} />
    </GeoJSONSource>
  </MapLibre>
</div>`;

	const principles = [
		{
			title: 'The component tree is the style tree',
			body: 'A layer nested inside a source inherits its id. Nesting is the wiring — and it makes teardown order correct for free, because Svelte destroys children before parents, exactly as MapLibre requires.'
		},
		{
			title: 'Updates are surgical, never destructive',
			body: 'Changing one paint property calls setPaintProperty for that key. Changing GeoJSON calls setData. Recreation happens only where MapLibre exposes no setter, and the prop says so.'
		},
		{
			title: 'Every event is a typed callback prop',
			body: 'Props are derived from MapLibre’s own event maps, so handlers keep their exact payload type and a new upstream event needs no release here.'
		},
		{
			title: 'Server rendering is safe',
			body: 'Importing the library on the server is harmless. The map is constructed inside $effect, which never runs there.'
		}
	];
</script>

<svelte:head>
	<title>MapLibreX — Svelte 5 components for MapLibre GL JS</title>
	<meta
		name="description"
		content="Component-oriented MapLibre GL JS bindings for Svelte 5, written in TypeScript."
	/>
</svelte:head>

<section class="hero">
	<p class="eyebrow">Svelte 5 · MapLibre GL JS 6 · TypeScript</p>
	<h1>Describe the map as a component tree.</h1>
	<p class="lede">
		MapLibreX keeps that tree and the imperative MapLibre instance in agreement — adding, updating
		in place, and tearing down in the right order.
	</p>

	<div class="cta">
		<a class="primary" href={resolve('/docs')}>Browse {COMPONENTS.length} components</a>
		<a class="secondary" href={resolve('/playground')}>Open the playground</a>
	</div>

	<div class="install">
		<CodeBlock code={install} language="sh" />
	</div>
</section>

<section class="demo-band">
	<BasicMap />
</section>

<section class="split">
	<div>
		<h2>Quick start</h2>
		<p>
			Give the container a height, point at a style, and nest what you need. Everything below the
			root reads the map from context.
		</p>
		<p class="fineprint">
			<code>maplibre-gl</code> is a peer dependency: it is the library being wrapped, so you own its version.
			Two copies in one bundle would mean two WebGL contexts.
		</p>
	</div>
	<CodeBlock code={quickStart} />
</section>

<section>
	<h2>Four decisions shape the whole API</h2>
	<ul class="principles">
		{#each principles as principle (principle.title)}
			<li>
				<h3>{principle.title}</h3>
				<p>{principle.body}</p>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2>What is in the box</h2>
	<ul class="counts">
		{#each COMPONENTS_BY_CATEGORY as category (category.id)}
			<li>
				<strong>{category.components.length}</strong>
				<span>{category.title}</span>
			</li>
		{/each}
	</ul>
	<p class="fineprint">
		The surface is derived from the official MapLibre GL JS examples rather than invented. Each
		component page lists the examples it covers.
	</p>
</section>

<style>
	section {
		max-width: 64rem;
		margin: 0 auto 4rem;
	}

	.hero {
		padding-top: 2rem;
		text-align: center;
	}

	.eyebrow {
		margin: 0 0 0.9rem;
		font-size: 0.75rem;
		font-weight: 640;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
	}

	h1 {
		font-size: clamp(2.1rem, 1.3rem + 3.4vw, 3.4rem);
		max-width: 20ch;
		margin-inline: auto;
	}

	.lede {
		max-width: 46rem;
		margin: 1.1rem auto 0;
		font-size: 1.15rem;
		color: var(--text-muted);
	}

	.cta {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.9rem;
	}

	.cta a {
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius);
		font-weight: 560;
		border: 1px solid transparent;
	}

	.cta a:hover {
		text-decoration: none;
	}

	.primary {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.primary:hover {
		filter: brightness(1.08);
	}

	.secondary {
		border-color: var(--border);
		color: var(--text);
	}

	.secondary:hover {
		border-color: var(--border-strong);
	}

	.install {
		max-width: 32rem;
		margin: 1.75rem auto 0;
		text-align: left;
	}

	.demo-band {
		margin-bottom: 4.5rem;
	}

	h2 {
		font-size: 1.4rem;
		margin-bottom: 0.6rem;
	}

	.split {
		display: grid;
		grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
	}

	.split p {
		color: var(--text-muted);
	}

	.fineprint {
		font-size: 0.9rem;
		color: var(--text-faint);
	}

	.principles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
		list-style: none;
		margin: 1.25rem 0 0;
		padding: 0;
	}

	.principles li {
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
	}

	.principles h3 {
		font-size: 1rem;
		margin-bottom: 0.4rem;
	}

	.principles p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.93rem;
	}

	.counts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 0.75rem;
		list-style: none;
		margin: 1.25rem 0 1rem;
		padding: 0;
	}

	.counts li {
		padding: 0.9rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-align: center;
	}

	.counts strong {
		display: block;
		font-size: 1.6rem;
		font-weight: 620;
		color: var(--accent);
		line-height: 1.2;
	}

	.counts span {
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	@media (max-width: 52rem) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
