<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Guides — maplibrex-svelte</title>
	<meta
		name="description"
		content="How maplibrex-svelte components behave together: switching styles, layer order, errors and fallback."
	/>
</svelte:head>

<article>
	<h1>Guides</h1>
	<p class="summary">
		How the components behave together, beyond what a single component page covers. Each guide
		starts with what you can rely on, then goes through the cases.
	</p>

	<ul class="cards">
		{#each data.guides as guide (guide.slug)}
			<li>
				<a href={resolve('/guides/[slug]', { slug: guide.slug })}>
					<strong>{guide.title}</strong>
					<span>{guide.summary}</span>
				</a>
			</li>
		{/each}
	</ul>
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
		font-weight: 600;
		font-size: 1rem;
		color: var(--accent);
	}

	.cards span {
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
