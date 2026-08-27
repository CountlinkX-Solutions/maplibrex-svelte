# MapLibreX

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

`<GeoJSONSource>`, `<VectorSource>`, `<RasterSource>`, `<RasterDEMSource>`, `<ImageSource>`, `<VideoSource>`, and the generic `<Source>` which takes a raw `SourceSpecification`.

### Layers

`<FillLayer>`, `<LineLayer>`, `<SymbolLayer>`, `<CircleLayer>`, `<HeatmapLayer>`, `<FillExtrusionLayer>`, `<RasterLayer>`, `<HillshadeLayer>`, `<ColorReliefLayer>`, `<BackgroundLayer>`, and the generic `<Layer>`.

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

`<Marker>` renders the default pin, or your own markup when given children. With `draggable`, `bind:lngLat` reflects the drag.

`<Popup>` works standalone with `lngLat` and `bind:open`, or nested inside a `<Marker>`, where the marker owns the open/close behaviour:

```svelte
<Marker bind:lngLat={position} draggable>
	<Popup>
		<strong>Drag me</strong>
	</Popup>
</Marker>
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
