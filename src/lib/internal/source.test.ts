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

/**
 * Issue #9: GeoJSON data is compared by reference, never walked. A new
 * reference means new data, even when it is structurally equal; the same
 * reference means no data change, even when it was mutated in place.
 */
describe('planSourceUpdate for geojson data', () => {
	type Data = GeoJSONSourceSpecification['data'];

	/** Data that throws as soon as anything reads inside it. */
	function unreadable(): Data {
		const fail = () => {
			throw new Error('the data was read to compare it');
		};
		return new Proxy({} as Exclude<Data, string>, {
			get: fail,
			has: fail,
			ownKeys: fail,
			getOwnPropertyDescriptor: fail
		});
	}

	it('plans a data update for a new reference, even when it is structurally equal', () => {
		const next: GeoJSONSourceSpecification = {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		};

		expect(planSourceUpdate(empty, next)).toEqual({ kind: 'set-data', data: next.data });
	});

	it('plans nothing when the data keeps its reference', () => {
		expect(planSourceUpdate(empty, { type: 'geojson', data: empty.data })).toEqual({
			kind: 'noop'
		});
	});

	it('plans a recreate, not a data update, when another option changes and data keeps its reference', () => {
		expect(planSourceUpdate(empty, { type: 'geojson', data: empty.data, maxzoom: 12 })).toEqual({
			kind: 'recreate'
		});
	});

	it('never reads inside the data to compare it', () => {
		const next: GeoJSONSourceSpecification = { type: 'geojson', data: unreadable() };
		const plan = planSourceUpdate({ type: 'geojson', data: unreadable() }, next);

		expect(plan.kind).toBe('set-data');
		expect(plan.kind === 'set-data' && plan.data === next.data).toBe(true);
	});

	it('still compares the other options structurally', () => {
		const sum = () => ({ total: ['+', ['get', 'count']] as ['+', ['get', string]] });

		expect(
			planSourceUpdate(
				{ ...empty, cluster: true, clusterProperties: sum() },
				{ ...empty, cluster: true, clusterProperties: sum() }
			)
		).toEqual({ kind: 'noop' });
	});
});
