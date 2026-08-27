/**
 * The single source of truth for the documentation site.
 *
 * Component pages are generated from this data rather than hand-written, so a
 * new component cannot ship with a page that quietly disagrees with it. Lives
 * outside `src/lib` so none of it reaches the published package.
 */

export type PropDoc = {
	name: string;
	type: string;
	default?: string;
	required?: boolean;
	description: string;
};

export type CategoryId = 'map' | 'controls' | 'sources' | 'layers' | 'overlays' | 'style' | 'data';

export type ComponentDoc = {
	slug: string;
	name: string;
	category: CategoryId;
	/** One sentence, leading with what the component does. */
	summary: string;
	/** The smallest snippet that actually works. */
	usage: string;
	props: PropDoc[];
	/** Two-way bindings, listed separately because they are the non-obvious part. */
	bindings?: string[];
	/** Gotchas a reader would otherwise discover the hard way. */
	notes?: string[];
	/** Official MapLibre examples this component covers. */
	examples?: string[];
	/** Key into the live demo registry. */
	demo?: string;
};

export const CATEGORIES: Array<{ id: CategoryId; title: string; blurb: string }> = [
	{ id: 'map', title: 'Map', blurb: 'The root component every other one lives inside.' },
	{ id: 'controls', title: 'Controls', blurb: 'Buttons and widgets docked to a map corner.' },
	{ id: 'sources', title: 'Sources', blurb: 'Where the data comes from.' },
	{ id: 'layers', title: 'Layers', blurb: 'How that data is drawn.' },
	{ id: 'overlays', title: 'Overlays', blurb: 'DOM anchored to a coordinate.' },
	{
		id: 'style',
		title: 'Style state',
		blurb: 'Properties of the style rather than entries in it.'
	},
	{ id: 'data', title: 'Data', blurb: 'Feature state and custom URL schemes.' }
];

const ID_PROP: PropDoc = {
	name: 'id',
	type: 'string',
	required: true,
	description: 'Unique within the style. Changing it recreates the entity.'
};

const SOURCE_CHILDREN_PROP: PropDoc = {
	name: 'children',
	type: 'Snippet<[{ id: string }]>',
	description: 'Layers nested here inherit this source id automatically.'
};

const LAYER_PROPS: PropDoc[] = [
	ID_PROP,
	{
		name: 'source',
		type: 'string',
		description: 'Defaults to the id of the enclosing source component.'
	},
	{
		name: 'sourceLayer',
		type: 'string',
		description: 'Required for vector tile sources with more than one layer.'
	},
	{ name: 'paint', type: 'object', description: 'Paint properties, pushed key by key on change.' },
	{
		name: 'layout',
		type: 'object',
		description: 'Layout properties, pushed key by key on change.'
	},
	{ name: 'filter', type: 'FilterSpecification', description: 'Applied through setFilter.' },
	{ name: 'minzoom', type: 'number', description: 'Lower zoom bound for the layer.' },
	{ name: 'maxzoom', type: 'number', description: 'Upper zoom bound for the layer.' },
	{
		name: 'visible',
		type: 'boolean',
		default: 'true',
		description: 'Sugar over layout.visibility.'
	},
	{
		name: 'beforeId',
		type: 'string',
		description: 'Insert before this layer id. Changing it moves the layer.'
	},
	{
		name: 'on<event>',
		type: '(event) => void',
		description: 'Any layer-scoped event: onclick, onmouseenter, onmouseleave, onmousemove.'
	}
];

const CONTROL_PROPS: PropDoc[] = [
	{
		name: 'position',
		type: "'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'",
		default: "'top-right'",
		description: 'Which corner the control docks to.'
	},
	{
		name: 'control',
		type: 'Control | null',
		description: 'Read-only binding to the underlying control, for imperative calls.'
	}
];

const CONTROL_NOTE =
	'MapLibre controls take their options in the constructor and expose no setters, so changing an option recreates the control.';

function layerDoc(
	slug: string,
	name: string,
	summary: string,
	usage: string,
	extra: Partial<ComponentDoc> = {}
): ComponentDoc {
	return {
		slug,
		name,
		category: 'layers',
		summary,
		usage,
		props: LAYER_PROPS,
		notes: [
			'Paint and layout changes are pushed property by property. Recreating a layer to change one colour would drop its tiles and restart every transition.'
		],
		...extra
	};
}

