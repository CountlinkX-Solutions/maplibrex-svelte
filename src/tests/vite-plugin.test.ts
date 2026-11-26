import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, createServer, type Rolldown } from 'vite';
import { maplibreWorker } from '../lib/vite/index.js';

/**
 * Runs the `maplibrex-svelte/vite` plugin inside real Vite builds and dev
 * servers, against a fake `maplibre-gl` installed in a temporary app. The two
 * fakes mirror the two layouts in the peer range: from 6.13 the worker is
 * self-contained and the shared chunk is an empty file; before 6.13 the worker
 * imports the shared chunk by relative path.
 */

const VIRTUAL_ID = 'virtual:maplibrex-svelte/worker';

type Layout = { version: string; worker: string; shared: string };

const SELF_CONTAINED: Layout = {
	version: '6.19.0',
	worker: 'self.onmessage = () => {};\n',
	shared: ''
};

const WITH_SHARED_CHUNK: Layout = {
	version: '6.12.0',
	worker: "import './maplibre-gl-shared.mjs';\n",
	shared: 'export const shared = true;\n'
};

const roots: string[] = [];

afterAll(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/**
 * A minimal app. With `importsUrl` its entry hands the worker URL to the test;
 * without it the app sets the URL by hand, as a consumer who never imports the
 * virtual module does.
 */
function createApp(layout: Layout, { importsUrl = false } = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'maplibrex-vite-'));
	roots.push(root);

	const pkg = join(root, 'node_modules', 'maplibre-gl');
	mkdirSync(join(pkg, 'dist'), { recursive: true });
	writeFileSync(
		join(pkg, 'package.json'),
		JSON.stringify({
			name: 'maplibre-gl',
			version: layout.version,
			type: 'module',
			exports: {
				'.': { import: './dist/maplibre-gl.mjs' },
				'./dist/*': './dist/*',
				'./package.json': './package.json'
			}
		})
	);
	writeFileSync(join(pkg, 'dist', 'maplibre-gl.mjs'), 'export const fake = true;\n');
	writeFileSync(join(pkg, 'dist', 'maplibre-gl-worker.mjs'), layout.worker);
	writeFileSync(join(pkg, 'dist', 'maplibre-gl-shared.mjs'), layout.shared);

	writeFileSync(
		join(root, 'entry.js'),
		importsUrl
			? `import { workerUrl } from '${VIRTUAL_ID}';\nglobalThis.workerUrl = workerUrl;\n`
			: `globalThis.workerUrl = '/maplibre/maplibre-gl-worker.mjs';\n`
	);

	return root;
}

async function buildApp(root: string, options: { base?: string; ssr?: boolean } = {}) {
	const entry = join(root, 'entry.js');
	const result = await build({
		root,
		base: options.base,
		configFile: false,
		logLevel: 'silent',
		plugins: [maplibreWorker()],
		build: {
			write: false,
			minify: false,
			ssr: options.ssr ? entry : undefined,
			rolldownOptions: { input: entry }
		}
	});

	return (Array.isArray(result) ? result[0] : (result as Rolldown.RolldownOutput)).output;
}

function emittedFiles(output: Rolldown.RolldownOutput['output']) {
	return Object.fromEntries(
		output
			.filter((file): file is Rolldown.OutputAsset => file.type === 'asset')
			.map((file) => [file.fileName, Buffer.from(file.source).toString()])
	);
}

/**
 * Evaluates the built entry as if the build output were deployed at `deployedAt`,
 * and resolves the URL it hands over against a page nested two levels deep, so
 * a URL that is only right for the root page fails.
 */
function workerUrlAsDeployed(output: Rolldown.RolldownOutput['output'], deployedAt: string) {
	const chunk = output.find((file): file is Rolldown.OutputChunk => file.type === 'chunk');
	if (!chunk) throw new Error('the build produced no chunk');

	const chunkUrl = new URL(chunk.fileName, deployedAt).href;
	const sandbox: { workerUrl?: string } = {};
	new Function('globalThis', chunk.code.replaceAll('import.meta.url', JSON.stringify(chunkUrl)))(
		sandbox
	);

	return new URL(String(sandbox.workerUrl), new URL('docs/marker/', deployedAt)).href;
}

