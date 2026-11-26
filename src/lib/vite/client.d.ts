/**
 * Types for the module that `maplibreWorker()` from `maplibrex-svelte/vite`
 * provides. Reference this file once, for example at the top of
 * `src/app.d.ts` in SvelteKit or `src/vite-env.d.ts` in a Vite app:
 *
 * ```ts
 * /// <reference types="maplibrex-svelte/vite/client" />
 * ```
 */
declare module 'virtual:maplibrex-svelte/worker' {
	/**
	 * The URL the app serves MapLibre's worker from, base path included, with a
	 * `?v=` query carrying the maplibre-gl version. Pass it to `setWorkerUrl`
	 * from `maplibre-gl` before the first map is created. The value is meant
	 * for the browser; MapLibre does not start a worker during server rendering.
	 */
	export const workerUrl: string;
}
