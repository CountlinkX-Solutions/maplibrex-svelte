<script lang="ts">
	import { resolve } from '$app/paths';
	import Callout from '../../../docs/ui/Callout.svelte';
	import CodeBlock from '../../../docs/ui/CodeBlock.svelte';
	import PropsTable from '../../../docs/ui/PropsTable.svelte';
	import { DEMOS } from '../../../docs/demos/index.js';
	import { CATEGORIES } from '../../../docs/registry.js';

	let { data } = $props();

	const component = $derived(data.component);
	const category = $derived(CATEGORIES.find((entry) => entry.id === component.category));
	const Demo = $derived(component.demo ? DEMOS[component.demo] : undefined);
</script>

<svelte:head>
	<title>{component.name} — maplibrex-svelte</title>
	<meta name="description" content={component.summary} />
</svelte:head>

<article>
	<!-- Lead with what it does; everything below is progressive detail. -->
	<p class="eyebrow">{category?.title}</p>
	<h1>&lt;{component.name}&gt;</h1>
	<p class="summary">{component.summary}</p>

	{#if Demo}
		<Demo />
	{/if}

	<h2 id="usage">Usage</h2>
	<CodeBlock code={component.usage} />

	{#if component.bindings?.length}
		<h2 id="bindings">Two-way bindings</h2>
		<p class="lead-in">These props write back as the map changes, not only when you set them.</p>
		<ul class="pills">
			{#each component.bindings as binding (binding)}
				<li><code>bind:{binding}</code></li>
			{/each}
		</ul>
	{/if}

	<h2 id="props">Props</h2>
	<PropsTable props={component.props} />

	{#if component.notes?.length}
		<h2 id="notes">Worth knowing</h2>
		{#each component.notes as note (note)}
			<Callout>
				<p>{note}</p>
			</Callout>
		{/each}
	{/if}

	{#if component.examples?.length}
		<h2 id="examples">Official examples it covers</h2>
		<p class="lead-in">
			This component exists because these examples from the
			<a href="https://maplibre.org/maplibre-gl-js/docs/examples/" rel="noreferrer" target="_blank">
				MapLibre GL JS docs
			</a>
			need it.
		</p>
		<ul class="examples">
			{#each component.examples as example (example)}
				<li>{example}</li>
			{/each}
		</ul>
	{/if}

	<nav class="pager">
		{#if data.previous}
			<a class="prev" href={resolve('/docs/[slug]', { slug: data.previous.slug })}>
				<span>Previous</span>
				<strong>&lt;{data.previous.name}&gt;</strong>
			</a>
		{:else}
			<span></span>
		{/if}

		{#if data.next}
			<a class="next" href={resolve('/docs/[slug]', { slug: data.next.slug })}>
				<span>Next</span>
				<strong>&lt;{data.next.name}&gt;</strong>
			</a>
		{/if}
	</nav>
</article>

<style>
	article {
		max-width: var(--content-max);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: 0.72rem;
		font-weight: 640;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}

	h1 {
		font-size: clamp(1.75rem, 1.3rem + 1.6vw, 2.35rem);
		font-family: var(--font-mono);
		font-weight: 620;
	}

	.summary {
		margin: 0.75rem 0 2rem;
		font-size: 1.1rem;
		color: var(--text-muted);
		max-width: 42rem;
	}

	h2 {
		margin: 2.5rem 0 0.75rem;
		font-size: 1.15rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border);
	}

	.lead-in {
		margin: 0 0 1rem;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.pills code {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-subtle);
		color: var(--text);
	}

	.examples {
		margin: 0;
		padding-left: 1.15rem;
		color: var(--text-muted);
	}

	.examples li {
		margin-bottom: 0.25rem;
	}

	.pager {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 3.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.pager a {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		min-width: 0;
	}

	.pager a:hover {
		border-color: var(--accent);
		text-decoration: none;
	}

	.pager .next {
		text-align: right;
		margin-left: auto;
	}

	.pager span {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.pager strong {
		font-family: var(--font-mono);
		font-weight: 560;
		font-size: 0.95rem;
	}
</style>
