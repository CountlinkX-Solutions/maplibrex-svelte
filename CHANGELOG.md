# Changelog

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
