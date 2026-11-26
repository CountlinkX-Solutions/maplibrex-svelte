import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Runs the suite on whatever `svelte` and `maplibre-gl` the `peers` job in CI
 * installs over the lockfile: the lowest releases the peer ranges allow, or
 * the newest.
 *
 * SvelteKit 3 needs a newer Svelte than the library does and fails to load on
 * the floor, so this config compiles with vite-plugin-svelte alone. Nothing
 * under test imports from SvelteKit. It must not import `vite.config.ts`,
 * which loads SvelteKit. The test projects mirror the ones defined there.
 */
export default defineConfig({
	optimizeDeps: {
		exclude: ['maplibre-gl']
	},
	plugins: [
		svelte({
			// Same rule as the main config. Older Svelte releases do not accept a
			// function for `runes`, so it is applied per file here.
			dynamicCompileOptions: ({ filename }) =>
				filename.split(/[/\\]/).includes('node_modules') ? undefined : { runes: true }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: true,
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
				extends: true,
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
