import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/** The module an app imports to get the worker URL; typed by `maplibrex-svelte/vite/client`. */
const VIRTUAL_ID = 'virtual:maplibrex-svelte/worker';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** Where the files are served in dev and written in a build, below the app's base. */
const DIRECTORY = 'maplibre/';

const WORKER = 'maplibre-gl-worker.mjs';

/**
 * Before maplibre-gl 6.13 the worker imports the shared chunk by relative path,
 * so both have to sit in the same directory. From 6.13 the worker is
 * self-contained and the shared file is empty. Only files with content are
 * served and emitted, which covers both layouts.
 */
const WORKER_FILES = [WORKER, 'maplibre-gl-shared.mjs'];

type MapLibreDist = { directory: string; version: string; files: string[] };

/**
 * Resolves maplibre-gl from the app's root, so the files match the copy the
 * app bundles rather than whichever copy sits next to this package.
 */
function findMapLibre(root: string): MapLibreDist {
	let entry: string;
	try {
		entry = createRequire(join(root, 'package.json')).resolve('maplibre-gl/dist/maplibre-gl.mjs');
	} catch {
		throw new Error(`maplibrex-svelte/vite: cannot find maplibre-gl from ${root}. Install it.`);
	}

	const directory = dirname(entry);
	const { version } = JSON.parse(readFileSync(join(directory, '..', 'package.json'), 'utf8'));
	const files = WORKER_FILES.filter((name) => {
		const path = join(directory, name);
		return existsSync(path) && statSync(path).size > 0;
	});

	return { directory, version, files };
}

/**
 * Serves MapLibre's worker in dev and writes it into the build, and hands the
 * app its URL through `virtual:maplibrex-svelte/worker`.
 *
 * MapLibre 6 loads its worker from a URL it builds at run time:
 * `new URL(`./${name}`, import.meta.url)`. No bundler can trace that template,
 * so without this plugin a production build lacks the worker, the request
 * 404s, and every source renders as empty background.
 *
 * The files are read from the installed maplibre-gl, so they cannot drift from
 * it. They live under `maplibre/` below the app's base, in dev and in a build.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { maplibreWorker } from 'maplibrex-svelte/vite';
 *
 * export default defineConfig({ plugins: [maplibreWorker(), sveltekit()] });
 * ```
 *
 * ```ts
 * // In the browser, before the first map is created
 * import { setWorkerUrl } from 'maplibre-gl';
 * import { workerUrl } from 'virtual:maplibrex-svelte/worker';
 *
 * setWorkerUrl(workerUrl);
 * ```
 */
export function maplibreWorker(): Plugin {
	let config: ResolvedConfig;
	let maplibre: MapLibreDist;

	/** The emitted worker of each client build, by environment name (one unnamed build before Vite 6). */
	const emitted = new Map<string | undefined, string>();

	const read = (name: string) => readFileSync(join(maplibre.directory, name));

	return {
		name: 'maplibrex-svelte:worker',

		// Registers the dev middleware ahead of other plugins', so a framework's
		// catch-all handler never sees the request.
		enforce: 'pre',

		configResolved(resolved) {
			config = resolved;
			maplibre = findMapLibre(resolved.root);
		},

		configureServer(server) {
			// Vite's own base handling runs after this middleware, so the request
			// still carries the base. In dev `config.base` is always a path.
			const prefix = `${config.base}${DIRECTORY}`;

			server.middlewares.use((request, response, next) => {
				const path = request.url?.split('?')[0];
				const name = maplibre.files.find((file) => path === `${prefix}${file}`);
				if (!name) return next();

				response.setHeader('content-type', 'text/javascript');
				response.end(read(name));
			});
		},

		buildStart() {
			// `this.environment` exists from Vite 6; before it, one build is one environment.
			const environment = this.environment?.name;
			emitted.delete(environment);

			const server = this.environment
				? this.environment.config.consumer === 'server'
				: Boolean(config.build.ssr);
			if (config.command !== 'build' || server) return;

			for (const name of maplibre.files) {
				const reference = this.emitFile({
					type: 'asset',
					fileName: `${DIRECTORY}${name}`,
					source: read(name)
				});
				if (name === WORKER) emitted.set(environment, reference);
			}
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return;

			const reference = emitted.get(this.environment?.name);
			// In a client build, the bundler writes the emitted file's URL relative
			// to the chunk that imports it, which holds under any base, relative
			// ones included. Elsewhere (dev, or a server build where no worker runs)
			// it is the path the dev middleware answers.
			const url = reference
				? `import.meta.ROLLUP_FILE_URL_${reference}`
				: JSON.stringify(`${config.base}${DIRECTORY}${WORKER}`);

			// The file keeps its name across releases, so the version query stops a
			// browser from pairing a cached older worker with a newer main bundle.
			return `export const workerUrl = ${url} + ${JSON.stringify(`?v=${maplibre.version}`)};\n`;
		}
	};
}
