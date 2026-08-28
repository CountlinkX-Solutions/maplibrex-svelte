# maplibrex-svelte

Component-oriented [MapLibre GL JS](https://maplibre.org/) bindings for Svelte 5, written in TypeScript.

You describe the map as a component tree. The library keeps that tree and the imperative MapLibre instance in sync — adding, updating in place, and tearing down in the right order.

```svelte
<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { MapLibre, NavigationControl, GeoJSONSource, CircleLayer } from 'maplibrex-svelte';

	let zoom = $state(4);
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

Two other libraries cover the same ground, both mature and both published this month:

|                                                                          | maplibre-gl                           | Svelte        | Runtime dependencies                  |
| ------------------------------------------------------------------------ | ------------------------------------- | ------------- | ------------------------------------- |
| [`svelte-maplibre`](https://www.npmjs.com/package/svelte-maplibre)       | bundled as a direct dependency (`^6`) | 5             | d3-geo, dequal, just-compare, pmtiles |
| [`svelte-maplibre-gl`](https://www.npmjs.com/package/svelte-maplibre-gl) | peer (`^5.19 \|\| ^6`)                | ≥5            | —                                     |
| this one                                                                 | peer (`^6`)                           | 5, runes only | none                                  |

**If you want something proven, use one of those two.** They have real users, real issues filed, and a track record this package does not have yet. This one is at `0.1.0`, and the API has already moved once during its first week.

It exists for a narrower set of preferences: no runtime dependencies at all, MapLibre 6 and Svelte 5 runes only, event props derived from MapLibre's own event maps rather than enumerated by hand, and updates that are surgical by default — a paint change calls one setter, and recreation happens only where MapLibre exposes no alternative.

## One Vite step you cannot skip

MapLibre v6 loads its web worker from a URL it builds at runtime:

```js
new URL(`./${workerFileName}`, import.meta.url);
```

The template is dynamic, so no bundler can trace it. Vite never copies the worker beside the bundled chunk, and in a **production build** the request 404s. The failure is quiet and easy to misdiagnose: the map loads, the canvas appears, controls work — and every source renders as empty background, because nothing parses tiles or GeoJSON.

Copy both worker files somewhere your app serves, keeping them **in the same directory** (the worker imports its sibling shared chunk by relative path), then point MapLibre at the copy before the first map is constructed:

```ts
import { setWorkerUrl } from 'maplibre-gl';

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
```

This repository does it with a small Vite plugin in `vite-plugins/maplibre-worker.ts` that reads both files out of `node_modules` at build time, so they cannot drift from the installed version. Copy it if you want the same behaviour.

Two things that look like fixes but are not: emitting only the worker with a `?url` import leaves its shared chunk missing, and a bare side-effect import of your setup module is legal to tree-shake under a narrow `sideEffects` list — export a function and call it instead.

## Requirements

|                |                                              |
| -------------- | -------------------------------------------- |
| Svelte         | 5 (runes)                                    |
| MapLibre GL JS | 6                                            |
| TypeScript     | optional, but every component is fully typed |

## Design

Four decisions shape the whole API.

**The component tree is the style tree.** A `<Layer>` nested inside a source component inherits its source id. Nesting is not decoration — it is what wires the two together, and it is what makes teardown order correct: Svelte destroys children before parents, which is exactly the order MapLibre requires when removing a layer that references a source.

**Updates are surgical, never destructive.** Changing one paint property calls `setPaintProperty` for that key alone; recreating the layer would drop its tiles and restart every transition. Changing GeoJSON data calls `setData`; recreating the source would take every dependent layer down with it. Recreation happens only where MapLibre exposes no setter — and where that is the case, it is documented on the prop.

**Every MapLibre event is a typed callback prop.** The props are derived from MapLibre's own event maps, so `onmoveend` gets a `MapLibreEvent`, `onclick` on a layer gets a `MapLayerMouseEvent`, and a new upstream event is available without a release here.

**Server rendering is safe.** Importing the library on the server is harmless; the map is only constructed inside `$effect`, which never runs there. The container renders on the server, the map attaches on the client.

## Components

### Root

| Component    | Notes                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `<MapLibre>` | Creates the map and provides context. `bind:map`, `bind:ready`, `bind:center`, `bind:zoom`, `bind:bearing`, `bind:pitch`. |

Changing `mapStyle` swaps the style in place rather than recreating the map; descendants re-add themselves once the new style has loaded.

`padding` insets the viewport, which moves the vanishing point off centre. `interactions` enables and disables gesture handlers at runtime; an omitted key is left alone, so you toggle only what you name:

```svelte
<MapLibre mapStyle={style} interactions={{ scrollZoom: false, dragRotate: allowRotation }} />
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

### Sources

`<GeoJSONSource>`, `<VectorSource>`, `<RasterSource>`, `<RasterDEMSource>`, `<ImageSource>`, `<VideoSource>`, `<CanvasSource>`, and the generic `<Source>` which takes a raw `SourceSpecification`.

### Layers

`<FillLayer>`, `<LineLayer>`, `<SymbolLayer>`, `<CircleLayer>`, `<HeatmapLayer>`, `<FillExtrusionLayer>`, `<RasterLayer>`, `<HillshadeLayer>`, `<ColorReliefLayer>`, `<BackgroundLayer>`, and the generic `<Layer>`.

`<CustomLayer>` mounts your own WebGL layer — three.js, babylon.js, or raw GL — through MapLibre's `CustomLayerInterface`.

Common props: `id`, `source` (defaults to the enclosing source), `sourceLayer`, `paint`, `layout`, `filter`, `minzoom`, `maxzoom`, `beforeId`, and `visible` as sugar over `layout.visibility`.

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

`<FeatureState>` makes hover and selection declarative. Mount it while a feature is active; unmounting clears the state, so there is no `setFeatureState` left without its matching `removeFeatureState`:

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

`npm run dev` serves a documentation site alongside the library: a page per component, generated from a single registry so a component cannot ship with a page that disagrees with it, plus nine live demos and a playground.

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
