import type { StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point, Polygon } from 'geojson';

export const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

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
