<script lang="ts">
	import { highlight } from '../highlight.js';

	type Props = {
		code: string;
		/** Shown in the block header. */
		language?: string;
	};

	let { code, language = 'svelte' }: Props = $props();

	const rendered = $derived(highlight(code));

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard access can be denied; the code is still selectable.
		}
	}

	$effect(() => () => clearTimeout(resetTimer));
</script>

<figure class="block">
	<figcaption>
		<span class="lang">{language}</span>
		<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
	</figcaption>
	<!--
		Safe by construction: highlight() escapes every character before wrapping
		tokens, and src/docs/highlight.test.ts asserts that markup in a snippet
		cannot survive as markup.
	-->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<pre><code>{@html rendered}</code></pre>
</figure>

<style>
	.block {
		margin: 1.25rem 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-code);
		overflow: hidden;
	}

	figcaption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.5rem 0.4rem 0.9rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--bg-subtle) 70%, transparent);
	}

	.lang {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	button {
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.78rem;
		padding: 0.15rem 0.5rem;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--border);
		color: var(--text);
	}

	pre {
		margin: 0;
		padding: 1rem 1.1rem;
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: 0.845rem;
		line-height: 1.7;
		tab-size: 2;
	}

	:global(.tok-str) {
		color: var(--tok-str);
	}

	:global(.tok-com) {
		color: var(--tok-com);
		font-style: italic;
	}

	:global(.tok-kw) {
		color: var(--tok-kw);
	}

	:global(.tok-tag) {
		color: var(--tok-tag);
	}

	:global(.tok-rune) {
		color: var(--tok-rune);
	}
</style>
