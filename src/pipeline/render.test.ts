import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { SVGRenderer } from '../renderer/svg.js';
import { Feature, Point2D } from '../geometry.js';
import type { Features, LayerFeatures } from '../geometry.js';

vi.mock('../sources/index.js', () => ({
	getLayerFeatures: vi.fn().mockResolvedValue(new Map()),
	getRasterTiles: vi.fn().mockResolvedValue([]),
}));

const { getLayerFeatures, getRasterTiles } = await import('../sources/index.js');
const { renderMap } = await import('./render.js');

function makeStyle(layers: StyleSpecification['layers']): StyleSpecification {
	return { version: 8, sources: {}, layers };
}

function makeJob(style: StyleSpecification, zoom = 10) {
	return {
		renderer: new SVGRenderer({ width: 256, height: 256, scale: 1 }),
		style,
		view: { center: [0, 0] as [number, number], zoom },
	};
}

function makeFeatures(opts: Partial<Features> = {}): Features {
	return {
		points: opts.points ?? [],
		linestrings: opts.linestrings ?? [],
		polygons: opts.polygons ?? [],
	};
}

function makePolygonFeature(
	points: [number, number][][],
	properties: Record<string, unknown> = {},
): Feature {
	return new Feature({
		type: 'Polygon',
		properties,
		geometry: points.map((ring) => ring.map(([x, y]) => new Point2D(x, y))),
	});
}

function makeLineFeature(
	points: [number, number][][],
	properties: Record<string, unknown> = {},
): Feature {
	return new Feature({
		type: 'LineString',
		properties,
		geometry: points.map((line) => line.map(([x, y]) => new Point2D(x, y))),
	});
}

function makePointFeature(
	points: [number, number][][],
	properties: Record<string, unknown> = {},
): Feature {
	return new Feature({
		type: 'Point',
		properties,
		geometry: points.map((group) => group.map(([x, y]) => new Point2D(x, y))),
	});
}

function setLayerFeatures(features: LayerFeatures): void {
	(getLayerFeatures as Mock).mockResolvedValue(features);
}

