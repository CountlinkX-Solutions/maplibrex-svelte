<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { configureMapLibreWorker } from '../docs/worker.js';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { COMPONENTS_BY_CATEGORY } from '../docs/registry.js';

	// Must run before the first map is constructed.
	configureMapLibreWorker();

	let { children }: { children: Snippet } = $props();

	// A writable derived: it seeds from what the pre-paint script already decided,
	// and the toggle below assigns over it.
	let theme = $derived<'light' | 'dark'>(
		browser ? ((document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light') : 'light'
	);
	let navOpen = $state(false);

	const showSidebar = $derived(page.url.pathname.startsWith('/docs'));

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('maplibrex-theme', theme);
		} catch {
			// A blocked storage API is not a reason to refuse the toggle.
		}
	}

	// Any navigation closes the mobile drawer; leaving it open hides the page
	// the reader just asked for.
	$effect(() => {
		void page.url.pathname;
		navOpen = false;
	});
</script>

<a class="skip" href="#content">Skip to content</a>

<header class="topbar">
	<a class="brand" href={resolve('/')}>
		<span class="mark" aria-hidden="true"></span>
		<span class="wordmark">MapLibre<b>X</b></span>
	</a>

	<nav class="topnav">
		<a href={resolve('/docs')} class:active={page.url.pathname.startsWith('/docs')}>Components</a>
		<a href={resolve('/playground')} class:active={page.url.pathname.startsWith('/playground')}>
			Playground
		</a>
	</nav>

	<div class="actions">
		<button
			type="button"
			class="icon-button"
			onclick={toggleTheme}
			aria-label="Toggle colour theme"
		>
			{theme === 'dark' ? '☀' : '☾'}
		</button>
		<a
			class="ghost-button"
			href="https://github.com/CountlinkX-Solutions/maplibrex-svelte"
			rel="noreferrer"
			target="_blank">GitHub</a
		>
		{#if showSidebar}
			<button
				type="button"
				class="icon-button drawer-toggle"
				onclick={() => (navOpen = !navOpen)}
				aria-expanded={navOpen}
				aria-label="Toggle component navigation">☰</button
			>
		{/if}
	</div>
</header>

<div class="shell" class:with-sidebar={showSidebar}>
	{#if showSidebar}
		<aside class="sidebar" class:open={navOpen}>
			<nav aria-label="Components">
				{#each COMPONENTS_BY_CATEGORY as category (category.id)}
					<p class="group-label">{category.title}</p>
					<ul>
						{#each category.components as component (component.slug)}
							<li>
								<a
									href={resolve('/docs/[slug]', { slug: component.slug })}
									class:active={page.url.pathname === `/docs/${component.slug}`}
								>
									{component.name}
								</a>
							</li>
						{/each}
					</ul>
				{/each}
			</nav>
		</aside>
	{/if}

	<main id="content">
		{@render children()}
	</main>
</div>

<footer class="sitefoot">
	<p>MapLibreX — Svelte 5 components for MapLibre GL JS. MIT licensed.</p>
</footer>

<style>
	/* Design tokens ---------------------------------------------------- */
	:global(:root) {
		--font-sans:
			ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
			sans-serif;
		--font-mono:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

		--bg: #ffffff;
		--bg-subtle: #f6f8f9;
		--bg-raised: #ffffff;
		--bg-code: #f4f6f7;
		--border: #dfe4e7;
		--border-strong: #c6ced3;
		--text: #10181c;
		--text-muted: #5a686f;
		--text-faint: #7c8991;
		--accent: #0d7c73;
		--accent-soft: #e2f2f0;
		--accent-contrast: #ffffff;
		--warn: #9a6a00;
		--warn-soft: #fdf3dd;

		--tok-str: #0a6b52;
		--tok-com: #7c8991;
		--tok-kw: #9333a8;
		--tok-tag: #1a5fb4;
		--tok-rune: #b3541e;

		--radius: 10px;
		--radius-sm: 6px;
		--shadow: 0 1px 2px rgb(16 24 28 / 6%), 0 8px 24px -12px rgb(16 24 28 / 18%);
		--topbar-height: 3.75rem;
		--sidebar-width: 16.5rem;
		--content-max: 52rem;
	}

	:global([data-theme='dark']) {
		--bg: #0d1417;
		--bg-subtle: #111a1e;
		--bg-raised: #151f24;
		--bg-code: #101a1e;
		--border: #24333a;
		--border-strong: #35474f;
		--text: #e6eef1;
		--text-muted: #9aabb3;
		--text-faint: #7d9098;
		--accent: #35c9b8;
		--accent-soft: #10312e;
		--accent-contrast: #04201d;
		--warn: #e3b341;
		--warn-soft: #2b2313;

		--tok-str: #6fd2a8;
		--tok-com: #6f838c;
		--tok-kw: #d3a0e8;
		--tok-tag: #79b8ff;
		--tok-rune: #f0a06a;

		--shadow: 0 1px 2px rgb(0 0 0 / 40%), 0 10px 28px -14px rgb(0 0 0 / 70%);
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: calc(var(--topbar-height) + 1rem);
	}

	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 16px;
		line-height: 1.65;
		-webkit-font-smoothing: antialiased;
	}

	:global(a) {
		color: var(--accent);
		text-decoration: none;
	}

	:global(a:hover) {
		text-decoration: underline;
	}

	:global(h1, h2, h3, h4) {
		line-height: 1.25;
		letter-spacing: -0.015em;
		margin: 0;
	}

	:global(code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
	}

	:global(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Chrome ----------------------------------------------------------- */
	.skip {
		position: absolute;
		left: -9999px;
	}

	.skip:focus {
		left: 1rem;
		top: 1rem;
		z-index: 100;
		background: var(--bg-raised);
		padding: 0.5rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		height: var(--topbar-height);
		padding: 0 1.25rem;
		background: color-mix(in srgb, var(--bg) 86%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--text);
		font-weight: 640;
		letter-spacing: -0.02em;
	}

	.brand:hover {
		text-decoration: none;
	}

	.mark {
		width: 1.15rem;
		height: 1.15rem;
		border-radius: 50%;
		background: radial-gradient(
			circle at 32% 30%,
			var(--accent),
			color-mix(in srgb, var(--accent) 45%, #04302c)
		);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent);
	}

	.wordmark b {
		color: var(--accent);
		font-weight: 640;
	}

	.topnav {
		display: flex;
		gap: 1.25rem;
		font-size: 0.925rem;
	}

	.topnav a {
		color: var(--text-muted);
		padding-block: 0.25rem;
		border-bottom: 2px solid transparent;
	}

	.topnav a:hover {
		color: var(--text);
		text-decoration: none;
	}

	.topnav a.active {
		color: var(--text);
		border-bottom-color: var(--accent);
	}

	.actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon-button,
	.ghost-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text-muted);
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.icon-button {
		width: 2rem;
		padding: 0;
		font-size: 0.95rem;
	}

	.icon-button:hover,
	.ghost-button:hover {
		border-color: var(--border-strong);
		color: var(--text);
		text-decoration: none;
	}

	.drawer-toggle {
		display: none;
	}

	.shell {
		max-width: 84rem;
		margin: 0 auto;
		padding: 0 1.25rem;
	}

	.shell.with-sidebar {
		display: grid;
		grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
		gap: 2.5rem;
		align-items: start;
	}

	.sidebar {
		position: sticky;
		top: var(--topbar-height);
		max-height: calc(100vh - var(--topbar-height));
		overflow-y: auto;
		padding: 2rem 0 3rem;
		font-size: 0.9rem;
	}

	.group-label {
		margin: 1.5rem 0 0.5rem;
		font-size: 0.72rem;
		font-weight: 640;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.group-label:first-child {
		margin-top: 0;
	}

	.sidebar ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.sidebar a {
		display: block;
		padding: 0.28rem 0.6rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		border-left: 2px solid transparent;
	}

	.sidebar a:hover {
		background: var(--bg-subtle);
		color: var(--text);
		text-decoration: none;
	}

	.sidebar a.active {
		background: var(--accent-soft);
		border-left-color: var(--accent);
		color: var(--accent);
		font-weight: 560;
	}

	main {
		min-width: 0;
		padding: 2.5rem 0 4rem;
	}

	.sitefoot {
		border-top: 1px solid var(--border);
		margin-top: 3rem;
		padding: 1.75rem 1.25rem;
		color: var(--text-faint);
		font-size: 0.85rem;
		text-align: center;
	}

	.sitefoot p {
		margin: 0;
	}

	@media (max-width: 62rem) {
		.shell.with-sidebar {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}

		.drawer-toggle {
			display: inline-flex;
		}

		.sidebar {
			display: none;
			position: static;
			max-height: none;
			padding-bottom: 1.5rem;
			border-bottom: 1px solid var(--border);
		}

		.sidebar.open {
			display: block;
		}

		.topnav {
			display: none;
		}
	}
</style>
