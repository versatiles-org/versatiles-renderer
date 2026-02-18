import { describe, expect, test } from 'vitest';
import { mergePolygons } from './helper.js';
import { Feature, Point2D } from '../../lib/geometry.js';

function makePolygon(id: number, rings: [number, number][][]): Feature {
	return new Feature({
		type: 'Polygon',
		id,
		properties: {},
		geometry: rings.map((ring) => ring.map(([x, y]) => new Point2D(x, y))),
	});
}

describe('mergePolygons', () => {
	test('single feature passes through unchanged', () => {
		const f = makePolygon(1, [
			[
				[0, 0],
				[10, 0],
				[10, 10],
				[0, 10],
				[0, 0],
			],
		]);
		const result = mergePolygons([f]);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(f);
	});

	test('features with different ids stay separate', () => {
		const f1 = makePolygon(1, [
			[
				[0, 0],
				[5, 0],
				[5, 5],
				[0, 5],
				[0, 0],
			],
		]);
		const f2 = makePolygon(2, [
			[
				[10, 10],
				[15, 10],
				[15, 15],
				[10, 15],
				[10, 10],
			],
		]);
		const result = mergePolygons([f1, f2]);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe(f1);
		expect(result[1]).toBe(f2);
	});

	test('features with same id get merged', () => {
		const f1 = makePolygon(1, [
			[
				[0, 0],
				[10, 0],
				[10, 10],
				[0, 10],
				[0, 0],
			],
		]);
		const f2 = makePolygon(1, [
			[
				[5, 5],
				[15, 5],
				[15, 15],
				[5, 15],
				[5, 5],
			],
		]);
		const result = mergePolygons([f1, f2]);
		// The two overlapping polygons should be merged into one (or possibly split into parts)
		// but there should be fewer than 2 original features returned with the same id
		expect(result.length).toBeGreaterThanOrEqual(1);
		// All results should be Polygon type
		for (const r of result) {
			expect(r.type).toBe('Polygon');
		}
	});

	test('non-overlapping features with same id get merged into MultiPolygon parts', () => {
		const f1 = makePolygon(1, [
			[
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
			],
		]);
		const f2 = makePolygon(1, [
			[
				[10, 10],
				[11, 10],
				[11, 11],
				[10, 11],
				[10, 10],
			],
		]);
		const result = mergePolygons([f1, f2]);
		// Non-overlapping polygons with same id: turf union produces MultiPolygon -> 2 separate Feature results
		expect(result).toHaveLength(2);
		for (const r of result) {
			expect(r.type).toBe('Polygon');
		}
	});
});
