/**
 * MapLibreX — component-oriented Svelte 5 bindings for MapLibre GL JS.
 *
 * Remember to load the upstream stylesheet once in your app:
 * `import 'maplibre-gl/dist/maplibre-gl.css';`
 */

export { default as MapLibre } from './components/MapLibre.svelte';

export { default as Control } from './components/controls/Control.svelte';
export { default as CustomControl } from './components/controls/CustomControl.svelte';
export { default as AttributionControl } from './components/controls/AttributionControl.svelte';
export { default as FullscreenControl } from './components/controls/FullscreenControl.svelte';
export { default as GeolocateControl } from './components/controls/GeolocateControl.svelte';
export { default as GlobeControl } from './components/controls/GlobeControl.svelte';
export { default as LogoControl } from './components/controls/LogoControl.svelte';
export { default as NavigationControl } from './components/controls/NavigationControl.svelte';
export { default as ScaleControl } from './components/controls/ScaleControl.svelte';
export { default as TerrainControl } from './components/controls/TerrainControl.svelte';

export { default as Source } from './components/sources/Source.svelte';
export { default as GeoJSONSource } from './components/sources/GeoJSONSource.svelte';
export { default as ImageSource } from './components/sources/ImageSource.svelte';
export { default as RasterDEMSource } from './components/sources/RasterDEMSource.svelte';
export { default as RasterSource } from './components/sources/RasterSource.svelte';
export { default as VectorSource } from './components/sources/VectorSource.svelte';
export { default as CanvasSource } from './components/sources/CanvasSource.svelte';
export { default as VideoSource } from './components/sources/VideoSource.svelte';

export { default as Layer } from './components/layers/Layer.svelte';
export { default as CustomLayer } from './components/layers/CustomLayer.svelte';
export { default as BackgroundLayer } from './components/layers/BackgroundLayer.svelte';
export { default as CircleLayer } from './components/layers/CircleLayer.svelte';
export { default as ColorReliefLayer } from './components/layers/ColorReliefLayer.svelte';
export { default as FillExtrusionLayer } from './components/layers/FillExtrusionLayer.svelte';
export { default as FillLayer } from './components/layers/FillLayer.svelte';
export { default as HeatmapLayer } from './components/layers/HeatmapLayer.svelte';
export { default as HillshadeLayer } from './components/layers/HillshadeLayer.svelte';
export { default as LineLayer } from './components/layers/LineLayer.svelte';
export { default as RasterLayer } from './components/layers/RasterLayer.svelte';
export { default as SymbolLayer } from './components/layers/SymbolLayer.svelte';

export { default as Marker } from './components/overlays/Marker.svelte';
export { default as Popup } from './components/overlays/Popup.svelte';

export { default as GlobalState } from './components/style/GlobalState.svelte';
export { default as Image } from './components/style/Image.svelte';
export { default as Light } from './components/style/Light.svelte';
export { default as Projection } from './components/style/Projection.svelte';
export { default as Sky } from './components/style/Sky.svelte';
export { default as Terrain } from './components/style/Terrain.svelte';

export { default as FeatureState } from './components/data/FeatureState.svelte';
export { default as Protocol } from './components/data/Protocol.svelte';

export {
	getMapContext,
	getMarkerContext,
	getSourceContext,
	setMapContext,
	setMarkerContext,
	setSourceContext
} from './context.js';
export type { MapContext, MarkerContext, SourceContext } from './context.js';

export type { InteractionName, InteractionRequest } from './internal/interactions.js';
export type { AnySourceSpecification } from './internal/source.js';

export type {
	CameraMode,
	LayerEventProps,
	MapEventProps,
	MarkerEventProps,
	PopupEventProps
} from './types.js';

/**
 * Re-exported so consumers can type their own code without a direct dependency
 * on the underlying package.
 */
export type {
	CustomLayerInterface,
	FilterSpecification,
	LayerSpecification,
	LightSpecification,
	LngLatBoundsLike,
	LngLatLike,
	Map as MapLibreMap,
	MapOptions,
	PaddingOptions,
	ProjectionSpecification,
	SkySpecification,
	SourceSpecification,
	StyleImageMetadata,
	StyleImageSource,
	StyleSpecification,
	TerrainSpecification
} from 'maplibre-gl';
