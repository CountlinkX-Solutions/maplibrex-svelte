<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Components — MapLibreX</title>
	<meta name="description" content="Every MapLibreX component, grouped by what it does." />
</svelte:head>

<article>
	<h1>Components</h1>
	<p class="summary">
		{data.total} components, grouped by what they do. Each page leads with a working snippet, then the
		props, then the parts that would otherwise cost you an afternoon.
	</p>

	{#each data.categories as category (category.id)}
		<section>
			<h2>{category.title}</h2>
			<p class="blurb">{category.blurb}</p>

			<ul class="cards">
				{#each category.components as component (component.slug)}
					<li>
						<a href={resolve('/docs/[slug]', { slug: component.slug })}>
							<strong>&lt;{component.name}&gt;</strong>
							<span>{component.summary}</span>
							{#if component.demo}<em>live demo</em>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</article>

<style>
	article {
		max-width: 64rem;
	}

	h1 {
		font-size: clamp(1.9rem, 1.4rem + 1.8vw, 2.6rem);
	}

	.summary {
		margin: 0.75rem 0 2.5rem;
		font-size: 1.1rem;
		color: var(--text-muted);
		max-width: 42rem;
	}

	section {
		margin-bottom: 2.75rem;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 0.25rem;
	}

	.blurb {
		margin: 0 0 1rem;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.cards a {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		height: 100%;
		padding: 0.9rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		color: var(--text);
	}

	.cards a:hover {
		border-color: var(--accent);
		text-decoration: none;
	}

	.cards strong {
		font-family: var(--font-mono);
		font-weight: 560;
		font-size: 0.95rem;
		color: var(--accent);
	}

	.cards span {
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.cards em {
		align-self: flex-start;
		margin-top: 0.25rem;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.66rem;
		font-style: normal;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
</style>