describe('maplibreWorker() in a build', () => {
	it('emits only the worker when it is self-contained (maplibre-gl 6.13 and later)', async () => {
		const output = await buildApp(createApp(SELF_CONTAINED));

		expect(emittedFiles(output)).toEqual({
			'maplibre/maplibre-gl-worker.mjs': SELF_CONTAINED.worker
		});
	});

	it('emits the shared chunk beside a worker that imports it (before 6.13)', async () => {
		const output = await buildApp(createApp(WITH_SHARED_CHUNK));

		expect(emittedFiles(output)).toEqual({
			'maplibre/maplibre-gl-worker.mjs': WITH_SHARED_CHUNK.worker,
			'maplibre/maplibre-gl-shared.mjs': WITH_SHARED_CHUNK.shared
		});
	});

	it('emits nothing in a server build', async () => {
		const output = await buildApp(createApp(SELF_CONTAINED), { ssr: true });

		expect(emittedFiles(output)).toEqual({});
	});

	it.each([
		{ base: undefined, deployedAt: 'https://example.test/' },
		{ base: '/app/', deployedAt: 'https://example.test/app/' },
		// SvelteKit builds the client with a relative base.
		{ base: './', deployedAt: 'https://example.test/app/' }
	])('hands the app the URL of the emitted worker (base $base)', async ({ base, deployedAt }) => {
		const output = await buildApp(createApp(SELF_CONTAINED, { importsUrl: true }), { base });

		expect(workerUrlAsDeployed(output, deployedAt)).toBe(
			new URL('maplibre/maplibre-gl-worker.mjs?v=6.19.0', deployedAt).href
		);
	});
});

describe('maplibreWorker() in dev', () => {
	async function startDev(root: string, base?: string) {
		const vite = await createServer({
			root,
			base,
			configFile: false,
			logLevel: 'silent',
			appType: 'custom',
			plugins: [maplibreWorker()],
			optimizeDeps: { noDiscovery: true, include: [] },
			server: { middlewareMode: true, ws: false, watch: null }
		});
		const http = createHttpServer(vite.middlewares);
		await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
		const origin = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

		return {
			vite,
			origin,
			async close() {
				await new Promise((resolve) => http.close(resolve));
				await vite.close();
			}
		};
	}

	async function get(url: string) {
		const response = await fetch(url);
		return { status: response.status, body: await response.text() };
	}

	it.each([
		{ base: undefined, prefix: '/' },
		{ base: '/app/', prefix: '/app/' }
	])('serves the worker and its shared chunk under the base $prefix', async ({ base, prefix }) => {
		const dev = await startDev(createApp(WITH_SHARED_CHUNK), base);

		try {
			const worker = await get(`${dev.origin}${prefix}maplibre/maplibre-gl-worker.mjs?v=6.12.0`);
			const shared = await get(`${dev.origin}${prefix}maplibre/maplibre-gl-shared.mjs`);

			expect(worker).toEqual({ status: 200, body: WITH_SHARED_CHUNK.worker });
			expect(shared).toEqual({ status: 200, body: WITH_SHARED_CHUNK.shared });
		} finally {
			await dev.close();
		}
	});

	it('does not answer for a different file that shares the prefix', async () => {
		const dev = await startDev(createApp(SELF_CONTAINED));

		try {
			const sourceMap = await get(`${dev.origin}/maplibre/maplibre-gl-worker.mjs.map`);

			expect(sourceMap.status).toBe(404);
		} finally {
			await dev.close();
		}
	});

	it.each([
		{ base: undefined, prefix: '/' },
		{ base: '/app/', prefix: '/app/' }
	])('hands the app a URL the dev server answers (base $prefix)', async ({ base, prefix }) => {
		const dev = await startDev(createApp(SELF_CONTAINED, { importsUrl: true }), base);

		try {
			const { workerUrl } = (await dev.vite.ssrLoadModule(VIRTUAL_ID)) as { workerUrl: string };

			expect(workerUrl).toBe(`${prefix}maplibre/maplibre-gl-worker.mjs?v=6.19.0`);
			expect(await get(new URL(workerUrl, dev.origin).href)).toEqual({
				status: 200,
				body: SELF_CONTAINED.worker
			});
		} finally {
			await dev.close();
		}
	});
});
