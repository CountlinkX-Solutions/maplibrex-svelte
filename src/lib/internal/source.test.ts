import { describe, expect, it } from 'vitest';
import type { GeoJSONSourceSpecification, SourceSpecification } from 'maplibre-gl';
import { planSourceUpdate } from './source.js';

const empty: GeoJSONSourceSpecification = {
	type: 'geojson',
	data: { type: 'FeatureCollection', features: [] }
};

describe('planSourceUpdate', () => {
	it('plans nothing when the specification is unchanged', () => {
		expect(planSourceUpdate(empty, { ...empty })).toEqual({ kind: 'noop' });
	});

	it('plans a data-only update when just the geojson data changed', () => {
		const next: GeoJSONSourceSpecification = {
			type: 'geojson',
			data: 'https://example.com/features.geojson'
		};

		expect(planSourceUpdate(empty, next)).toEqual({
			kind: 'set-data',
			data: 'https://example.com/features.geojson'
		});
	});

	it('plans a recreate when a non-data geojson option changed', () => {
		expect(planSourceUpdate(empty, { ...empty, cluster: true })).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the source type changed', () => {
		const raster: SourceSpecification = {
			type: 'raster',
			tiles: ['https://example.com/{z}/{x}/{y}.png']
		};

		expect(planSourceUpdate(empty, raster)).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate for a non-geojson source whose options changed', () => {
		const before: SourceSpecification = {
			type: 'raster',
			tiles: ['https://a.example/{z}/{x}/{y}.png']
		};
		const after: SourceSpecification = {
			type: 'raster',
			tiles: ['https://b.example/{z}/{x}/{y}.png']
		};

		expect(planSourceUpdate(before, after)).toEqual({ kind: 'recreate' });
	});

	it('plans a create when there is no previous specification', () => {
		expect(planSourceUpdate(undefined, empty)).toEqual({ kind: 'create' });
	});
});
