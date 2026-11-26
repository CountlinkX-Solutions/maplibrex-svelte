# Changelog

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
