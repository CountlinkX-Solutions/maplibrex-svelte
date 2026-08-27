/**
 * Shared between the Vite plugin (Node) and the browser code that calls
 * `setWorkerUrl`. Kept in its own module with NO imports on purpose: pulling
 * these constants out of the plugin module dragged `node:fs` into the client
 * bundle, which Vite externalises and which then throws on first render.
 */
export const WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'] as const;

export const MAPLIBRE_WORKER_DIR = '/maplibre/';

export const MAPLIBRE_WORKER_PATH = `${MAPLIBRE_WORKER_DIR}maplibre-gl-worker.mjs`;
