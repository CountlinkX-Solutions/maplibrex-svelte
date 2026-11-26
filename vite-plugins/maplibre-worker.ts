import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { MAPLIBRE_WORKER_DIR, WORKER_FILES } from './maplibre-worker-paths.js';

/**
 * MapLibre v6 loads its worker from a URL it builds at runtime:
 * `new URL(`./${name}`, import.meta.url)`. The template is dynamic, so no
 * bundler can trace it — Vite never copies the worker beside the bundled
 * chunk, the request 404s in a production build, and the map renders an empty
 * background because nothing parses tiles or GeoJSON.
 *
 * From maplibre-gl 6.13 the worker is self-contained and
 * `maplibre-gl-shared.mjs` is an empty, deprecated file. Before 6.13 the worker
 * imports that shared chunk by relative path, so both files have to land in the
 * same directory. Only files with content are copied, which covers both
 * layouts.
 *
 * Files are read from node_modules at build time rather than vendored into the
 * repository, so they cannot drift from the installed version.
 */
export function maplibreWorker(): Plugin {
	const require = createRequire(import.meta.url);
	const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
	const files = WORKER_FILES.filter((name) => {
		const path = join(distDir, name);
		return existsSync(path) && statSync(path).size > 0;
	});
	const read = (name: string) => readFileSync(join(distDir, name));

	let isServerBuild = false;

	return {
		name: 'maplibrex:maplibre-worker',

		configResolved(config) {
			isServerBuild = Boolean(config.build.ssr);
		},

		configureServer(server) {
			// Dev serves the same paths, so the app code needs no branch.
			server.middlewares.use((request, response, next) => {
				const name = files.find((file) => request.url?.startsWith(`${MAPLIBRE_WORKER_DIR}${file}`));
				if (!name) return next();

				response.setHeader('content-type', 'text/javascript');
				response.end(read(name));
			});
		},

		generateBundle() {
			if (isServerBuild) return;

			for (const name of files) {
				this.emitFile({
					type: 'asset',
					fileName: `${MAPLIBRE_WORKER_DIR.slice(1)}${name}`,
					source: read(name)
				});
			}
		}
	};
}
