# Changelog

## 0.3.0

Sources, layers and style-level state now follow the component tree reliably, and the map reports its status and its failures.

### Requirements

- `maplibre-gl` 6.10 or later (was 6.0). From 6.7 a missing WebGL context is always a thrown error, and 6.9 and 6.10 fix two MapLibre defects that broke terrain across a style change.

### Added

- `<MapLibre>` has a `status` binding (`'loading'`, `'ready'` or `'error'`), an `error` binding with the error behind an `'error'` status, and a `fallback` snippet rendered in place of the map when it cannot be created. The `MapStatus` type is exported (#2, #3).

### Fixed

- Layers are drawn in the order they are written, however and whenever they mount: late, inside `{#if}`, or inside a keyed or unkeyed `{#each}` (#1).
- Changing `mapStyle` brings back nested layers, terrain and feature state, in order (#13).
- A layer attached with `source="id"`, and `<Terrain>` and `<FeatureState>`, wait for their source, survive the source being recreated, and are removed before it. Unmounting a source and its layer together no longer leaves the source behind (#14).
- A `beforeId` naming a layer that does not exist no longer loses the layer. It is drawn on top, reported once through `onerror`, and moves below the target if a layer component adds it later. Mounting a layer never calls `moveLayer` (#8).
- A `mapStyle` change made before the first load, or after a style failed to load, reaches the map (#15).
- A browser without WebGL no longer produces an uncaught error. `onerror` is called once, or the error is written to the console when there is no handler (#2).
- `<Light>`, `<Sky>`, `<Projection>` and `<GlobalState>` wait for a usable style instead of throwing while one is loading, and on unmount they restore the current style's value, not the previous style's. `<GlobalState>` now restores at all (#22, #59).
- Each camera prop keeps its own target until the map gets there. Setting `zoom` and then `center` during an animation no longer stops at an intermediate zoom (#18).
- Props that were read once now react, including being unset: `sourceLayer`, `metadata`, `minzoom` and `maxzoom` on layers; `padding` on the map; the optional settings of `<Marker>` and `<Popup>`; the metadata of `<Image>` (#20).
- A popup that is rebuilt because a constructor-only prop changed no longer calls `onclose`, and `className` changes without a rebuild (#43).
- Unmounting `<Light>` or `<Sky>` on a style that declares no light or sky, or only part of what the component set, no longer leaves the component's values on the map. What the style does not declare goes back to MapLibre's default (#60).
- Replacing a props object spread into a component, as in `<Layer {...props} />`, with one that holds the same values no longer takes the layer out of the style and adds it again. The same goes for custom layers, sources, `<FeatureState>`, `<Image>` and controls (#61).
- `onopen` on `<Popup>` is called for the first open of a popup that starts open, and no longer for the replacement a rebuild opens in its place (#62).

### Changed

- Sources update through MapLibre's setters where one covers the change (`tiles`, `url`, image and video `coordinates`, image `url`, cluster options), so their layers stay in the style. Other changes still recreate the source (#21).
- Changing `exaggeration` on `<Terrain>` is one `setTerrain` call (#22).
- A layer, terrain or feature state waiting for a source that no component provides is reported once through `onerror` and keeps waiting. A source that mounts in a later update than a layer naming it produces one such report (#55).
- Errors while adding a source or a layer reach `onerror` instead of being thrown out of an effect.
- Setting `minzoom` alone on a layer no longer also sets `maxzoom: 24`.
- Removing or recreating a source also removes layers added by hand that use it.
- Each layer component renders an empty `<div hidden data-maplibrex="layer">` beside the map container, which is how the library reads markup order. Server rendering emits none.
- `Source`, `Layer`, `CustomLayer`, `Terrain`, `FeatureState`, `Light`, `Sky`, `Projection` and `GlobalState` must be rendered inside `<MapLibre>`. A context built by hand with `setMapContext` is no longer enough for them.

## 0.2.0

Toolchain and packaging. No component changed: everything that was in the 0.1.1 package is byte-identical in this one.

### Added

- `maplibrex-svelte/vite`: a Vite plugin that serves MapLibre's worker in development and emits it in the build, for every maplibre-gl 6 release. Import `workerUrl` from `virtual:maplibrex-svelte/worker` and pass it to `setWorkerUrl`; the URL is correct under any base path. Types come from `maplibrex-svelte/vite/client`. `vite` is an optional peer dependency (#4).

### Changed

- The `svelte` peer dependency is now `^5.16.0`. The components pass arrays to `class`, which Svelte supports from 5.16; on earlier releases the class names came out joined into one (#24).
- The `engines` field is gone. It restricted the Node version of consuming apps, which a browser library does not depend on (#24).

### Internal

- Developed and tested against maplibre-gl 6.19. The suite also runs in CI on the oldest versions the peer ranges allow, Svelte 5.16.0 and maplibre-gl 6.0.0 (#24).
- The toolchain is on SvelteKit 3 and `@sveltejs/package` 3. Consumers do not need SvelteKit 3 (#30).
- New tests reproduce the known defects in style swapping, layer order, source handling and error reporting. They are marked as expected failures until 0.3.0 fixes them (#28).
- The docs site deploys only after CI passes on `main`, and `RELEASING.md` documents how to publish (#27).

## 0.1.1

Repairs only. No public API was added, removed or renamed.

### Fixed

- `Marker`, `Popup` and `CustomControl` no longer write an inline `style` attribute, so they work under a Content-Security-Policy without `style-src 'unsafe-inline'` (#11).
- `FeatureState` removes only the keys it set, on unmount and when a key leaves `state`. Two components on the same feature, such as hover and selection, no longer clear each other (#16).
- `Popup` stays open, and `bind:open` stays `true`, when a prop that forces the popup to be rebuilt changes (#17).
- `Popup` keeps MapLibre's defaults for options left unset: a close button, closing on a map click, and focus on open. Before, a popup with no props had none of the three (#42).
- Docs site: the component sidebar renders on the published site, and URLs with a trailing slash resolve (#25).

### Changed

- `GeoJSONSource` compares `data` by reference instead of walking it. Passing a new object calls `setData` even when its content is equal; passing the same object never does. Replace `data` to update it; changing it in place does not reach the map (#9).
- Docs site URLs now end in a slash. Unslashed URLs redirect.

### Documentation

- README: a quick start that runs as pasted, `onerror`, `options` being read once at creation, move events firing before any user interaction (#6), attribution being written as HTML (#7), and the Content-Security-Policy the library works under.
- Docs site: the Vite worker step, and corrections to the Marker, BackgroundLayer, Layer and map reference pages.

## 0.1.0

First release.