describe('renderMap', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getLayerFeatures as Mock).mockResolvedValue(new Map());
		(getRasterTiles as Mock).mockResolvedValue([]);
	});

	test('returns valid SVG for empty style', async () => {
		const result = await renderMap(makeJob(makeStyle([])));
		expect(result).toContain('<svg');
		expect(result).toContain('</svg>');
	});

	test('renders background layer', async () => {
		const style = makeStyle([
			{
				id: 'bg',
				type: 'background',
				paint: {
					'background-color': '#ff0000',
					'background-opacity': 1,
				},
			},
		]);
		const result = await renderMap(makeJob(style));
		expect(result).toContain('<svg');
		expect(result).toContain('fill=');
	});

	test('skips hidden layers (visibility none)', async () => {
		const style = makeStyle([
			{
				id: 'bg',
				type: 'background',
				layout: { visibility: 'none' },
				paint: { 'background-color': '#ff0000' },
			},
		]);
		const result = await renderMap(makeJob(style));
		expect(result).not.toContain('fill=');
	});

	test('skips layers outside zoom range', async () => {
		const style = makeStyle([
			{
				id: 'bg',
				type: 'background',
				minzoom: 15,
				paint: { 'background-color': '#ff0000' },
			},
		]);
		const result = await renderMap(makeJob(style, 10));
		expect(result).not.toContain('fill=');
	});

	test('skips unsupported layer types gracefully', async () => {
		const style = makeStyle([
			{
				id: 'symbols',
				type: 'symbol',
				source: 'src',
				'source-layer': 'labels',
			} as StyleSpecification['layers'][number],
		]);
		const result = await renderMap(makeJob(style));
		expect(result).toContain('<svg');
	});

	test('handles multiple background layers', async () => {
		const style = makeStyle([
			{
				id: 'bg1',
				type: 'background',
				paint: { 'background-color': '#ff0000', 'background-opacity': 1 },
			},
			{
				id: 'bg2',
				type: 'background',
				paint: { 'background-color': '#00ff00', 'background-opacity': 1 },
			},
		]);
		const result = await renderMap(makeJob(style));
		expect(result).toContain('<svg');
		expect(result).toContain('fill=');
	});

	describe('fill layers', () => {
		test('renders fill layer with polygons', async () => {
			const polygon = makePolygonFeature([
				[
					[10, 10],
					[100, 10],
					[100, 100],
					[10, 100],
					[10, 10],
				],
			]);
			const features = new Map<string, Features>();
			features.set('land', makeFeatures({ polygons: [polygon] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'fill-layer',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					paint: {
						'fill-color': '#00ff00',
						'fill-opacity': 0.8,
					},
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<path');
		});

		test('skips fill layer when no polygons exist', async () => {
			const features = new Map<string, Features>();
			features.set('land', makeFeatures({ polygons: [] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'fill-layer',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					paint: { 'fill-color': '#00ff00' },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<path');
		});

		test('skips fill layer when source-layer not found', async () => {
			setLayerFeatures(new Map());

			const style = makeStyle([
				{
					id: 'fill-layer',
					type: 'fill',
					source: 'src',
					'source-layer': 'nonexistent',
					paint: { 'fill-color': '#00ff00' },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<path');
		});

		test('applies filter to fill features', async () => {
			const matchingPolygon = makePolygonFeature(
				[
					[
						[10, 10],
						[100, 10],
						[100, 100],
						[10, 10],
					],
				],
				{ class: 'residential' },
			);
			const nonMatchingPolygon = makePolygonFeature(
				[
					[
						[20, 20],
						[80, 20],
						[80, 80],
						[20, 20],
					],
				],
				{ class: 'commercial' },
			);
			const features = new Map<string, Features>();
			features.set('land', makeFeatures({ polygons: [matchingPolygon, nonMatchingPolygon] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'fill-filtered',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					filter: ['==', 'class', 'residential'],
					paint: { 'fill-color': '#00ff00' },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<path');
		});

		test('skips fill layer when all features are filtered out', async () => {
			const polygon = makePolygonFeature(
				[
					[
						[10, 10],
						[100, 10],
						[100, 100],
						[10, 10],
					],
				],
				{ class: 'commercial' },
			);
			const features = new Map<string, Features>();
			features.set('land', makeFeatures({ polygons: [polygon] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'fill-filtered',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					filter: ['==', 'class', 'residential'],
					paint: { 'fill-color': '#00ff00' },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<path');
		});
	});

	describe('line layers', () => {
		test('renders line layer with linestrings', async () => {
			const line = makeLineFeature([
				[
					[10, 10],
					[100, 100],
				],
			]);
			const features = new Map<string, Features>();
			features.set('roads', makeFeatures({ linestrings: [line] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'line-layer',
					type: 'line',
					source: 'src',
					'source-layer': 'roads',
					paint: {
						'line-color': '#333333',
						'line-width': 2,
						'line-opacity': 1,
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round',
					},
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<path');
		});

		test('skips line layer when no linestrings exist', async () => {
			const features = new Map<string, Features>();
			features.set('roads', makeFeatures({ linestrings: [] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'line-layer',
					type: 'line',
					source: 'src',
					'source-layer': 'roads',
					paint: { 'line-color': '#333333', 'line-width': 2 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('stroke=');
		});

		test('applies filter to line features', async () => {
			const matchingLine = makeLineFeature(
				[
					[
						[10, 10],
						[100, 100],
					],
				],
				{ class: 'highway' },
			);
			const nonMatchingLine = makeLineFeature(
				[
					[
						[20, 20],
						[80, 80],
					],
				],
				{ class: 'path' },
			);
			const features = new Map<string, Features>();
			features.set('roads', makeFeatures({ linestrings: [matchingLine, nonMatchingLine] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'line-filtered',
					type: 'line',
					source: 'src',
					'source-layer': 'roads',
					filter: ['==', 'class', 'highway'],
					paint: { 'line-color': '#333333', 'line-width': 2 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<path');
		});

		test('skips line layer when all features are filtered out', async () => {
			const line = makeLineFeature(
				[
					[
						[10, 10],
						[100, 100],
					],
				],
				{ class: 'path' },
			);
			const features = new Map<string, Features>();
			features.set('roads', makeFeatures({ linestrings: [line] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'line-filtered',
					type: 'line',
					source: 'src',
					'source-layer': 'roads',
					filter: ['==', 'class', 'highway'],
					paint: { 'line-color': '#333333', 'line-width': 2 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('stroke=');
		});
	});

	describe('circle layers', () => {
		test('renders circle layer with points', async () => {
			const point = makePointFeature([[[50, 50]]]);
			const features = new Map<string, Features>();
			features.set('pois', makeFeatures({ points: [point] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'circle-layer',
					type: 'circle',
					source: 'src',
					'source-layer': 'pois',
					paint: {
						'circle-color': '#ff0000',
						'circle-radius': 5,
						'circle-opacity': 1,
					},
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<circle');
		});

		test('skips circle layer when no points exist', async () => {
			const features = new Map<string, Features>();
			features.set('pois', makeFeatures({ points: [] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'circle-layer',
					type: 'circle',
					source: 'src',
					'source-layer': 'pois',
					paint: { 'circle-color': '#ff0000', 'circle-radius': 5 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<circle');
		});

		test('applies filter to circle features', async () => {
			const matchingPoint = makePointFeature([[[50, 50]]], { type: 'cafe' });
			const nonMatchingPoint = makePointFeature([[[80, 80]]], { type: 'bank' });
			const features = new Map<string, Features>();
			features.set('pois', makeFeatures({ points: [matchingPoint, nonMatchingPoint] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'circle-filtered',
					type: 'circle',
					source: 'src',
					'source-layer': 'pois',
					filter: ['==', 'type', 'cafe'],
					paint: { 'circle-color': '#ff0000', 'circle-radius': 5 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<circle');
		});

		test('skips circle layer when all features are filtered out', async () => {
			const point = makePointFeature([[[50, 50]]], { type: 'bank' });
			const features = new Map<string, Features>();
			features.set('pois', makeFeatures({ points: [point] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'circle-filtered',
					type: 'circle',
					source: 'src',
					'source-layer': 'pois',
					filter: ['==', 'type', 'cafe'],
					paint: { 'circle-color': '#ff0000', 'circle-radius': 5 },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<circle');
		});
	});

	describe('raster layers', () => {
		test('renders raster layer with tiles', async () => {
			(getRasterTiles as Mock).mockResolvedValue([
				{
					x: 0,
					y: 0,
					width: 256,
					height: 256,
					dataUri: 'data:image/png;base64,abc',
				},
			]);

			const style = makeStyle([
				{
					id: 'raster-layer',
					type: 'raster',
					source: 'satellite',
				} as StyleSpecification['layers'][number],
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<image');
		});

		test('renders raster layer with empty tiles', async () => {
			(getRasterTiles as Mock).mockResolvedValue([]);

			const style = makeStyle([
				{
					id: 'raster-layer',
					type: 'raster',
					source: 'satellite',
				} as StyleSpecification['layers'][number],
			]);
			const result = await renderMap(makeJob(style));
			expect(result).not.toContain('<image');
		});
	});

	describe('feature lookup', () => {
		test('falls back to source name when source-layer not found', async () => {
			const polygon = makePolygonFeature([
				[
					[10, 10],
					[100, 10],
					[100, 100],
					[10, 10],
				],
			]);
			const features = new Map<string, Features>();
			features.set('my-source', makeFeatures({ polygons: [polygon] }));
			setLayerFeatures(features);

			const style = makeStyle([
				{
					id: 'fill-layer',
					type: 'fill',
					source: 'my-source',
					'source-layer': 'nonexistent',
					paint: { 'fill-color': '#00ff00' },
				},
			]);
			const result = await renderMap(makeJob(style));
			expect(result).toContain('<path');
		});
	});

	describe('error handling', () => {
		test('throws on unknown layer type', async () => {
			const style = makeStyle([
				{
					id: 'unknown',
					type: 'custom-type',
				} as unknown as StyleSpecification['layers'][number],
			]);
			await expect(renderMap(makeJob(style))).rejects.toThrow('layerStyle.type');
		});
	});

	describe('other skipped layer types', () => {
		const skippedTypes = ['fill-extrusion', 'heatmap', 'hillshade'] as const;

		for (const type of skippedTypes) {
			test(`skips ${type} layer`, async () => {
				const style = makeStyle([
					{
						id: `${type}-layer`,
						type,
						source: 'src',
						'source-layer': 'data',
					} as StyleSpecification['layers'][number],
				]);
				const result = await renderMap(makeJob(style));
				expect(result).toContain('<svg');
			});
		}
	});
});
