import { describe, expect, test } from 'vitest';
import { renderVectorTiles } from './render.js';
import { SVGRenderer } from '../renderer/renderer_svg.js';
import { Point2D } from '../lib/geometry.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { RenderJob } from '../types.js';

function makeJob(
	style: StyleSpecification,
	center: [number, number] = [0, 0],
	zoom = 2,
): RenderJob {
	return {
		style,
		view: { center: new Point2D(center[0], center[1]), zoom },
		renderer: new SVGRenderer({ width: 256, height: 256, scale: 1 }),
	};
}

describe('renderVectorTiles e2e', () => {
	describe('geojson source with circle layer', () => {
		test('renders circles from GeoJSON points', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						points: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [0, 0] },
										properties: {},
									},
								],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'points',
							paint: {
								'circle-radius': 10,
								'circle-color': '#FF0000',
							},
						},
					],
				}),
			);

			expect(svg).toContain('<circle');
			expect(svg).toContain('fill="#FF0000"');
			expect(svg).toContain('r="10.000"');
		});

		test('renders circles with stroke from GeoJSON', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						points: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [0, 0] },
										properties: {},
									},
								],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'points',
							paint: {
								'circle-radius': 8,
								'circle-color': '#0000FF',
								'circle-stroke-width': 2,
								'circle-stroke-color': '#FFFFFF',
							},
						},
					],
				}),
			);

			expect(svg).toContain('<circle');
			expect(svg).toContain('fill="#0000FF"');
			expect(svg).toContain('stroke="#FFFFFF"');
			expect(svg).toContain('stroke-width="2.000"');
		});

		test('renders multiple points from GeoJSON', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						points: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [-10, 10] },
										properties: {},
									},
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [10, -10] },
										properties: {},
									},
								],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'points',
							paint: { 'circle-radius': 5, 'circle-color': '#336699' },
						},
					],
				}),
			);

			const circleCount = (svg.match(/<circle /g) ?? []).length;
			expect(circleCount).toBe(2);
			expect(svg).toContain('fill="#336699"');
		});

		test('renders MultiPoint geometry as circles', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						points: {
							type: 'geojson',
							data: {
								type: 'Feature',
								geometry: {
									type: 'MultiPoint',
									coordinates: [
										[-5, 5],
										[5, -5],
										[0, 0],
									],
								},
								properties: {},
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'points',
							paint: { 'circle-radius': 4, 'circle-color': '#00FF00' },
						},
					],
				}),
			);

			const circleCount = (svg.match(/<circle /g) ?? []).length;
			expect(circleCount).toBe(3);
		});

		test('hidden circle layer produces no circles', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						points: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [0, 0] },
										properties: {},
									},
								],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'points',
							layout: { visibility: 'none' },
							paint: { 'circle-radius': 10, 'circle-color': '#FF0000' },
						},
					],
				}),
			);

			expect(svg).not.toContain('<circle');
		});
	});

	describe('geojson source with fill layer', () => {
		test('renders polygons from GeoJSON', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						polygons: {
							type: 'geojson',
							data: {
								type: 'Feature',
								geometry: {
									type: 'Polygon',
									coordinates: [
										[
											[-20, 20],
											[20, 20],
											[20, -20],
											[-20, -20],
											[-20, 20],
										],
									],
								},
								properties: {},
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'fill',
							type: 'fill',
							source: 'polygons',
							paint: { 'fill-color': '#00FF00' },
						},
					],
				}),
			);

			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="#00FF00"');
		});
	});

	describe('geojson source with line layer', () => {
		test('renders lines from GeoJSON', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						lines: {
							type: 'geojson',
							data: {
								type: 'Feature',
								geometry: {
									type: 'LineString',
									coordinates: [
										[-20, 0],
										[20, 0],
									],
								},
								properties: {},
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'line',
							type: 'line',
							source: 'lines',
							paint: { 'line-color': '#FF00FF', 'line-width': 3 },
						},
					],
				}),
			);

			expect(svg).toContain('<path d=');
			expect(svg).toContain('stroke="#FF00FF"');
		});
	});

	describe('geojson source with multiple layers', () => {
		test('renders circles and fills from the same GeoJSON source', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						data: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [
									{
										type: 'Feature',
										geometry: { type: 'Point', coordinates: [0, 0] },
										properties: {},
									},
									{
										type: 'Feature',
										geometry: {
											type: 'Polygon',
											coordinates: [
												[
													[-10, 10],
													[10, 10],
													[10, -10],
													[-10, -10],
													[-10, 10],
												],
											],
										},
										properties: {},
									},
								],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'fill',
							type: 'fill',
							source: 'data',
							paint: { 'fill-color': '#00FF00' },
						},
						{
							id: 'circles',
							type: 'circle',
							source: 'data',
							paint: { 'circle-radius': 6, 'circle-color': '#FF0000' },
						},
					],
				}),
			);

			expect(svg).toContain('<circle');
			expect(svg).toContain('fill="#FF0000"');
			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="#00FF00"');
		});
	});

	describe('background layer', () => {
		test('renders background without sources', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {},
					layers: [
						{
							id: 'bg',
							type: 'background',
							paint: { 'background-color': '#AABBCC' },
						},
					],
				}),
			);

			expect(svg).toContain('background-color:#AABBCC');
		});
	});

	describe('empty source', () => {
		test('geojson source with no features produces no output', async () => {
			const svg = await renderVectorTiles(
				makeJob({
					version: 8,
					sources: {
						empty: {
							type: 'geojson',
							data: {
								type: 'FeatureCollection',
								features: [],
							},
						} as StyleSpecification['sources'][string],
					},
					layers: [
						{
							id: 'circles',
							type: 'circle',
							source: 'empty',
							paint: { 'circle-radius': 5, 'circle-color': '#FF0000' },
						},
					],
				}),
			);

			expect(svg).not.toContain('<circle');
			expect(svg).not.toContain('<g');
		});
	});
});