export const COMPONENTS: ComponentDoc[] = [
	{
		slug: 'maplibre',
		name: 'MapLibre',
		category: 'map',
		summary:
			'Creates the map, provides context to everything below it, and keeps the camera in sync with your state.',
		usage: `<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { MapLibre, NavigationControl } from 'maplibrex-svelte';

  let zoom = $state(4);
</script>

<div style="height: 400px">
  <MapLibre
    mapStyle="https://demotiles.maplibre.org/style.json"
    center={[2.17, 41.38]}
    bind:zoom
  >
    <NavigationControl />
  </MapLibre>
</div>`,
		props: [
			{
				name: 'mapStyle',
				type: 'StyleSpecification | string',
				required: true,
				description: 'A style URL or an inline specification. Changing it swaps the style in place.'
			},
			{ name: 'center', type: 'LngLatLike', description: 'Camera centre. Two-way.' },
			{ name: 'zoom', type: 'number', description: 'Camera zoom. Two-way.' },
			{ name: 'bearing', type: 'number', description: 'Camera bearing. Two-way.' },
			{ name: 'pitch', type: 'number', description: 'Camera pitch. Two-way.' },
			{
				name: 'bounds',
				type: 'LngLatBoundsLike',
				description: 'Applied once on creation. Use map.fitBounds afterwards.'
			},
			{
				name: 'cameraMode',
				type: "'jump' | 'ease' | 'fly'",
				default: "'ease'",
				description: 'How prop-driven camera moves animate.'
			},
			{
				name: 'padding',
				type: 'PaddingOptions',
				description: 'Insets the viewport, moving the vanishing point off centre.'
			},
			{
				name: 'interactions',
				type: 'Partial<Record<InteractionName, boolean>>',
				description: 'Enables or disables gesture handlers at runtime. Omitted keys are left alone.'
			},
			{
				name: 'options',
				type: 'Partial<MapOptions>',
				description: 'Escape hatch for any MapOptions this component does not surface.'
			},
			{ name: 'class', type: 'string', description: 'Applied to the map container element.' },
			{
				name: 'style',
				type: 'string',
				description: 'Inline style for the container. Give it a height.'
			},
			{
				name: 'on<event>',
				type: '(event) => void',
				description: 'Any map event: onload, onmoveend, onclick, onerror, onstyleimagemissing.'
			}
		],
		bindings: ['map', 'ready', 'center', 'zoom', 'bearing', 'pitch'],
		notes: [
			'A map with no height renders nothing. The container fills its parent by default, so give the parent a height or pass one through style.',
			'Changing mapStyle swaps the style rather than recreating the map. Descendants re-add themselves once the replacement has loaded.',
			'Two-way camera binding terminates by comparison, not a mutex: an update that matches where the map already is does nothing.'
		],
		examples: [
			'Display a map',
			'Fly to a location',
			'Toggle interactions',
			'Restrict map panning to an area'
		],
		demo: 'basic-map'
	},

	// Controls -------------------------------------------------------------
	{
		slug: 'navigation-control',
		name: 'NavigationControl',
		category: 'controls',
		summary: 'Adds the zoom in, zoom out and compass buttons.',
		usage: `<NavigationControl position="top-right" visualizePitch />`,
		props: [
			{
				name: 'showCompass',
				type: 'boolean',
				default: 'true',
				description: 'Shows the compass button.'
			},
			{
				name: 'showZoom',
				type: 'boolean',
				default: 'true',
				description: 'Shows the zoom buttons.'
			},
			{
				name: 'visualizePitch',
				type: 'boolean',
				default: 'false',
				description: 'Tilts the compass needle to reflect pitch.'
			},
			...CONTROL_PROPS
		],
		notes: [CONTROL_NOTE],
		examples: ['Display map navigation controls'],
		demo: 'controls'
	},
	{
		slug: 'scale-control',
		name: 'ScaleControl',
		category: 'controls',
		summary: 'Shows a scale bar in metric, imperial or nautical units.',
		usage: `<ScaleControl position="bottom-left" unit="metric" maxWidth={120} />`,
		props: [
			{
				name: 'maxWidth',
				type: 'number',
				default: '100',
				description: 'Maximum bar width in pixels.'
			},
			{
				name: 'unit',
				type: "'imperial' | 'metric' | 'nautical'",
				default: "'metric'",
				description: 'Unit system for the readout.'
			},
			...CONTROL_PROPS
		],
		notes: [CONTROL_NOTE],
		demo: 'controls'
	},
	{
		slug: 'geolocate-control',
		name: 'GeolocateControl',
		category: 'controls',
		summary: 'Adds a button that centres the map on the visitor.',
		usage: `<script lang="ts">
  import { GeolocateControl } from 'maplibrex-svelte';
  import type { GeolocateControl as Control } from 'maplibre-gl';

  let control = $state<Control | null>(null);
</script>

<GeolocateControl bind:control trackUserLocation showUserHeading />

<button onclick={() => control?.trigger()}>Locate me</button>`,
		props: [
			{
				name: 'positionOptions',
				type: 'PositionOptions',
				description: 'Passed straight to the browser geolocation API.'
			},
			{
				name: 'trackUserLocation',
				type: 'boolean',
				default: 'false',
				description: 'Keeps following the visitor as they move.'
			},
			{
				name: 'showUserLocation',
				type: 'boolean',
				default: 'true',
				description: 'Draws a dot at the reported position.'
			},
			{
				name: 'showUserHeading',
				type: 'boolean',
				default: 'false',
				description: 'Draws a heading cone.'
			},
			{
				name: 'showAccuracyCircle',
				type: 'boolean',
				default: 'true',
				description: 'Draws the accuracy circle.'
			},
			...CONTROL_PROPS
		],
		notes: [
			CONTROL_NOTE,
			'Geolocation needs a secure context. On http:// the browser refuses the request before MapLibre sees it.'
		],
		examples: ['Locate the user']
	},
	{
		slug: 'fullscreen-control',
		name: 'FullscreenControl',
		category: 'controls',
		summary: 'Adds a button that takes the map fullscreen.',
		usage: `<FullscreenControl position="top-right" />`,
		props: [
			{
				name: 'container',
				type: 'HTMLElement',
				description: 'The element to expand. Defaults to the map container.'
			},
			...CONTROL_PROPS
		],
		notes: [CONTROL_NOTE],
		examples: ['View a fullscreen map']
	},
	{
		slug: 'globe-control',
		name: 'GlobeControl',
		category: 'controls',
		summary: 'Adds a button that toggles between the mercator and globe projections.',
		usage: `<GlobeControl position="top-right" />`,
		props: CONTROL_PROPS,
		notes: [CONTROL_NOTE],
		examples: ['Display a globe with a vector map'],
		demo: 'controls'
	},
	{
		slug: 'terrain-control',
		name: 'TerrainControl',
		category: 'controls',
		summary: 'Adds a button that toggles 3D terrain for a raster-dem source.',
		usage: `<TerrainControl source="dem" exaggeration={1.5} />`,
		props: [
			{ name: 'source', type: 'string', required: true, description: 'The raster-dem source id.' },
			{ name: 'exaggeration', type: 'number', default: '1', description: 'Vertical exaggeration.' },
			...CONTROL_PROPS
		],
		notes: [CONTROL_NOTE],
		examples: ['3D Terrain']
	},
	{
		slug: 'attribution-control',
		name: 'AttributionControl',
		category: 'controls',
		summary: 'Shows data attribution, which most tile providers require.',
		usage: `<AttributionControl compact customAttribution="© Your data" />`,
		props: [
			{ name: 'compact', type: 'boolean', description: 'Collapses into an expandable button.' },
			{
				name: 'customAttribution',
				type: 'string | string[]',
				description: 'Added alongside what the sources declare.'
			},
			...CONTROL_PROPS
		],
		notes: [
			CONTROL_NOTE,
			'The map adds one by default. Pass attributionControl: false through options before adding your own, or you get two.'
		],
		examples: ['Change the default position for attribution']
	},
	{
		slug: 'logo-control',
		name: 'LogoControl',
		category: 'controls',
		summary: 'Shows the MapLibre logo.',
		usage: `<LogoControl position="bottom-left" compact />`,
		props: [
			{ name: 'compact', type: 'boolean', description: 'Uses the condensed mark.' },
			...CONTROL_PROPS
		],
		notes: [CONTROL_NOTE]
	},
	{
		slug: 'custom-control',
		name: 'CustomControl',
		category: 'controls',
		summary: 'Puts your own markup in a control slot, styled like a native control.',
		usage: `<CustomControl position="top-left">
  <button type="button" onclick={() => (zoom = 4)}>Reset zoom</button>
</CustomControl>`,
		props: [
			{
				name: 'position',
				type: 'ControlPosition',
				default: "'top-right'",
				description: 'Which corner the control docks to.'
			},
			{ name: 'class', type: 'string', description: 'Added next to the maplibregl-ctrl class.' },
			{
				name: 'children',
				type: 'Snippet<[{ map: MapLibreMap }]>',
				required: true,
				description: 'Your control markup. Receives the map.'
			}
		],
		notes: [
			'The snippet is rendered into a hidden holder and MapLibre relocates that node into its control container. Svelte keeps owning it, so the content stays reactive after the move.'
		],
		demo: 'controls'
	},
	{
		slug: 'control',
		name: 'Control',
		category: 'controls',
		summary: 'Mounts any third-party IControl, for anything the typed wrappers do not cover.',
		usage: `<Control
  factory={(options) => new SomeVendorControl(options)}
  options={{ apiKey }}
  position="top-left"
/>`,
		props: [
			{
				name: 'factory',
				type: '(options) => IControl',
				required: true,
				description: 'Called once per mount. A factory, so nothing is built on the server.'
			},
			{ name: 'options', type: 'unknown', required: true, description: 'Passed to the factory.' },
			...CONTROL_PROPS
		],
		notes: [
			'Options are compared by a stable key, so key order is not treated as a change. A real change recreates the control.'
		]
	},

	// Sources --------------------------------------------------------------
	{
		slug: 'geojson-source',
		name: 'GeoJSONSource',
		category: 'sources',
		summary: 'Feeds a layer from GeoJSON, inline or from a URL, with clustering if you want it.',
		usage: `<GeoJSONSource id="cities" data={featureCollection}>
  <CircleLayer id="cities-dots" paint={{ 'circle-radius': 6 }} />
</GeoJSONSource>`,
		props: [
			ID_PROP,
			{
				name: 'data',
				type: 'GeoJSON | string',
				required: true,
				description: 'Inline GeoJSON or a URL. Changing it calls setData.'
			},
			{
				name: 'cluster',
				type: 'boolean',
				description: 'Groups nearby points into cluster features.'
			},
			{
				name: 'clusterRadius',
				type: 'number',
				default: '50',
				description: 'Cluster radius in pixels.'
			},
			{ name: 'clusterMaxZoom', type: 'number', description: 'Zoom above which clustering stops.' },
			{
				name: 'promoteId',
				type: 'string',
				description: 'Uses a property as the feature id, which feature state needs.'
			},
			{ name: 'maxzoom', type: 'number', description: 'Maximum zoom to generate tiles for.' },
			SOURCE_CHILDREN_PROP
		],
		notes: [
			'A data change calls setData and keeps the source alive. Any other change has no setter upstream and recreates the source, which takes its layers down and puts them back.',
			'Feature state needs feature ids. Set them on the features, or map a property with promoteId.'
		],
		examples: [
			'Add a GeoJSON line',
			'Draw GeoJSON points',
			'Create and style clusters',
			'Add live realtime data'
		],
		demo: 'geojson'
	},
	{
		slug: 'vector-source',
		name: 'VectorSource',
		category: 'sources',
		summary: 'Feeds layers from vector tiles, by TileJSON url or explicit tile template.',
		usage: `<VectorSource id="basemap" url="https://demotiles.maplibre.org/tiles/tiles.json">
  <LineLayer id="roads" sourceLayer="transportation" paint={{ 'line-color': '#888' }} />
</VectorSource>`,
		props: [
			ID_PROP,
			{ name: 'url', type: 'string', description: 'A TileJSON endpoint.' },
			{
				name: 'tiles',
				type: 'string[]',
				description: 'Tile URL templates, if you have no TileJSON.'
			},
			{ name: 'minzoom', type: 'number', description: 'Lowest zoom the tiles cover.' },
			{ name: 'maxzoom', type: 'number', description: 'Highest zoom the tiles cover.' },
			{ name: 'attribution', type: 'string', description: 'Shown by the attribution control.' },
			{ name: 'promoteId', type: 'string', description: 'Uses a property as the feature id.' },
			SOURCE_CHILDREN_PROP
		],
		notes: ['Layers on a vector source almost always need sourceLayer.'],
		examples: ['Add a vector tile source', 'PMTiles source and protocol']
	},
	{
		slug: 'raster-source',
		name: 'RasterSource',
		category: 'sources',
		summary: 'Feeds a raster layer from image tiles, including WMS endpoints.',
		usage: `<RasterSource
  id="satellite"
  tiles={['https://example.com/{z}/{x}/{y}.png']}
  tileSize={256}
>
  <RasterLayer id="satellite-layer" />
</RasterSource>`,
		props: [
			ID_PROP,
			{ name: 'tiles', type: 'string[]', description: 'Tile URL templates.' },
			{
				name: 'url',
				type: 'string',
				description: 'A TileJSON endpoint, as an alternative to tiles.'
			},
			{
				name: 'tileSize',
				type: 'number',
				default: '512',
				description: 'Tile edge length in pixels.'
			},
			{
				name: 'scheme',
				type: "'xyz' | 'tms'",
				default: "'xyz'",
				description: 'Tile row ordering.'
			},
			{ name: 'attribution', type: 'string', description: 'Shown by the attribution control.' },
			SOURCE_CHILDREN_PROP
		],
		examples: ['Add a raster tile source', 'Add a WMS source', 'Add a COG raster source']
	},
	{
		slug: 'raster-dem-source',
		name: 'RasterDEMSource',
		category: 'sources',
		summary: 'Feeds elevation data for terrain, hillshade and color relief.',
		usage: `<RasterDEMSource id="dem" url={terrainTileJson} encoding="terrarium">
  <Terrain exaggeration={1.5} />
  <HillshadeLayer id="hills" />
</RasterDEMSource>`,
		props: [
			ID_PROP,
			{ name: 'url', type: 'string', description: 'A TileJSON endpoint.' },
			{ name: 'tiles', type: 'string[]', description: 'Tile URL templates.' },
			{
				name: 'encoding',
				type: "'terrarium' | 'mapbox' | 'custom'",
				default: "'mapbox'",
				description:
					'How elevation is packed into the RGB channels. Getting this wrong gives you noise.'
			},
			{
				name: 'tileSize',
				type: 'number',
				default: '512',
				description: 'Tile edge length in pixels.'
			},
			SOURCE_CHILDREN_PROP
		],
		notes: ['Terrain and Hillshade nested here inherit this source id.'],
		examples: ['3D Terrain', 'Add a hillshade layer', 'Add a color relief layer']
	},
	{
		slug: 'image-source',
		name: 'ImageSource',
		category: 'sources',
		summary: 'Pins a single image to four map coordinates.',
		usage: `<ImageSource
  id="overlay"
  url="/floorplan.png"
  coordinates={[[-80.4, 25.9], [-80.3, 25.9], [-80.3, 25.8], [-80.4, 25.8]]}
>
  <RasterLayer id="overlay-layer" />
</ImageSource>`,
		props: [
			ID_PROP,
			{ name: 'url', type: 'string', required: true, description: 'The image to place.' },
			{
				name: 'coordinates',
				type: '[[number, number], [number, number], [number, number], [number, number]]',
				required: true,
				description: 'Corners in clockwise order, starting top-left.'
			},
			SOURCE_CHILDREN_PROP
		],
		examples: ['Animate a series of images']
	},
	{
		slug: 'video-source',
		name: 'VideoSource',
		category: 'sources',
		summary: 'Pins a video to four map coordinates.',
		usage: `<VideoSource
  id="clip"
  urls={['/clip.mp4', '/clip.webm']}
  coordinates={corners}
>
  <RasterLayer id="clip-layer" />
</VideoSource>`,
		props: [
			ID_PROP,
			{
				name: 'urls',
				type: 'string[]',
				required: true,
				description: 'One url per encoding, in preference order.'
			},
			{
				name: 'coordinates',
				type: 'number[][]',
				required: true,
				description: 'Corners in clockwise order, starting top-left.'
			},
			SOURCE_CHILDREN_PROP
		],
		examples: ['Add a video']
	},
	{
		slug: 'canvas-source',
		name: 'CanvasSource',
		category: 'sources',
		summary: 'Pins a live canvas to four map coordinates, redrawn as you paint into it.',
		usage: `<CanvasSource id="paint" canvas={canvasElement} coordinates={corners} animate>
  <RasterLayer id="paint-layer" />
</CanvasSource>`,
		props: [
			ID_PROP,
			{
				name: 'canvas',
				type: 'string | HTMLCanvasElement',
				required: true,
				description: 'The canvas element, or its DOM id.'
			},
			{
				name: 'coordinates',
				type: 'number[][]',
				required: true,
				description: 'Corners in clockwise order, starting top-left.'
			},
			{
				name: 'animate',
				type: 'boolean',
				default: 'true',
				description: 'Re-reads the canvas every frame. Turn it off for a static drawing.'
			},
			SOURCE_CHILDREN_PROP
		],
		examples: ['Add a canvas source']
	},
	{
		slug: 'source',
		name: 'Source',
		category: 'sources',
		summary: 'Takes a raw source specification, for anything the typed wrappers do not cover.',
		usage: `<Source id="custom" spec={{ type: 'geojson', data: featureCollection }}>
  <CircleLayer id="custom-dots" />
</Source>`,
		props: [
			ID_PROP,
			{
				name: 'spec',
				type: 'SourceSpecification | CanvasSourceSpecification',
				required: true,
				description: 'The raw specification handed to addSource.'
			},
			SOURCE_CHILDREN_PROP
		],
		notes: [
			'This is what every typed source wrapper delegates to, so the update behaviour is identical.'
		]
	},

	// Layers ---------------------------------------------------------------
	layerDoc(
		'fill-layer',
		'FillLayer',
		'Fills polygons with a colour, pattern or data-driven expression.',
		`<FillLayer
  id="districts"
  paint={{ 'fill-color': ['get', 'colour'], 'fill-opacity': 0.6 }}
/>`,
		{
			examples: [
				'Add a GeoJSON polygon',
				'Add a pattern to a polygon',
				'Visualize population density'
			],
			demo: 'layer-style'
		}
	),
	layerDoc(
		'line-layer',
		'LineLayer',
		'Draws lines, with width, dash and gradient driven by data or zoom.',
		`<LineLayer
  id="routes"
  layout={{ 'line-cap': 'round' }}
  paint={{ 'line-color': '#0f766e', 'line-width': 3 }}
/>`,
		{
			examples: [
				'Add a GeoJSON line',
				'Style lines with a data-driven property',
				'Create a gradient line using an expression'
			]
		}
	),
	layerDoc(
		'circle-layer',
		'CircleLayer',
		'Draws points as circles, the fastest way to put data on a map.',
		`<CircleLayer
  id="cities"
  paint={{ 'circle-radius': 6, 'circle-color': '#0f766e', 'circle-stroke-width': 2 }}
/>`,
		{ examples: ['Draw GeoJSON points', 'Create and style clusters'], demo: 'geojson' }
	),
	layerDoc(
		'symbol-layer',
		'SymbolLayer',
		'Draws icons and text labels, with collision handling.',
		`<SymbolLayer
  id="labels"
  layout={{ 'icon-image': 'marker', 'text-field': ['get', 'name'], 'text-offset': [0, 1.2] }}
/>`,
		{
			notes: [
				'Paint and layout changes are pushed property by property.',
				'icon-image refers to an image registered with the Image component or shipped in the style sprite.',
				'text-field needs the style to declare glyphs, or nothing renders.'
			],
			examples: [
				'Add an icon to the map',
				'Variable label placement',
				'Filter symbols by text input'
			],
			demo: 'image'
		}
	),
	layerDoc(
		'heatmap-layer',
		'HeatmapLayer',
		'Renders point density as a heat surface.',
		`<HeatmapLayer
  id="density"
  paint={{ 'heatmap-radius': 20, 'heatmap-intensity': 1 }}
/>`,
		{
			examples: [
				'Create a heatmap layer',
				'Create a Heatmap layer on a globe with terrain elevation'
			]
		}
	),
	layerDoc(
		'fill-extrusion-layer',
		'FillExtrusionLayer',
		'Extrudes polygons into 3D volumes, the usual way to show buildings.',
		`<FillExtrusionLayer
  id="buildings"
  paint={{
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-opacity': 0.8
  }}
/>`,
		{
			examples: [
				'Display buildings in 3D',
				'Extrude polygons for 3D indoor mapping',
				'Fill extrusion rounded corners'
			]
		}
	),
	layerDoc(
		'raster-layer',
		'RasterLayer',
		'Draws a raster, image, video or canvas source.',
		`<RasterLayer id="satellite" paint={{ 'raster-opacity': 0.8 }} />`,
		{ examples: ['Display a satellite map', 'Add a WMS source'] }
	),
	layerDoc(
		'hillshade-layer',
		'HillshadeLayer',
		'Shades terrain from a raster-dem source to show relief.',
		`<RasterDEMSource id="dem" url={terrainTileJson} encoding="terrarium">
  <HillshadeLayer id="hills" paint={{ 'hillshade-exaggeration': 0.6 }} />
</RasterDEMSource>`,
		{ examples: ['Add a hillshade layer', 'Add a multidirectional hillshade layer'] }
	),
	layerDoc(
		'color-relief-layer',
		'ColorReliefLayer',
		'Colours terrain by elevation from a raster-dem source.',
		`<ColorReliefLayer
  id="relief"
  paint={{ 'color-relief-color': ['interpolate', ['linear'], ['elevation'], 0, '#0a0', 3000, '#fff'] }}
/>`,
		{ examples: ['Add a color relief layer'] }
	),
	layerDoc(
		'background-layer',
		'BackgroundLayer',
		'Paints the area behind every other layer. The only layer with no source.',
		`<BackgroundLayer id="bg" paint={{ 'background-color': '#0b1220' }} />`,
		{
			props: LAYER_PROPS.filter((prop) => !['source', 'sourceLayer'].includes(prop.name)),
			notes: [
				'The only layer type that needs no source, so it is also the only one you can mount as a direct child of the map.'
			]
		}
	),
	{
		slug: 'custom-layer',
		name: 'CustomLayer',
		category: 'layers',
		summary: 'Mounts your own WebGL layer — three.js, babylon.js, or raw GL.',
		usage: `<script lang="ts">
  import type { CustomLayerInterface } from 'maplibrex-svelte';

  const layer: CustomLayerInterface = {
    id: 'my-gl-layer',
    type: 'custom',
    onAdd(map, gl) { /* build your scene */ },
    render(gl, args) { /* draw a frame */ }
  };
</script>

<CustomLayer {layer} beforeId="labels" />`,
		props: [
			{
				name: 'layer',
				type: 'CustomLayerInterface',
				required: true,
				description: 'Your layer. MapLibre calls its onAdd, render and onRemove hooks.'
			},
			{ name: 'beforeId', type: 'string', description: 'Insert before this layer id.' }
		],
		notes: [
			'MapLibre owns the rendering hooks; this component owns when the layer is in the style, including re-adding it after a style swap.'
		],
		examples: [
			'Add a custom style layer',
			'Add a 3D model using three.js',
			'Add a simple custom layer on a globe'
		]
	},
	{
		slug: 'layer',
		name: 'Layer',
		category: 'layers',
		summary: 'Takes a layer type as a prop, for generated or dynamic layer stacks.',
		usage: `<Layer id="generated" type={layerType} paint={paintForType} />`,
		props: [
			{
				name: 'type',
				type: "LayerSpecification['type']",
				required: true,
				description: 'Which kind of layer to create.'
			},
			...LAYER_PROPS
		],
		notes: [
			'This is what every typed layer wrapper delegates to. Prefer the typed wrappers: they narrow paint and layout to the properties that layer type actually has.'
		]
	},

	// Overlays -------------------------------------------------------------
	{
		slug: 'marker',
		name: 'Marker',
		category: 'overlays',
		summary: 'Anchors a pin, or your own markup, to a coordinate.',
		usage: `<Marker bind:lngLat={position} draggable color="#b91c1c">
  <Popup>
    <strong>Drag me</strong>
  </Popup>
</Marker>`,
		props: [
			{
				name: 'lngLat',
				type: 'LngLatLike',
				required: true,
				description: 'Where the marker sits. Two-way.'
			},
			{
				name: 'draggable',
				type: 'boolean',
				default: 'false',
				description: 'Lets the visitor move it.'
			},
			{
				name: 'color',
				type: 'string',
				description: 'Fill of the default pin. Ignored with children.'
			},
			{ name: 'scale', type: 'number', default: '1', description: 'Size of the default pin.' },
			{
				name: 'anchor',
				type: 'PositionAnchor',
				default: "'center'",
				description: 'Which part sits on the point.'
			},
			{ name: 'offset', type: 'PointLike', description: 'Pixel offset from the anchor.' },
			{ name: 'rotation', type: 'number', description: 'Rotation in degrees.' },
			{ name: 'opacity', type: 'string | number', description: 'Marker opacity.' },
			{
				name: 'children',
				type: 'Snippet<[{ marker: Marker }]>',
				description: 'Replaces the default pin with your own markup.'
			},
			{
				name: 'on<event>',
				type: '(event) => void',
				description: 'onclick, ondragstart, ondrag, ondragend.'
			}
		],
		bindings: ['lngLat', 'marker'],
		notes: [
			'With draggable, bind:lngLat reflects the drag as it happens.',
			'Markers are DOM, not WebGL. Hundreds are fine; thousands are not — use a CircleLayer or SymbolLayer instead.'
		],
		examples: [
			'Add a default marker',
			'Add custom icons with Markers',
			'Create a draggable Marker'
		],
		demo: 'marker-popup'
	},
	{
		slug: 'popup',
		name: 'Popup',
		category: 'overlays',
		summary: 'Shows a bubble at a coordinate, or attached to a marker.',
		usage: `<!-- Attached to a marker: the marker owns opening and closing -->
<Marker lngLat={position}>
  <Popup>
    <strong>Hello</strong>
  </Popup>
</Marker>

<!-- Standalone: you own it -->
<Popup lngLat={position} bind:open>
  <strong>Hello</strong>
</Popup>`,
		props: [
			{
				name: 'lngLat',
				type: 'LngLatLike',
				description: 'Where the popup anchors. Ignored inside a Marker.'
			},
			{
				name: 'open',
				type: 'boolean',
				default: 'false',
				description: 'Opens and closes it. Two-way.'
			},
			{
				name: 'closeButton',
				type: 'boolean',
				default: 'true',
				description: 'Shows the close button.'
			},
			{
				name: 'closeOnClick',
				type: 'boolean',
				default: 'true',
				description: 'Closes on a map click.'
			},
			{
				name: 'closeOnMove',
				type: 'boolean',
				default: 'false',
				description: 'Closes when the map moves.'
			},
			{
				name: 'anchor',
				type: 'PositionAnchor',
				description: 'Which edge points at the coordinate.'
			},
			{ name: 'offset', type: 'Offset', description: 'Pixel offset from the anchor.' },
			{
				name: 'maxWidth',
				type: 'string',
				default: "'240px'",
				description: 'CSS max-width of the bubble.'
			},
			{ name: 'children', type: 'Snippet<[{ popup: Popup }]>', description: 'The popup content.' },
			{ name: 'on<event>', type: '(event) => void', description: 'onopen, onclose.' }
		],
		bindings: ['open', 'popup'],
		notes: [
			'Nested inside a Marker, the marker handles open and close on click. Standalone, the open prop drives it.',
			'bind:open stays truthful after a close button click or a closeOnClick, because the popup reports its own state back.'
		],
		examples: [
			'Display a popup',
			'Display a popup on click',
			'Attach a popup to a marker instance'
		],
		demo: 'marker-popup'
	},

	// Style state ----------------------------------------------------------
	{
		slug: 'terrain',
		name: 'Terrain',
		category: 'style',
		summary: 'Turns a raster-dem source into 3D terrain.',
		usage: `<RasterDEMSource id="dem" url={terrainTileJson} encoding="terrarium">
  <Terrain exaggeration={1.5} />
</RasterDEMSource>`,
		props: [
			{
				name: 'source',
				type: 'string',
				description: 'A raster-dem source id. Defaults to the enclosing source component.'
			},
			{ name: 'exaggeration', type: 'number', default: '1', description: 'Vertical exaggeration.' }
		],
		notes: [
			'Unmounting restores whatever the style itself declared, so mounting this inside an {#if} is a safe on/off switch.',
			'Terrain needs pitch to be visible. A flat top-down map looks identical with it on or off.'
		],
		examples: ['3D Terrain', 'Add 3D terrain from quantized-mesh tiles', 'Sky, Fog, Terrain'],
		demo: 'terrain'
	},
	{
		slug: 'sky',
		name: 'Sky',
		category: 'style',
		summary: 'Paints the sky and fog above the horizon.',
		usage: `<Sky
  sky-color="#001133"
  horizon-color="#8899aa"
  fog-color="#ffffff"
  fog-ground-blend={0.5}
/>`,
		props: [
			{
				name: 'sky-color',
				type: 'ColorSpecification',
				description: 'Colour at the top of the sky.'
			},
			{ name: 'horizon-color', type: 'ColorSpecification', description: 'Colour at the horizon.' },
			{ name: 'fog-color', type: 'ColorSpecification', description: 'Colour of the ground fog.' },
			{
				name: 'fog-ground-blend',
				type: 'number',
				description: 'Where the fog starts, from the camera.'
			},
			{ name: 'horizon-fog-blend', type: 'number', description: 'Blend between horizon and fog.' },
			{ name: 'sky-horizon-blend', type: 'number', description: 'Blend between sky and horizon.' },
			{
				name: 'atmosphere-blend',
				type: 'number',
				description: 'Atmosphere strength on the globe projection.'
			}
		],
		notes: [
			'Unmounting restores what the style declared.',
			'Like terrain, the sky is only visible with pitch. Straight down, there is no horizon to paint.'
		],
		examples: ['Sky, Fog, Terrain', 'Display a globe with an atmosphere'],
		demo: 'terrain'
	},
	{
		slug: 'light',
		name: 'Light',
		category: 'style',
		summary: 'Sets the light that shades extrusions and hillshade.',
		usage: `<Light anchor="map" position={[1.5, 90, 80]} color="#ffffff" intensity={0.4} />`,
		props: [
			{
				name: 'anchor',
				type: "'map' | 'viewport'",
				default: "'viewport'",
				description: 'Whether the light rotates with the map or stays put on screen.'
			},
			{
				name: 'position',
				type: '[radial, azimuthal, polar]',
				description: 'Light position in spherical coordinates.'
			},
			{
				name: 'color',
				type: 'ColorSpecification',
				default: "'#ffffff'",
				description: 'Light colour.'
			},
			{ name: 'intensity', type: 'number', default: '0.5', description: 'Light strength, 0 to 1.' }
		],
		notes: [
			'Unmounting restores what the style declared.',
			'Only visible on layers that respond to light: fill-extrusion and hillshade.'
		],
		examples: ['Display buildings in 3D']
	},
	{
		slug: 'projection',
		name: 'Projection',
		category: 'style',
		summary: 'Switches the map between the mercator plane and a globe.',
		usage: `<Projection type="globe" />`,
		props: [
			{
				name: 'type',
				type: "'mercator' | 'globe' | expression",
				description: 'The projection. An expression can interpolate by zoom.'
			}
		],
		notes: [
			'Unmounting restores what the style declared. A style that declares no projection reports none, and that absence is what comes back.',
			'For a visitor-facing toggle, GlobeControl does the same thing as a button.'
		],
		examples: ['Display a globe with a vector map', 'Zoom and planet size relation on globe'],
		demo: 'projection'
	},
	{
		slug: 'image',
		name: 'Image',
		category: 'style',
		summary: 'Registers an icon that symbol layers reference through icon-image.',
		usage: `<!-- From a URL -->
<Image id="cat" url="/cat.png" />

<!-- From pixels you already have -->
<Image id="pulse" image={generatedImageData} pixelRatio={2} sdf />

<!-- Stretchable, for label backgrounds -->
<Image id="popup-bg" url="/popup.png" stretchX={[[25, 55]]} content={[25, 25, 115, 100]} />`,
		props: [
			{ name: 'id', type: 'string', required: true, description: 'The name icon-image refers to.' },
			{
				name: 'url',
				type: 'string',
				description: 'Loaded with map.loadImage. Give this or image, not both.'
			},
			{
				name: 'image',
				type: 'StyleImageSource',
				description: 'An already-decoded image: canvas output, generated pixels, an SVG blob.'
			},
			{
				name: 'pixelRatio',
				type: 'number',
				default: '1',
				description: 'Device pixels per image pixel.'
			},
			{
				name: 'sdf',
				type: 'boolean',
				default: 'false',
				description: 'Treats it as a signed distance field, so icon-color applies.'
			},
			{
				name: 'stretchX',
				type: '[number, number][]',
				description: 'Horizontal regions that may stretch.'
			},
			{
				name: 'stretchY',
				type: '[number, number][]',
				description: 'Vertical regions that may stretch.'
			},
			{
				name: 'content',
				type: '[number, number, number, number]',
				description: 'The box that text is placed inside.'
			},
			{
				name: 'onerror',
				type: '(error) => void',
				description: 'Called when url fails, instead of failing silently.'
			}
		],
		notes: [
			'Re-registers itself after a style swap, since a swap drops registered images along with everything else.',
			'Updates rather than re-adds when the id is already taken: addImage throws on a duplicate.'
		],
		examples: [
			'Add an icon to the map',
			'Add a generated icon to the map',
			'Add a stretchable image to the map'
		],
		demo: 'image'
	},
	{
		slug: 'global-state',
		name: 'GlobalState',
		category: 'style',
		summary: 'Turns every prop into a global state property readable from style expressions.',
		usage: `<GlobalState labelSize={14} showBuildings={true} />

<!-- read it in any expression -->
<SymbolLayer id="labels" layout={{ 'text-size': ['global-state', 'labelSize'] }} />`,
		props: [
			{
				name: '<any>',
				type: 'unknown',
				description: 'Each prop becomes one property, reachable as ["global-state", "<name>"].'
			}
		],
		notes: [
			'Values are pushed by diff, so changing one property does not touch the others.',
			'Unmounting puts the style’s own values back.'
		],
		examples: ['Filter layer symbols using global state']
	},

	// Data -----------------------------------------------------------------
	{
		slug: 'feature-state',
		name: 'FeatureState',
		category: 'data',
		summary: 'Makes hover and selection declarative: mount it while a feature is active.',
		usage: `<GeoJSONSource id="counties" data={counties}>
  {#if hoveredId !== null}
    <FeatureState id={hoveredId} state={{ hover: true }} />
  {/if}

  <FillLayer
    id="counties-fill"
    paint={{
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.4]
    }}
    onmousemove={(event) => (hoveredId = event.features?.[0]?.id ?? null)}
    onmouseleave={() => (hoveredId = null)}
  />
</GeoJSONSource>`,
		props: [
			{
				name: 'id',
				type: 'string | number',
				required: true,
				description: 'The feature id. Vector features need promoteId if their id is a property.'
			},
			{
				name: 'source',
				type: 'string',
				description: 'Defaults to the id of the enclosing source component.'
			},
			{
				name: 'sourceLayer',
				type: 'string',
				description: 'Required for multi-layer vector sources.'
			},
			{
				name: 'state',
				type: 'Record<string, unknown>',
				required: true,
				description: 'Read from expressions through ["feature-state", key].'
			}
		],
		notes: [
			'Unmounting clears the state, so there is never a setFeatureState left without its matching removeFeatureState.',
			'Features need ids. GeoJSON features can carry an id directly, or map a property with promoteId on the source.'
		],
		examples: ['Create a hover effect', 'Get features under the mouse pointer'],
		demo: 'hover'
	},
	{
		slug: 'protocol',
		name: 'Protocol',
		category: 'data',
		summary:
			'Registers a custom URL scheme, such as PMTiles or a transform over an existing endpoint.',
		usage: `<script lang="ts">
  import { Protocol } from 'maplibrex-svelte';
  import { PMTiles, Protocol as PMTilesProtocol } from 'pmtiles';

  const pmtiles = new PMTilesProtocol();
</script>

<!-- Above the map on purpose: the scheme must exist before the map asks for it -->
<Protocol name="pmtiles" handler={pmtiles.tile} />

<MapLibre mapStyle={style}>
  <VectorSource id="tiles" url="pmtiles://https://example.com/tiles.pmtiles" />
</MapLibre>`,
		props: [
			{
				name: 'name',
				type: 'string',
				required: true,
				description: 'The scheme to claim, without ://. For example, pmtiles.'
			},
			{
				name: 'handler',
				type: 'AddProtocolAction',
				required: true,
				description: 'Receives the request parameters and returns the data.'
			}
		],
		notes: [
			'MapLibre keeps protocols in a global registry, not on the map, so this component needs no map context — and placement matters. Put it above MapLibre: sibling effects run in document order.',
			'Unmounting removes the scheme.'
		],
		examples: ['PMTiles source and protocol', 'Use addProtocol to Transform Feature Properties']
	}
];

export const COMPONENTS_BY_CATEGORY = CATEGORIES.map((category) => ({
	...category,
	components: COMPONENTS.filter((component) => component.category === category.id)
}));

export function findComponent(slug: string): ComponentDoc | undefined {
	return COMPONENTS.find((component) => component.slug === slug);
}

/** Previous and next in sidebar order, so a reader can walk the whole surface. */
export function siblingsOf(slug: string): { previous?: ComponentDoc; next?: ComponentDoc } {
	const ordered = COMPONENTS_BY_CATEGORY.flatMap((category) => category.components);
	const index = ordered.findIndex((component) => component.slug === slug);

	return {
		previous: index > 0 ? ordered[index - 1] : undefined,
		next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined
	};
}
