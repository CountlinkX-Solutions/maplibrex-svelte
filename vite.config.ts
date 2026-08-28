import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { maplibreWorker } from './vite-plugins/maplibre-worker.js';

/**
 * SvelteKit needs a leading slash and no trailing one. Validating here turns a
 * mistyped BASE_PATH in CI into a failed build rather than a deployed site with
 * every link one level off.
 */
function basePath(): '' | `/${string}` {
	const value = process.env.BASE_PATH?.replace(/\/+$/, '') ?? '';

	if (value === '') return '';
	if (!value.startsWith('/')) {
		throw new Error(`BASE_PATH must start with "/", received "${process.env.BASE_PATH}"`);
	}

	return value as `/${string}`;
}

export default defineConfig({
	// MapLibre ships its worker as a separate ESM entry that the dependency
	// optimizer cannot pre-bundle; excluding it keeps dev and test runs quiet.
	optimizeDeps: {
		exclude: ['maplibre-gl']
	},
	plugins: [
		maplibreWorker(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Every route prerenders, so the site is a folder of HTML with no server
			// behind it. The fallback gives a not-found page that still has the
			// site's own navigation instead of the host's bare 404.
			adapter: adapter({ fallback: '404.html' }),

			// GitHub Pages serves a project site under a subpath. Empty locally, so
			// `npm run dev` and `npm run preview` are unaffected.
			paths: { base: basePath() }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
