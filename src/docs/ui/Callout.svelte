<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tone?: 'note' | 'warn';
		title?: string;
		children: Snippet;
	};

	let { tone = 'note', title, children }: Props = $props();
</script>

<aside class="callout {tone}">
	{#if title}<p class="title">{title}</p>{/if}
	<div class="body">{@render children()}</div>
</aside>

<style>
	.callout {
		margin: 1.25rem 0;
		padding: 0.85rem 1rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		border-left-width: 3px;
		background: var(--bg-subtle);
		font-size: 0.925rem;
	}

	.note {
		border-left-color: var(--accent);
	}

	.warn {
		border-left-color: var(--warn);
		background: var(--warn-soft);
	}

	.title {
		margin: 0 0 0.35rem;
		font-weight: 620;
		color: var(--text);
	}

	.body {
		color: var(--text-muted);
	}

	.body :global(p) {
		margin: 0 0 0.5rem;
	}

	.body :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
