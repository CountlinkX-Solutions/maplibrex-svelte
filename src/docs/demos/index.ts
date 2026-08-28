import type { Component } from 'svelte';
import BasicMap from './BasicMap.svelte';
import AttributionControlDemo from './AttributionControlDemo.svelte';
import BackgroundLayerDemo from './BackgroundLayerDemo.svelte';
import CanvasSourceDemo from './CanvasSourceDemo.svelte';
import ColorReliefLayerDemo from './ColorReliefLayerDemo.svelte';
import ControlDemo from './ControlDemo.svelte';
import CustomControlDemo from './CustomControlDemo.svelte';
import CustomLayerDemo from './CustomLayerDemo.svelte';
import FullscreenControlDemo from './FullscreenControlDemo.svelte';
import FillExtrusionLayerDemo from './FillExtrusionLayerDemo.svelte';
import ControlsDemo from './ControlsDemo.svelte';
import GeoJsonDemo from './GeoJsonDemo.svelte';
import HoverDemo from './HoverDemo.svelte';
import ImageDemo from './ImageDemo.svelte';
import GeolocateControlDemo from './GeolocateControlDemo.svelte';
import GlobalStateDemo from './GlobalStateDemo.svelte';
import GlobeControlDemo from './GlobeControlDemo.svelte';
import HeatmapLayerDemo from './HeatmapLayerDemo.svelte';
import ImageSourceDemo from './ImageSourceDemo.svelte';
import LayerTypeDemo from './LayerTypeDemo.svelte';
import LightDemo from './LightDemo.svelte';
import LineLayerDemo from './LineLayerDemo.svelte';
import LogoControlDemo from './LogoControlDemo.svelte';
import NavigationControlDemo from './NavigationControlDemo.svelte';
import LayerStyleDemo from './LayerStyleDemo.svelte';
import MarkerPopupDemo from './MarkerPopupDemo.svelte';
import ProjectionDemo from './ProjectionDemo.svelte';
import ProtocolDemo from './ProtocolDemo.svelte';
import RasterDEMSourceDemo from './RasterDEMSourceDemo.svelte';
import RasterSourceDemo from './RasterSourceDemo.svelte';
import ScaleControlDemo from './ScaleControlDemo.svelte';
import SourceDemo from './SourceDemo.svelte';
import TerrainControlDemo from './TerrainControlDemo.svelte';
import TerrainDemo from './TerrainDemo.svelte';
import VectorSourceDemo from './VectorSourceDemo.svelte';
import VideoSourceDemo from './VideoSourceDemo.svelte';

/**
 * Keys match `ComponentDoc.demo`. Not every component has one: a live map only
 * earns its place when seeing it beats reading the snippet.
 */
export const DEMOS: Record<string, Component> = {
	'basic-map': BasicMap,
	controls: ControlsDemo,
	geojson: GeoJsonDemo,
	hover: HoverDemo,
	image: ImageDemo,
	'layer-style': LayerStyleDemo,
	'marker-popup': MarkerPopupDemo,
	projection: ProjectionDemo,
	terrain: TerrainDemo,
	'source-raw': SourceDemo,
	'source-vector': VectorSourceDemo,
	'source-raster': RasterSourceDemo,
	'source-raster-dem': RasterDEMSourceDemo,
	'source-image': ImageSourceDemo,
	'source-video': VideoSourceDemo,
	'source-canvas': CanvasSourceDemo,
	'layer-line': LineLayerDemo,
	'layer-heatmap': HeatmapLayerDemo,
	'layer-extrusion': FillExtrusionLayerDemo,
	'layer-color-relief': ColorReliefLayerDemo,
	'layer-background': BackgroundLayerDemo,
	'layer-custom': CustomLayerDemo,
	'layer-generic': LayerTypeDemo,
	'control-navigation': NavigationControlDemo,
	'control-scale': ScaleControlDemo,
	'control-globe': GlobeControlDemo,
	'control-fullscreen': FullscreenControlDemo,
	'control-geolocate': GeolocateControlDemo,
	'control-terrain': TerrainControlDemo,
	'control-attribution': AttributionControlDemo,
	'control-logo': LogoControlDemo,
	'control-custom': CustomControlDemo,
	'control-generic': ControlDemo,
	'style-light': LightDemo,
	'style-global-state': GlobalStateDemo,
	'data-protocol': ProtocolDemo
};
