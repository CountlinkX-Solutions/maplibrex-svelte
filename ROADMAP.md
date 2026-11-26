# Roadmap

Written on 2026-11-25 from an audit of the code at `430dcc2` (two commits after `v0.1.0`) and a review of the upstream ecosystem. Issue numbers refer to this repository.

## Where the library stands

- `0.1.0` is on npm. All 41 components have a reference page and a live demo. CI is green on MapLibre GL JS 6.6.0.
- The happy path is well tested. The paths that break are the ones with no tests: switching styles, layer order, recreating a source, and failure handling.
- The published docs site has no sidebar and never mentions the mandatory worker step.
- Upstream moved: MapLibre GL JS is at 6.19.0, SvelteKit 3 is the current major, and deck.gl has a dedicated MapLibre package.

The audit read the code and did not run it. Every defect below starts with a failing test (#28) before its fix.

## Decisions already taken

- **SvelteKit 3.** The toolchain migrates to SvelteKit 3 and `@sveltejs/package` 3 (#30). It has been the `latest` tag since 2026-10-01 and none of the bugs open against it touch packaging, prerendering or `adapter-static`.
- **deck.gl.** The integration uses `@deck.gl/maplibre` (`MapLibreOverlay`), which deck.gl now recommends for MapLibre, not `@deck.gl/mapbox` (#31).

## Order of work

Each release is a GitHub milestone with the same name. Fixes that change no public API go first, then the toolchain, then the core rework that most other fixes depend on, then features.

### 0.1.1 — Repairs that change no API

Small, independent fixes that can ship within days.

| Issue      | Work                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| #25        | Docs sidebar under the Pages base path; trailing-slash 404                                             |
| #11        | Replace inline `style="display: none"` in `Marker`, `Popup` and `CustomControl` so a strict CSP works  |
| #16        | `FeatureState` removes only its own keys on unmount                                                    |
| #17        | `Popup` stays open when a constructor-only prop changes                                                |
| #9, #19    | Compare GeoJSON `data` by reference only, and document that it must be replaced, not mutated           |
| #6, #7     | Document `moveend` during setup, and attribution being written as HTML (including the default control) |
| #26 (part) | README corrections; document `onerror`; add the worker step to the site                                |
| #10        | Ask the reporter for a minimal reproduction; the library's types accept numeric ids                    |

### 0.2.0 — Toolchain and release foundations

Nothing user-visible should change except the supported version ranges. Doing this before the core rework means that work is written and tested once, against current versions.

| Issue      | Work                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| #30        | Migrate to SvelteKit 3, `adapter-static` 4, `@sveltejs/package` 3; diff the published tarball against 0.1.0                        |
| #24        | Dev dependency to `maplibre-gl ^6.19.0`; set real peer floors for `svelte` and `maplibre-gl`; CI on the floor and on latest        |
| #4         | Publish the worker plugin as `maplibrex-svelte/vite`, correct for the self-contained worker of 6.13+ and for apps with a base path |
| #27        | Changesets, publish from CI with provenance, docs deploy gated on CI, dependency updates, labels and milestones                    |
| #28 (part) | Test helpers for style swap, layer order and error paths, used by every fix in 0.3.0                                               |

Raising the `maplibre-gl` peer floor to 6.7 or later settles half of #2: from that version a WebGL failure is always a thrown `GPUInitializationError`, never a half-built map.

### 0.3.0 — Core correctness: sources, layers and style lifecycle

The central piece is one registry in the map context that knows every declared source and layer in tree order. It adds sources before layers, re-applies everything after a style swap, and places each layer relative to its declared neighbours. Most of the serious defects are the same missing piece seen from different sides, so they should be designed together and landed as a short series of PRs.

| Issue  | Work                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1, #8 | Layer order follows the component tree, including layers that mount late; no unconditional `moveLayer`; a missing `beforeId` is reported, not silent     |
| #13    | Nested layers, terrain and feature state come back after a style swap                                                                                    |
| #14    | Layers attached with `source="..."` behave like nested ones                                                                                              |
| #15    | The style shown always converges on the current `mapStyle`                                                                                               |
| #22    | Style-level components re-read what to restore after each swap; terrain updates in place                                                                 |
| #21    | Use MapLibre's setters for tile, image and video sources; recreate only when there is no setter                                                          |
| #2, #3 | A map status (`loading`, `ready`, `failed`) and one documented error surface; fallback content when WebGL is unavailable; a failed style can be replaced |
| #18    | Two-way camera keeps each prop's latest target; re-tested against the 6.17 and 6.18 camera changes                                                       |
| #20    | Every prop is either reactive, including being unset, or documented as creation-only                                                                     |

Open design question for this release: MapLibre 6.16 added `transformStyle`, its own way to carry layers across a style change (#32). The registry should either build on it or state why it does not.

### 0.4.0 — API gaps

What the first consumer had to reach for the raw map to do.

| Issue | Work                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #5    | Reactive fit to bounds (a `<FitBounds>` component), with `absolutePadding`; `bounds` no longer undone by `center`/`zoom`                               |
| #12   | Tracking issue, split into: click with the features under the point (#33), cluster expansion (#34), readable bounds and resize (#35), box select (#36) |
| #19   | Incremental GeoJSON updates through `updateData`                                                                                                       |
| #32   | `transformStyle`, `globalState` option, `minZoom`/`maxZoom`/`maxBounds` as props, `dragRotate.around`, `zoomToUserAccuracy`, new style properties      |
| #23   | Controls keep MapLibre's default positions                                                                                                             |
| #29   | Accessible name for the map; keyboard-reachable custom markers                                                                                         |
| #7    | Optional escaped-text mode for attribution                                                                                                             |

Layer interaction helpers belong here too (#37): hover cursor, managed hover state, and typed click and hover events that carry the features. They are the most common request in the neighbouring Svelte libraries.

### 0.5.0 — Integrations

Each ships as an optional entry or package with optional peers, so the main entry stays free of them.

| Issue | Work                                                             |
| ----- | ---------------------------------------------------------------- |
| #31   | `<DeckOverlay>` on `@deck.gl/maplibre`, overlaid and interleaved |
| #38   | PMTiles helper on top of `<Protocol>` (pmtiles 4.5)              |
| #39   | terra-draw component that keeps drawings across a style swap     |
| #40   | maplibre-contour helper (0.1.1 or later)                         |
| #41   | Markers generated from GeoJSON, for many-marker cases            |

Watch, do not build yet: custom projections, `sparse` vector sources and custom-layer terrain draping, all still experimental upstream.

## Documentation and examples

This runs alongside the releases, not after them. Tracked in #26.

1. **With 0.1.1:** sidebar fix, worker step, README corrections, quick-start snippets that run as pasted.
2. **With 0.2.0:** the props tables generated from the component types, or a test that fails when the hand-written registry differs from them. A changelog page fed by the release tooling.
3. **With 0.3.0:** guides for setup with Vite and SvelteKit, SSR and prerendering, error handling, switching styles, layer ordering and updating data. A demo for each: theme switch, live data, `beforeId`, error state.
4. **With 0.4.0:** guides for clustering, strict CSP (including `setTrustedTypesPolicy`) and accessibility. Demos for cluster expansion, hover plus selection, standalone popup.
5. **With 0.5.0:** one page and demo per integration, and a migration guide from `svelte-maplibre` and `svelte-maplibre-gl`.
6. **Any time:** demo data hosted where it will not disappear, a reference for exported types, and search.

## What 1.0 means

- No open defect in the source, layer and style lifecycle.
- The suite runs on the peer floor and on the latest MapLibre, in two browser engines, and covers style swap, ordering, errors and server rendering.
- Every prop is reactive or documented as creation-only, and the reference is checked against the types.
- Releases are published from CI with a changelog.
- Context helpers that are internal today (`set*Context`) are either documented as public or removed from the exports.
