import type { Component } from 'svelte';
import BasicMap from './BasicMap.svelte';
import CanvasSourceDemo from './CanvasSourceDemo.svelte';
import ControlsDemo from './ControlsDemo.svelte';
import GeoJsonDemo from './GeoJsonDemo.svelte';
import HoverDemo from './HoverDemo.svelte';
import ImageDemo from './ImageDemo.svelte';
import ImageSourceDemo from './ImageSourceDemo.svelte';
import LayerStyleDemo from './LayerStyleDemo.svelte';
import MarkerPopupDemo from './MarkerPopupDemo.svelte';
import ProjectionDemo from './ProjectionDemo.svelte';
import RasterDEMSourceDemo from './RasterDEMSourceDemo.svelte';
import RasterSourceDemo from './RasterSourceDemo.svelte';
import SourceDemo from './SourceDemo.svelte';
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
	'source-canvas': CanvasSourceDemo
};
