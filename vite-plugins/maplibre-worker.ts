import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * MapLibre v6 loads its worker from a URL it builds at runtime:
 * `new URL(`./${name}`, import.meta.url)`. The template is dynamic, so no
 * bundler can trace it — Vite never copies the worker beside the bundled
 * chunk, the request 404s in a production build, and the map renders an empty
 * background because nothing parses tiles or GeoJSON.
 *
 * The worker also imports a sibling shared chunk, so emitting the worker alone
 * is not enough: both files have to land in the same directory, under stable
 * names, for the relative import between them to resolve.
 *
 * Files are read from node_modules at build time rather than vendored into the
 * repository, so they cannot drift from the installed version.
 */
const WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'] as const;

export const MAPLIBRE_WORKER_PATH = '/maplibre/maplibre-gl-worker.mjs';

export function maplibreWorker(): Plugin {
	const require = createRequire(import.meta.url);
	const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
	const read = (name: string) => readFileSync(join(distDir, name));

	let isServerBuild = false;

	return {
		name: 'maplibrex:maplibre-worker',

		configResolved(config) {
			isServerBuild = Boolean(config.build.ssr);
		},

		configureServer(server) {
			// Dev serves the same two paths, so the app code needs no branch.
			server.middlewares.use((request, response, next) => {
				const name = WORKER_FILES.find((file) => request.url?.startsWith(`/maplibre/${file}`));
				if (!name) return next();

				response.setHeader('content-type', 'text/javascript');
				response.end(read(name));
			});
		},

		generateBundle() {
			if (isServerBuild) return;

			for (const name of WORKER_FILES) {
				this.emitFile({ type: 'asset', fileName: `maplibre/${name}`, source: read(name) });
			}
		}
	};
}
