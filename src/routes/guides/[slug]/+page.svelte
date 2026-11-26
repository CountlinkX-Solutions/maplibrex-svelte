<script lang="ts">
	import { resolve } from '$app/paths';
	import { GUIDE_PAGES } from '../../../docs/guides/index.js';

	let { data } = $props();

	const guide = $derived(data.guide);
	const Page = $derived(GUIDE_PAGES[guide.slug]);
</script>

<svelte:head>
	<title>{guide.title} — maplibrex-svelte</title>
	<meta name="description" content={guide.summary} />
</svelte:head>

<article>
	<p class="eyebrow">Guide</p>
	<h1>{guide.title}</h1>
	<p class="summary">{guide.summary}</p>

	<div class="prose">
		<Page />
	</div>

	<nav class="pager">
		{#if data.previous}
			<a class="prev" href={resolve('/guides/[slug]', { slug: data.previous.slug })}>
				<span>Previous</span>
				<strong>{data.previous.title}</strong>
			</a>
		{:else}
			<span></span>
		{/if}

		{#if data.next}
			<a class="next" href={resolve('/guides/[slug]', { slug: data.next.slug })}>
				<span>Next</span>
				<strong>{data.next.title}</strong>
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
		font-weight: 620;
	}

	.summary {
		margin: 0.75rem 0 2rem;
		font-size: 1.1rem;
		color: var(--text-muted);
		max-width: 42rem;
	}

	/* The guide text is a component of its own, so its elements are reached
	   through :global, scoped to this wrapper. */
	.prose :global(h2) {
		margin: 2.5rem 0 0.75rem;
		font-size: 1.15rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border);
	}

	.prose :global(h3) {
		margin: 1.75rem 0 0.5rem;
		font-size: 1rem;
	}

	.prose :global(p),
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1rem;
	}

	.prose :global(ul),
	.prose :global(ol) {
		padding-left: 1.25rem;
	}

	.prose :global(li) {
		margin-bottom: 0.35rem;
	}

	.prose :global(table) {
		width: 100%;
		margin: 0 0 1.25rem;
		border-collapse: collapse;
		font-size: 0.925rem;
	}

	.prose :global(th),
	.prose :global(td) {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	.prose :global(th) {
		color: var(--text-muted);
		font-weight: 600;
	}

	.prose :global(:not(pre) > code) {
		padding: 0.05rem 0.3rem;
		border-radius: 4px;
		background: var(--bg-code);
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
		font-weight: 560;
		font-size: 0.95rem;
	}
</style>
