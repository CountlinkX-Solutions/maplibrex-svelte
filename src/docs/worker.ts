import { setWorkerUrl } from 'maplibre-gl';
import { workerUrl } from 'virtual:maplibrex-svelte/worker';

let configured = false;

/**
 * Points MapLibre at the worker that `maplibreWorker()` from
 * `maplibrex-svelte/vite` serves in dev and writes into the build: the setup
 * the home page recommends, used here exactly as an app would. Without it the
 * map still loads and the canvas still appears, but nothing is parsed, so
 * every source renders as empty background.
 *
 * Exported as a function rather than a side-effect import on purpose: this
 * package declares a narrow `sideEffects` list, so a module imported only for
 * its side effect is legal to tree-shake, and Rollup does exactly that.
 *
 * Must run before the first map is constructed.
 */
export function configureMapLibreWorker(): void {
	if (configured) return;

	setWorkerUrl(workerUrl);
	configured = true;
}
