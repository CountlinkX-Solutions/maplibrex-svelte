import { setWorkerUrl } from 'maplibre-gl';
import { base } from '$app/paths';
import { MAPLIBRE_WORKER_PATH } from '../../vite-plugins/maplibre-worker.js';

let configured = false;

/**
 * Points MapLibre at the worker copied by the `maplibrex:maplibre-worker`
 * Vite plugin, which explains the whole problem. Without this the map still
 * loads and the canvas still appears, but nothing is parsed, so every source
 * renders as empty background.
 *
 * Exported as a function rather than a side-effect import on purpose: this
 * package declares a narrow `sideEffects` list, so a module imported only for
 * its side effect is legal to tree-shake, and Rollup does exactly that.
 *
 * Must run before the first map is constructed.
 */
export function configureMapLibreWorker(): void {
	if (configured) return;

	setWorkerUrl(`${base}${MAPLIBRE_WORKER_PATH}`);
	configured = true;
}
