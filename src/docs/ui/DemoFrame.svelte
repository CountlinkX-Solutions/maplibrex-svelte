<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		caption?: string;
		/** Interactive controls shown under the map. */
		controls?: Snippet;
		children: Snippet;
	};

	let { title, caption, controls, children }: Props = $props();
</script>

<section class="demo">
	<header>
		<h3>{title}</h3>
		<span class="badge">live</span>
	</header>

	<div class="stage">{@render children()}</div>

	{#if controls}
		<div class="controls">{@render controls()}</div>
	{/if}

	{#if caption}
		<p class="caption">{caption}</p>
	{/if}
</section>

<style>
	.demo {
		margin: 1.5rem 0 2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
		box-shadow: var(--shadow);
		overflow: hidden;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	h3 {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.badge {
		margin-left: auto;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.stage {
		height: 22rem;
		background: var(--bg-subtle);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.5rem;
		padding: 0.85rem 1rem;
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.caption {
		margin: 0;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		background: var(--bg-subtle);
		color: var(--text-muted);
		font-size: 0.875rem;
	}
</style>
