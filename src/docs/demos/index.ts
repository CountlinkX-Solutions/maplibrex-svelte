import type { Component } from 'svelte';
import BasicMap from './BasicMap.svelte';
import ControlsDemo from './ControlsDemo.svelte';
import GeoJsonDemo from './GeoJsonDemo.svelte';
import HoverDemo from './HoverDemo.svelte';
import ImageDemo from './ImageDemo.svelte';
import LayerStyleDemo from './LayerStyleDemo.svelte';
import MarkerPopupDemo from './MarkerPopupDemo.svelte';
import ProjectionDemo from './ProjectionDemo.svelte';
import TerrainDemo from './TerrainDemo.svelte';

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
	terrain: TerrainDemo
};
