import { setWorkerUrl } from 'maplibre-gl';
import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import { MAPLIBRE_WORKER_PATH } from '../../vite-plugins/maplibre-worker-paths.js';

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

	// `asset()` adds the base path. Its type lists only files in `static/`, and
	// the worker is emitted by the plugin instead, hence the cast.
	setWorkerUrl(asset(MAPLIBRE_WORKER_PATH.slice(1) as AssetPath));
	configured = true;
}
