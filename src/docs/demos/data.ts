import type { StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';

export const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

/** The vector tiles behind the demo style: layers `countries`, `centroids`, `geolines`. */
export const DEMOTILES_VECTOR = 'https://demotiles.maplibre.org/tiles/tiles.json';

/** A blank canvas to hang a source on when the basemap would only distract. */
export const BLANK_STYLE: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0f1b21' } }]
};

/**
 * Public sample video with permissive CORS, the same one the official
 * "Add a video" example uses.
 */
export const DRONE_VIDEO = [
	'https://static-assets.mapbox.com/mapbox-gl-js/drone.mp4',
	'https://static-assets.mapbox.com/mapbox-gl-js/drone.webm'
];

/** Four corners, clockwise from the top left — the shape image, video and canvas sources all take. */
export type Corners = [[number, number], [number, number], [number, number], [number, number]];

export const DRONE_CORNERS: Corners = [
	[-122.51596391201019, 37.56238816766053],
	[-122.51467645168304, 37.56410183312965],
	[-122.51309394836426, 37.563391708549425],
	[-122.51423120498657, 37.56161849366671]
];

/**
 * An overlay drawn into a canvas and handed over as a PNG data URL, so the
 * image demo needs no asset in the repository and no network request.
 *
 * PNG rather than SVG on purpose: MapLibre decodes image sources with
 * `createImageBitmap`, which rejects SVG with "The source image could not be
 * decoded".
 */
export function overlayImageUrl(size = 256): string {
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext('2d');
	if (!context) return '';

	const gradient = context.createLinearGradient(0, 0, size, size);
	gradient.addColorStop(0, '#0d9488');
	gradient.addColorStop(1, '#b91c1c');
	context.fillStyle = gradient;
	context.fillRect(0, 0, size, size);

	context.strokeStyle = '#ffffff';
	context.lineWidth = 4;
	context.strokeRect(16, 16, size - 32, size - 32);

	context.beginPath();
	context.arc(size / 2, size / 2, size / 3.6, 0, Math.PI * 2);
	context.stroke();

	context.beginPath();
	context.moveTo(size / 2, 40);
	context.lineTo(size / 2, size - 40);
	context.moveTo(40, size / 2);
	context.lineTo(size - 40, size / 2);
	context.stroke();

	return canvas.toDataURL('image/png');
}

/**
 * The elevation source MapLibre's own 3D terrain example uses. The older
 * demotiles terrain endpoint covers roughly one degree square and 404s
 * everywhere else, which renders as flat ground rather than an error.
 *
 * Its TileJSON declares the encoding, so the component must not override it:
 * decoding terrain-rgb data as terrarium produces plausible-looking nonsense.
 */
export const TERRAIN_TILEJSON = 'https://tiles.mapterhorn.com/tilejson.json';

/**
 * Terrain needs a basemap with detail at the zoom you are looking from. The
 * demo vector style is a world countries map: draped over real relief it is a
 * flat green field, which reads as broken terrain rather than a coarse basemap.
 */
export const OSM_STYLE: StyleSpecification = {
	version: 8,
	sources: {
		osm: {
			type: 'raster',
			tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			maxzoom: 19,
			attribution: '© OpenStreetMap contributors'
		}
	},
	layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

/** The fontstack the demo style actually serves; anything else renders no text. */
export const DEMO_FONT = ['Open Sans Semibold'];

/**
 * European cities with rounded metro populations in millions. Approximate on
 * purpose: the numbers are here to be filtered and ranked, not cited.
 */
export const CITIES: FeatureCollection<Point, { name: string; population: number }> = {
	type: 'FeatureCollection',
	features: (
		[
			['Lisbon', -9.139, 38.722, 2.9],
			['Madrid', -3.704, 40.417, 6.7],
			['Barcelona', 2.173, 41.385, 5.6],
			['Paris', 2.352, 48.857, 11.1],
			['Lyon', 4.835, 45.764, 2.3],
			['Marseille', 5.369, 43.296, 1.9],
			['London', -0.128, 51.507, 9.6],
			['Dublin', -6.26, 53.35, 1.3],
			['Brussels', 4.352, 50.847, 2.1],
			['Amsterdam', 4.904, 52.367, 2.5],
			['Hamburg', 9.994, 53.551, 3.3],
			['Berlin', 13.405, 52.52, 4.5],
			['Munich', 11.582, 48.135, 2.9],
			['Milan', 9.19, 45.464, 4.3],
			['Rome', 12.496, 41.903, 4.3],
			['Naples', 14.268, 40.852, 3.1],
			['Zurich', 8.541, 47.377, 1.4],
			['Vienna', 16.373, 48.208, 2.9],
			['Prague', 14.438, 50.076, 1.3],
			['Warsaw', 21.012, 52.23, 3.1],
			['Budapest', 19.04, 47.498, 3.0],
			['Bucharest', 26.103, 44.427, 2.2],
			['Athens', 23.728, 37.984, 3.2],
			['Stockholm', 18.069, 59.329, 1.7],
			['Copenhagen', 12.568, 55.676, 2.1]
		] as const
	).map(([name, lng, lat, population]) => ({
		type: 'Feature' as const,
		properties: { name, population },
		geometry: { type: 'Point' as const, coordinates: [lng, lat] }
	}))
};

/**
 * A generated grid rather than real borders: the shape is irrelevant to what
 * these demos show, and shipping a country outline would add a megabyte of
 * coordinates to the docs bundle.
 */
export function grid(
	columns = 4,
	rows = 3,
	size = 6
): FeatureCollection<Polygon, { name: string }> {
	const features = [];

	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const west = -12 + column * size;
			const south = 38 + row * size;
			const east = west + size;
			const north = south + size;

			features.push({
				// Feature state needs an id, and this is the id the demos reference.
				id: row * columns + column + 1,
				type: 'Feature' as const,
				properties: { name: `Cell ${row * columns + column + 1}` },
				geometry: {
					type: 'Polygon' as const,
					coordinates: [
						[
							[west, south],
							[east, south],
							[east, north],
							[west, north],
							[west, south]
						]
					]
				}
			});
		}
	}

	return { type: 'FeatureCollection', features };
}

