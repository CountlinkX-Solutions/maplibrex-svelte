# maplibrex-svelte

Component-oriented [MapLibre GL JS](https://maplibre.org/) bindings for Svelte 5, written in TypeScript.

**[Documentation and live demos →](https://countlinkx-solutions.github.io/maplibrex-svelte/)** — every component on its own page, with a working map you can drive.

You describe the map as a component tree. The library keeps that tree and the imperative MapLibre instance in sync — adding, updating in place, and tearing down in the right order.

```svelte
<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapLibre, NavigationControl, GeoJSONSource, CircleLayer } from 'maplibrex-svelte';

	let zoom = $state(4);

	const cities: GeoJSON.FeatureCollection = {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { name: 'Barcelona' },
				geometry: { type: 'Point', coordinates: [2.17, 41.38] }
			},
			{
				type: 'Feature',
				properties: { name: 'Madrid' },
				geometry: { type: 'Point', coordinates: [-3.7, 40.42] }
			}
		]
	};
</script>

<div style="height: 400px">
	<MapLibre mapStyle="https://demotiles.maplibre.org/style.json" center={[2.17, 41.38]} bind:zoom>
		<NavigationControl />

		<GeoJSONSource id="cities" data={cities}>
			<CircleLayer id="cities-dots" paint={{ 'circle-radius': 6, 'circle-color': '#0f766e' }} />
		</GeoJSONSource>
	</MapLibre>
</div>
```

## Install

```sh
npm install maplibrex-svelte maplibre-gl
```

`maplibre-gl` and `svelte` are peer dependencies. MapLibre is the thing being wrapped, so the consumer owns its version: two copies in one bundle would mean two WebGL contexts and two style stores.

Import the upstream stylesheet once in your app — controls, markers, and popups are unstyled without it:

```ts
import 'maplibre-gl/dist/maplibre-gl.css';
```

## Should you use this?

Two other libraries cover the same ground. Both are mature, and both had releases in November 2026, when this comparison was written:

|                                                                          | maplibre-gl                           | Svelte            | Runtime dependencies                  |
| ------------------------------------------------------------------------ | ------------------------------------- | ----------------- | ------------------------------------- |
| [`svelte-maplibre`](https://www.npmjs.com/package/svelte-maplibre)       | bundled as a direct dependency (`^6`) | 5                 | d3-geo, dequal, just-compare, pmtiles |
| [`svelte-maplibre-gl`](https://www.npmjs.com/package/svelte-maplibre-gl) | peer (`^5.19 \|\| ^6`)                | ≥5                | —                                     |
| this one                                                                 | peer (`^6`)                           | ≥5.16, runes only | none                                  |

**If you want something proven, use one of those two.** They have real users, real issues filed, and a track record this package does not have yet. This one is still at `0.1`, and the API has already moved once during its first week.

It exists for a narrower set of preferences: no runtime dependencies at all, MapLibre 6 and Svelte 5 runes only, event props derived from MapLibre's own event maps rather than enumerated by hand, and updates that are surgical by default — a paint change calls one setter, and recreation happens only where MapLibre exposes no alternative.

## One Vite step you cannot skip

MapLibre v6 loads its web worker from a URL it builds at runtime:

```js
new URL(`./${workerFileName}`, import.meta.url);
```

The template is dynamic, so no bundler can trace it. Vite never copies the worker beside the bundled chunk, and in a **production build** the request 404s. The failure is quiet and easy to misdiagnose: the map loads, the canvas appears, controls work — and every source renders as empty background, because nothing parses tiles or GeoJSON.

### With Vite (recommended)

Add the plugin from `maplibrex-svelte/vite`. It serves the worker in dev and writes it into the build, under `maplibre/` below your app's base path, reading it from the installed `maplibre-gl` so it cannot drift from it. On `maplibre-gl` 6.0 to 6.12 it also copies `maplibre-gl-shared.mjs`, which those workers import by relative path. From 6.13 the worker is self-contained and the shared file is empty, so it copies the worker alone.

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { maplibreWorker } from 'maplibrex-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [maplibreWorker(), sveltekit()]
});
```

The plugin hands the worker's URL to your app through a virtual module. Pass it to `setWorkerUrl` before the first map is created; in SvelteKit, in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { setWorkerUrl } from 'maplibre-gl';
	import { workerUrl } from 'virtual:maplibrex-svelte/worker';

	setWorkerUrl(workerUrl);

	let { children } = $props();
</script>

{@render children()}
```

`workerUrl` includes the base path, and a `?v=` query with the `maplibre-gl` version so that a browser never pairs a cached older worker with a newer bundle. For its type, reference the plugin's client types once, for example on the first line of `src/app.d.ts` (`src/vite-env.d.ts` in a plain Vite app):

```ts
/// <reference types="maplibrex-svelte/vite/client" />
```

`vite` is an optional peer dependency of this package, needed only for this entry. The plugin works with Vite 5 to 8.

### Without the plugin

Without Vite, or to do it by hand, copy `maplibre-gl-worker.mjs` from `node_modules/maplibre-gl/dist` into a directory your app serves, and copy it again whenever you upgrade `maplibre-gl`. On 6.0 to 6.12, also copy `maplibre-gl-shared.mjs` **into the same directory**: those workers import it by relative path. Then point MapLibre at the copy before the first map is constructed, with your base path in front if the app is not served from the root:

```ts
import { setWorkerUrl } from 'maplibre-gl';

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
```

Two things that look like fixes but are not: on 6.0 to 6.12, emitting only the worker with a Vite `?url` import leaves its shared chunk missing, and a bare side-effect import of your setup module is legal to tree-shake under a narrow `sideEffects` list. Call `setWorkerUrl` from code that runs, such as the root layout.

## Content-Security-Policy

Since 0.1.1 the library writes no inline `style` attributes: the elements it keeps out of sight until MapLibre takes them over use the `hidden` attribute. Its one CSS rule, which sizes the map container, is ordinary Svelte component CSS and ends up wherever your build puts component styles (a CSS file in a Vite production build).

What MapLibre itself needs, checked against `maplibre-gl` 6.6 and not yet re-checked against later releases:

| Directive           | Why                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worker-src 'self'` | The worker, served from your own origin as in the Vite step above. A worker URL on another origin makes MapLibre start it from a `blob:` URL, which needs `worker-src blob:`. |
| `img-src data:`     | `maplibre-gl.css` draws the control icons as `data:` SVG images.                                                                                                              |
| `connect-src`       | Every host your style, tiles, sprites and glyphs come from. MapLibre fetches them.                                                                                            |
| `style-src 'self'`  | `maplibre-gl.css`, served as a stylesheet. Positions MapLibre sets from script, on markers and popups, go through `element.style`, which `style-src` does not restrict.       |

Some setups need more. With `refreshExpiredTiles: false`, raster tiles load through image elements, so their hosts need `img-src`. `<VideoSource>` needs `media-src` for its video hosts.

Three things to check in your own app:

- A `style` prop on `<MapLibre>` is rendered as a `style` attribute in server-rendered HTML. Under a strict `style-src`, size the map with `class` instead.
- `vite dev` injects CSS through `<style>` elements, so test a strict policy against a production build.
- MapLibre assigns `innerHTML` in its attribution control, its scale control and the popup close button. Enforcing Trusted Types (`require-trusted-types-for 'script'`) breaks them unless you provide a default policy.

## Requirements

|                |                                              |
| -------------- | -------------------------------------------- |
| Svelte         | 5.16 or later (runes)                        |
| MapLibre GL JS | 6                                            |
| TypeScript     | optional, but every component is fully typed |
| Vite           | 5 to 8, only for `maplibrex-svelte/vite`     |

## Design

Four decisions shape the whole API.

**The component tree is the style tree.** A `<Layer>` nested inside a source component inherits its source id; one elsewhere names it with `source`, and both behave the same. The library adds a layer once its source is in the style, whenever either mounts, and takes it out before its source goes. Layers are drawn in the order they appear in the markup, including layers that mount later inside `{#if}` or `{#each}`, whatever order Svelte mounts them in. `beforeId` overrides the markup for one layer: it goes below the layer it names. If that layer is not in the style, the mistake is reported through `onerror` once and the layer is added on top, then moved below its target if a layer component adds it later.

**Updates are surgical, never destructive.** Changing one paint property calls `setPaintProperty` for that key alone; recreating the layer would drop its tiles and restart every transition. Changing GeoJSON data calls `setData`; recreating the source would take every dependent layer down with it. Recreation happens only where MapLibre exposes no setter — and where that is the case, it is documented on the prop.

**Every MapLibre event is a typed callback prop.** The props are derived from MapLibre's own event maps, so `onmoveend` gets a `MapLibreEvent`, `onclick` on a layer gets a `MapLayerMouseEvent`, and a new upstream event is available without a release here.

**Server rendering is safe.** Importing the library on the server is harmless; the map is only constructed inside `$effect`, which never runs there. The container renders on the server, the map attaches on the client.

## Components

### Root

| Component    | Notes                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `<MapLibre>` | Creates the map and provides context. `bind:map`, `bind:ready`, `bind:center`, `bind:zoom`, `bind:bearing`, `bind:pitch`. |

Changing `mapStyle` swaps the style in place rather than recreating the map. A swap drops everything added to the previous style, so once the new style is usable the library puts back every source, layer, terrain and feature state in the tree, the layers in markup order above the new style's own, and the other style components apply themselves again.

`padding` insets the viewport, which moves the vanishing point off centre. `interactions` enables and disables gesture handlers at runtime; an omitted key is left alone, so you toggle only what you name:

```svelte
<MapLibre mapStyle={style} interactions={{ scrollZoom: false, dragRotate: allowRotation }} />
```

`options` passes any other `MapOptions` to the MapLibre `Map` constructor. It is read once, when the map is created, and later changes to it have no effect. Use `bind:map` for anything you need to change at runtime.

Errors MapLibre reports while the map runs, such as a style, tile, sprite or glyph request that fails or a style that does not validate, reach `onerror` with the `Error` in `event.error`. Without a handler, MapLibre writes them to the console.

```svelte
<MapLibre mapStyle={style} onerror={(event) => reportMapError(event.error)} />
```

**Move events fire even when nobody has touched the map.** `onmovestart`, `onmove`, `onmoveend` and the matching zoom, rotate and pitch events fire for every camera change, not only for gestures, and some arrive during setup:

- MapLibre jumps to the style's own camera when the style finishes loading, if you gave no `center`, `zoom` or `bounds`. It also fires a move whenever the map container changes size.
- `<MapLibre>` moves the map when you change `padding`, and when `center`, `zoom`, `bearing` or `pitch` disagree with where the map is.
- Your own `jumpTo`, `easeTo`, `flyTo` and `fitBounds` calls fire them too.

To react only to the person using the map, check `event.originalEvent`. Moves started by a gesture (drag, scroll, pinch, keyboard, and the glide after a drag) carry the DOM event that started them. Moves made from code carry none.

```svelte
<MapLibre
	mapStyle={style}
	onmoveend={(event) => {
		if (event.originalEvent) saveView(event.target.getCenter(), event.target.getZoom());
	}}
/>
```

### Controls

`<NavigationControl>`, `<ScaleControl>`, `<GeolocateControl>`, `<FullscreenControl>`, `<AttributionControl>`, `<GlobeControl>`, `<TerrainControl>`, `<LogoControl>`.

Each takes its native options as props plus `position`, and exposes `bind:control` for imperative calls such as `control.trigger()`.

`<CustomControl>` puts your own markup in a control slot:

```svelte
<CustomControl position="top-left">
	<button type="button" onclick={() => (zoom = 4)}>Reset zoom</button>
</CustomControl>
```

`<Control>` is the generic escape hatch for any third-party `IControl`.

**Attribution is written as HTML.** MapLibre puts the `customAttribution` you give `<AttributionControl>`, and the `attribution` of every source in the style, into the page as HTML. Before it does, it removes `<script>` elements, `on…` event-handler attributes, and `href` or `src` values that contain `javascript:` or `data:`. Nothing else is removed: links to any address, remote images (which can track whoever views the map), iframes, forms and `style` attributes all reach the page. Treat a style you did not write as untrusted HTML.

MapLibre also adds an attribution control of its own to every map, whether or not you render `<AttributionControl>`. Pass `options={{ attributionControl: false }}` to turn it off, and render `<AttributionControl>` only after doing so, or the map shows two. There is no option yet to show attributions as plain text: with a style from a source you do not trust, turn the default off, leave `<AttributionControl>` out, and show the credits the data requires as ordinary Svelte text, which is escaped:

```svelte
<MapLibre mapStyle={untrustedStyle} options={{ attributionControl: false }}>
	<CustomControl position="bottom-right">
		<small>{credits}</small>
	</CustomControl>
</MapLibre>
```

### Sources

`<GeoJSONSource>`, `<VectorSource>`, `<RasterSource>`, `<RasterDEMSource>`, `<ImageSource>`, `<VideoSource>`, `<CanvasSource>`, and the generic `<Source>` which takes a raw `SourceSpecification`.

`<GeoJSONSource>` compares `data` by reference and never walks it, so a large collection costs nothing to compare. **Replace the data to update the map, do not mutate it.** A new object calls `setData`, even when it is equal to the old one. A mutation in place, such as `data.features.push(feature)` on a `$state` object, keeps the reference and never reaches the map. `$state.raw` suits data you replace, because it skips the deep proxy:

```svelte
<script lang="ts">
	let points = $state.raw(initialPoints);

	function add(feature: GeoJSON.Feature) {
		points = { ...points, features: [...points.features, feature] };
	}
</script>

<GeoJSONSource id="points" data={points}>
	<CircleLayer id="points-dots" paint={{ 'circle-radius': 6 }} />
</GeoJSONSource>
```

### Layers

`<FillLayer>`, `<LineLayer>`, `<SymbolLayer>`, `<CircleLayer>`, `<HeatmapLayer>`, `<FillExtrusionLayer>`, `<RasterLayer>`, `<HillshadeLayer>`, `<ColorReliefLayer>`, `<BackgroundLayer>`, and the generic `<Layer>`.

`<CustomLayer>` mounts your own WebGL layer — three.js, babylon.js, or raw GL — through MapLibre's `CustomLayerInterface`.

Common props: `id`, `source` (defaults to the enclosing source), `sourceLayer`, `paint`, `layout`, `filter`, `minzoom`, `maxzoom`, `beforeId`, and `visible` as sugar over `layout.visibility`.

A layer goes where it sits in the markup: below the next layer component after it, or on top of the style when there is none. `beforeId` puts it below the layer it names instead, such as a label layer of the basemap, and changing `beforeId` moves it. To read its position, each layer component renders an empty `hidden` element where it sits, next to the map container rather than inside it.

Layer-scoped events are typed:

```svelte
<CircleLayer
	id="cities-dots"
	paint={{ 'circle-radius': 6 }}
	onclick={(event) => console.log(event.features?.[0]?.properties)}
	onmouseenter={() => (cursor = 'pointer')}
/>
```

### Overlays

`<Marker>` renders the default pin. A `content` snippet replaces it with your own markup; anything else nested — a `<Popup>`, for instance — attaches to the marker and leaves the pin alone. With `draggable`, `bind:lngLat` reflects the drag.

```svelte
<Marker lngLat={position}>
	{#snippet content()}
		<div class="chip">Custom</div>
	{/snippet}
</Marker>
```

`<Popup>` works standalone with `lngLat` and `bind:open`, or nested inside a `<Marker>`, where the marker owns the open/close behaviour:

```svelte
<Marker bind:lngLat={position} draggable>
	<Popup>
		<strong>Drag me</strong>
	</Popup>
</Marker>
```

### Style state

Terrain, sky, light and projection are properties of the style rather than entries in it. These components apply them on mount and **put back what the style declared** on unmount, so mounting one inside an `{#if}` is a safe way to turn an effect on and off.

```svelte
<RasterDEMSource id="dem" tiles={[demUrl]} encoding="terrarium">
	<Terrain exaggeration={1.5} />
</RasterDEMSource>

<Sky sky-color="#001133" horizon-color="#8899aa" fog-color="#ffffff" />
<Light anchor="map" intensity={0.4} />
<Projection type="globe" />
```

`<Terrain>` inherits its source id from an enclosing `<RasterDEMSource>`, the same way layers do.

`<Image>` registers an icon for `icon-image` to reference, from a URL or from pixels you already have, and re-registers it after a style swap:

```svelte
<Image id="cat" url="/cat.png" />
<Image id="pulse" image={generatedPixels} pixelRatio={2} sdf />
<Image id="popup-bg" url="/popup.png" stretchX={[[25, 55]]} content={[25, 25, 115, 100]} />
```

`<GlobalState>` turns every prop into a global state property, readable from style expressions through `["global-state", "name"]`:

```svelte
<GlobalState labelSize={14} showBuildings={true} />
```

### Data

`<FeatureState>` makes hover and selection declarative. Mount it while a feature is active; unmounting removes the keys it set, so there is no `setFeatureState` left without its matching `removeFeatureState`. It removes only its own keys, so a hover and a selection on the same feature can be two components that come and go independently:

```svelte
<GeoJSONSource id="counties" data={counties}>
	{#if hoveredId !== null}
		<FeatureState id={hoveredId} state={{ hover: true }} />
	{/if}

	<FillLayer
		id="counties-fill"
		paint={{ 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.4] }}
		onmousemove={(event) => (hoveredId = event.features?.[0]?.id ?? null)}
		onmouseleave={() => (hoveredId = null)}
	/>
</GeoJSONSource>
```

`<Protocol>` registers a custom URL scheme — PMTiles, or a transform over an existing endpoint. MapLibre keeps protocols in a global registry, not on the map, so **place it above `<MapLibre>`**: sibling effects run in document order, and the scheme must exist before the map requests anything through it.

```svelte
<Protocol name="pmtiles" handler={pmtilesProtocol.tile} />

<MapLibre mapStyle={style}>
	<VectorSource id="tiles" url="pmtiles://https://example.com/tiles.pmtiles" />
</MapLibre>
```

## Two-way camera binding

`bind:center`, `bind:zoom`, `bind:bearing`, and `bind:pitch` are genuinely bidirectional. Panning writes back to your state; assigning to your state moves the map. The loop is broken by comparison, not by a mutex: an update that matches where the map already is does nothing. `cameraMode` picks how prop-driven moves animate — `'jump'`, `'ease'` (default), or `'fly'`.

## Escape hatches

Nothing here is a wall. `bind:map` gives you the raw `Map`; `getMapContext()` gives it to any descendant component; `<Source>`, `<Layer>`, and `<Control>` take raw MapLibre specifications and instances.

```svelte
<script lang="ts">
	import { getMapContext } from 'maplibrex-svelte';

	const context = getMapContext();

	$effect(() => {
		if (!context.ready) return;
		context.map?.setProjection({ type: 'globe' });
	});
</script>
```

## Provenance

The component surface is derived from the [official MapLibre GL JS examples](https://maplibre.org/maplibre-gl-js/docs/examples/) rather than invented. Each component exists because real examples need it:

| Component        | Examples it covers                                                                     |
| ---------------- | -------------------------------------------------------------------------------------- |
| `<Terrain>`      | 3D Terrain; quantized-mesh terrain; hybrid satellite with elevation; Sky, Fog, Terrain |
| `<Sky>`          | Sky, Fog, Terrain; globe with an atmosphere                                            |
| `<Projection>`   | the globe family — vector globe, custom layers on a globe, fill extrusion on a globe   |
| `<Light>`        | display buildings in 3D                                                                |
| `<Image>`        | add an icon; generated icon; stretchable image; remote SVG symbol; fallback image      |
| `<CanvasSource>` | add a canvas source                                                                    |
| `<CustomLayer>`  | custom style layer; three.js and babylon.js models; custom layers on a globe           |
| `<FeatureState>` | create a hover effect; get features under the mouse pointer                            |
| `<Protocol>`     | PMTiles source and protocol; addProtocol to transform feature properties               |
| `<GlobalState>`  | filter layer symbols using global state                                                |
| `padding`        | offset the vanishing point using padding                                               |
| `interactions`   | toggle interactions; disable rotation; disable scroll zoom                             |

## Documentation site

`npm run dev` serves a documentation site alongside the library: a page per component with a live demo, generated from a single hand-written registry (`src/docs/registry.ts`), plus a playground. Nothing checks the registry against the component types yet, so update it with the component.

| Route               | What it is                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| `/`                 | Overview, install, and the design decisions                                     |
| `/docs`             | Every component, grouped by what it does                                        |
| `/docs/<component>` | Live demo, usage, props, gotchas, and the official examples it covers           |
| `/playground`       | One map wired to a source, layers, feature state, overlays and controls at once |

The site lives outside `src/lib`, so none of it reaches the published package.

## Development

```sh
npm install
npm run dev          # demo app in src/routes
npm run check        # svelte-check
npm run test         # unit tests plus real-WebGL component tests
npm run lint
npm run prepack      # build the distributable and validate it with publint
```

Component tests run in headless Chromium against a real map with an inline, empty style — no mocks and no network.

## License

MIT
