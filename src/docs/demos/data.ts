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

export const CITIES: FeatureCollection<Point, { name: string; population: number }> = {
	type: 'FeatureCollection',
	features: [
		{ name: 'Madrid', population: 3.2, coordinates: [-3.7038, 40.4168] },
		{ name: 'Lisbon', population: 0.5, coordinates: [-9.1393, 38.7223] },
		{ name: 'Paris', population: 2.1, coordinates: [2.3522, 48.8566] },
		{ name: 'Rome', population: 2.8, coordinates: [12.4964, 41.9028] },
		{ name: 'Berlin', population: 3.6, coordinates: [13.405, 52.52] },
		{ name: 'Warsaw', population: 1.8, coordinates: [21.0122, 52.2297] }
	].map((city) => ({
		type: 'Feature' as const,
		properties: { name: city.name, population: city.population },
		geometry: { type: 'Point' as const, coordinates: city.coordinates }
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
				properties: {
					name: `Cell ${row * columns + column + 1}`,
					// Something for a data-driven extrusion to read.
					height: 20000 + ((row * columns + column) % 6) * 45000
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