/** A ring icon drawn in code, so the icon demo needs no image request. */
export function ringIcon(size = 32): ImageData {
	const pixels = new Uint8ClampedArray(size * size * 4);
	const centre = (size - 1) / 2;
	const outer = size / 2 - 1;
	const inner = outer - 4;

	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const distance = Math.hypot(x - centre, y - centre);
			const offset = (y * size + x) * 4;
			const onRing = distance <= outer && distance >= inner;

			pixels[offset] = 13;
			pixels[offset + 1] = 148;
			pixels[offset + 2] = 136;
			pixels[offset + 3] = onRing ? 255 : 0;
		}
	}

	return new ImageData(pixels, size, size);
}

/**
 * Deterministic scatter, so clustering has something to cluster and the demo
 * looks the same on every load.
 */
export function scatter(count = 400): FeatureCollection<Point, { weight: number }> {
	let seed = 42;
	const random = () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed / 2147483648;
	};

	return {
		type: 'FeatureCollection',
		features: Array.from({ length: count }, () => ({
			type: 'Feature' as const,
			properties: { weight: Math.round(random() * 10) },
			geometry: {
				type: 'Point' as const,
				coordinates: [-10 + random() * 30, 36 + random() * 18]
			}
		}))
	};
}

/** A smooth polyline, so a line layer has something with length to style. */
export function route(points = 60): FeatureCollection<LineString, Record<string, never>> {
	const coordinates: [number, number][] = Array.from({ length: points }, (_, index) => {
		const t = index / (points - 1);
		return [-9 + t * 30, 42 + Math.sin(t * Math.PI * 2.2) * 6];
	});

	return {
		type: 'FeatureCollection',
		features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }]
	};
}

/**
 * City blocks at a realistic size, for a fill-extrusion demo that reads as
 * buildings rather than as an abstract slab.
 *
 * Extrusion height is in metres, so footprints have to be metres wide too. A
 * grid of whole degrees extruded by tens of kilometres renders fine and looks
 * broken.
 */
export function blocks(
	centre: [number, number] = [2.3522, 48.8566],
	columns = 6,
	rows = 6
): FeatureCollection<Polygon, { height: number; base: number }> {
	const [lng, lat] = centre;
	const metresPerDegreeLat = 111_320;
	const metresPerDegreeLng = metresPerDegreeLat * Math.cos((lat * Math.PI) / 180);

	const footprint = 70;
	const spacing = 110;

	const features = [];

	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const offsetX = (column - (columns - 1) / 2) * spacing;
			const offsetY = (row - (rows - 1) / 2) * spacing;

			const west = lng + (offsetX - footprint / 2) / metresPerDegreeLng;
			const east = lng + (offsetX + footprint / 2) / metresPerDegreeLng;
			const south = lat + (offsetY - footprint / 2) / metresPerDegreeLat;
			const north = lat + (offsetY + footprint / 2) / metresPerDegreeLat;

			const index = row * columns + column;

			features.push({
				type: 'Feature' as const,
				properties: {
					// Ordinary building heights, so the scale control stays believable.
					height: 12 + ((index * 37) % 9) * 14,
					base: index % 5 === 0 ? 0 : 0
				},
				geometry: {
					type: 'Polygon' as const,
					coordinates: [
						[
							[west, south],
							[east, south],
							[east, north],
							[west, north],
							[west, south]
						]
					]
				}
			});
		}
	}

	return { type: 'FeatureCollection', features };
}
