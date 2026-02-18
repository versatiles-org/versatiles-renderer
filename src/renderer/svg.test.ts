import { describe, expect, test } from 'vitest';
import { SVGRenderer } from './svg.js';
import { Color } from '@maplibre/maplibre-gl-style-spec';
import { Feature, Point2D } from '../geometry.js';
import type { CircleStyle, RasterStyle, RasterTile } from './svg.js';

function mc(hex: string, alpha = 1): Color {
	const r = (parseInt(hex.slice(1, 3), 16) / 255) * alpha;
	const g = (parseInt(hex.slice(3, 5), 16) / 255) * alpha;
	const b = (parseInt(hex.slice(5, 7), 16) / 255) * alpha;
	return new Color(r, g, b, alpha);
}

function makeRenderer(): SVGRenderer {
	return new SVGRenderer({ width: 256, height: 256 });
}

function makePolygonFeature(points: [number, number][][]): Feature {
	return new Feature({
		type: 'Polygon',
		properties: {},
		geometry: points.map((ring) => ring.map(([x, y]) => new Point2D(x, y))),
	});
}

function makeLineFeature(points: [number, number][][]): Feature {
	return new Feature({
		type: 'LineString',
		properties: {},
		geometry: points.map((line) => line.map(([x, y]) => new Point2D(x, y))),
	});
}

describe('SVGRenderer', () => {
	describe('getString', () => {
		test('produces valid SVG wrapper', () => {
			const r = makeRenderer();
			const svg = r.getString();
			expect(svg).toContain('<svg');
			expect(svg).toContain('viewBox="0 0 256 256"');
			expect(svg).toContain('width="256"');
			expect(svg).toContain('height="256"');
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
			expect(svg).toContain('</svg>');
		});

		test('includes clipPath and clip group', () => {
			const r = makeRenderer();
			const svg = r.getString();
			expect(svg).toContain(
				'<defs><clipPath id="vb"><rect width="256" height="256"/></clipPath></defs>',
			);
			expect(svg).toContain('<g clip-path="url(#vb)">');
		});

		test('default background has no rect', () => {
			const r = makeRenderer();
			const svg = r.getString();
			expect(svg).not.toMatch(/<rect[^/]*fill/);
		});
	});

	describe('drawBackgroundFill', () => {
		test('sets background color as oversized rect', () => {
			const r = makeRenderer();
			r.drawBackgroundFill({ color: mc('#FF0000'), opacity: 1 });
			const svg = r.getString();
			expect(svg).toContain('<rect x="-1" y="-1" width="258" height="258" fill="#FF0000" />');
		});

		test('applies opacity to alpha', () => {
			const r = makeRenderer();
			r.drawBackgroundFill({ color: mc('#FF0000'), opacity: 0.5 });
			const svg = r.getString();
			expect(svg).toContain(
				'<rect x="-1" y="-1" width="258" height="258" fill="#FF0000" fill-opacity="0.502" />',
			);
		});
	});

	describe('drawPolygons', () => {
		test('generates path elements', () => {
			const r = makeRenderer();
			const feature = makePolygonFeature([
				[
					[0, 0],
					[10, 0],
					[10, 10],
					[0, 10],
				],
			]);
			const style = { color: mc('#336699'), opacity: 1, translate: [0, 0] as [number, number] };
			r.drawPolygons([[feature, style]]);
			const svg = r.getString();
			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="#336699"');
		});

		test('empty features produce no output', () => {
			const r = makeRenderer();
			r.drawPolygons([]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});

		test('zero opacity produces no output', () => {
			const r = makeRenderer();
			const feature = makePolygonFeature([
				[
					[0, 0],
					[10, 0],
					[10, 10],
				],
			]);
			const style = { color: mc('#336699'), opacity: 0, translate: [0, 0] as [number, number] };
			r.drawPolygons([[feature, style]]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});

		test('transparent fill color produces no path', () => {
			const r = makeRenderer();
			const feature = makePolygonFeature([
				[
					[0, 0],
					[10, 0],
					[10, 10],
				],
			]);
			const style = {
				color: new Color(0, 0, 0, 0),
				opacity: 1,
				translate: [0, 0] as [number, number],
			};
			r.drawPolygons([[feature, style]]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});
	});

	describe('drawLineStrings', () => {
		test('generates path elements with stroke attributes', () => {
			const r = makeRenderer();
			const feature = makeLineFeature([
				[
					[0, 0],
					[50, 50],
				],
			]);
			const style = {
				cap: 'round' as const,
				color: mc('#FF0000'),
				join: 'round' as const,
				miterLimit: 2,
				offset: 0,
				opacity: 1,
				translate: [0, 0] as [number, number],
				width: 2,
			};
			r.drawLineStrings([[feature, style]]);
			const svg = r.getString();
			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="none"');
			expect(svg).toContain('stroke="#FF0000"');
			expect(svg).toContain('stroke-linecap="round"');
			expect(svg).toContain('stroke-linejoin="round"');
		});

		test('empty features produce no output', () => {
			const r = makeRenderer();
			r.drawLineStrings([]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});

		test('zero opacity produces no output', () => {
			const r = makeRenderer();
			const feature = makeLineFeature([
				[
					[0, 0],
					[10, 10],
				],
			]);
			const style = {
				cap: 'butt' as const,
				color: mc('#FF0000'),
				join: 'miter' as const,
				miterLimit: 2,
				offset: 0,
				opacity: 0,
				translate: [0, 0] as [number, number],
				width: 1,
			};
			r.drawLineStrings([[feature, style]]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});

		test('zero width produces no path', () => {
			const r = makeRenderer();
			const feature = makeLineFeature([
				[
					[0, 0],
					[10, 10],
				],
			]);
			const style = {
				cap: 'butt' as const,
				color: mc('#FF0000'),
				join: 'miter' as const,
				miterLimit: 2,
				offset: 0,
				opacity: 1,
				translate: [0, 0] as [number, number],
				width: 0,
			};
			r.drawLineStrings([[feature, style]]);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
		});
	});

	describe('drawCircles', () => {
		function makePointFeature(points: [number, number][]): Feature {
			return new Feature({
				type: 'Point',
				properties: {},
				geometry: points.map(([x, y]) => [new Point2D(x, y)]),
			});
		}

		function defaultCircleStyle(overrides: Partial<CircleStyle> = {}): CircleStyle {
			return {
				color: mc('#FF0000'),
				opacity: 1,
				radius: 5,
				translate: [0, 0] as [number, number],
				strokeWidth: 0,
				strokeColor: mc('#000000'),
				...overrides,
			};
		}

		test('generates circle elements with correct attributes', () => {
			const r = makeRenderer();
			const feature = makePointFeature([[100, 50]]);
			r.drawCircles([[feature, defaultCircleStyle()]]);
			const svg = r.getString();
			expect(svg).toContain('<circle');
			expect(svg).toContain('cx=');
			expect(svg).toContain('cy=');
			expect(svg).toContain('r="5"');
			expect(svg).toContain('fill="#FF0000"');
		});

		test('empty features produce no output', () => {
			const r = makeRenderer();
			r.drawCircles([]);
			const svg = r.getString();
			expect(svg).not.toContain('<circle');
		});

		test('zero opacity produces no output', () => {
			const r = makeRenderer();
			const feature = makePointFeature([[100, 50]]);
			r.drawCircles([[feature, defaultCircleStyle({ opacity: 0 })]]);
			const svg = r.getString();
			expect(svg).not.toContain('<circle');
		});

		test('zero-radius circles produce no output', () => {
			const r = makeRenderer();
			const feature = makePointFeature([[100, 50]]);
			r.drawCircles([[feature, defaultCircleStyle({ radius: 0 })]]);
			const svg = r.getString();
			expect(svg).not.toContain('<circle');
		});

		test('stroke attributes appear when strokeWidth > 0', () => {
			const r = makeRenderer();
			const feature = makePointFeature([[100, 50]]);
			r.drawCircles([
				[feature, defaultCircleStyle({ strokeWidth: 2, strokeColor: mc('#00FF00') })],
			]);
			const svg = r.getString();
			expect(svg).toContain('stroke="#00FF00"');
			expect(svg).toContain('stroke-width="2"');
		});

		test('no stroke attributes when strokeWidth is 0', () => {
			const r = makeRenderer();
			const feature = makePointFeature([[100, 50]]);
			r.drawCircles([[feature, defaultCircleStyle({ strokeWidth: 0 })]]);
			const svg = r.getString();
			expect(svg).not.toContain('stroke=');
			expect(svg).not.toContain('stroke-width=');
		});
	});

	describe('drawRasterTiles', () => {
		function defaultRasterStyle(overrides: Partial<RasterStyle> = {}): RasterStyle {
			return {
				opacity: 1,
				hueRotate: 0,
				brightnessMin: 0,
				brightnessMax: 1,
				saturation: 0,
				contrast: 0,
				resampling: 'linear',
				...overrides,
			};
		}

		function makeTile(overrides: Partial<RasterTile> = {}): RasterTile {
			return {
				x: 0,
				y: 0,
				width: 256,
				height: 256,
				dataUri: 'data:image/png;base64,AAAA',
				...overrides,
			};
		}

		test('generates image elements', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle());
			const svg = r.getString();
			expect(svg).toContain('<image');
			expect(svg).toContain('href="data:image/png;base64,AAAA"');
			expect(svg).toContain('<g opacity="1">');
		});

		test('multiple tiles generate multiple image elements', () => {
			const r = makeRenderer();
			const tiles = [makeTile({ x: 0, y: 0 }), makeTile({ x: 256, y: 0 })];
			r.drawRasterTiles(tiles, defaultRasterStyle());
			const svg = r.getString();
			const imageCount = (svg.match(/<image /g) ?? []).length;
			expect(imageCount).toBe(2);
		});

		test('empty tiles produce no output', () => {
			const r = makeRenderer();
			r.drawRasterTiles([], defaultRasterStyle());
			const svg = r.getString();
			expect(svg).not.toContain('<image');
			expect(svg).not.toContain('<g opacity');
		});

		test('zero opacity produces no output', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ opacity: 0 }));
			const svg = r.getString();
			expect(svg).not.toContain('<image');
		});

		test('applies opacity attribute', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ opacity: 0.5 }));
			const svg = r.getString();
			expect(svg).toContain('opacity="0.5"');
		});

		test('applies hue-rotate filter', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ hueRotate: 90 }));
			const svg = r.getString();
			expect(svg).toContain('filter="hue-rotate(90deg)"');
		});

		test('applies saturate filter', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ saturation: 0.5 }));
			const svg = r.getString();
			expect(svg).toContain('saturate(1.5)');
		});

		test('applies contrast filter', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ contrast: -0.5 }));
			const svg = r.getString();
			expect(svg).toContain('contrast(0.5)');
		});

		test('applies brightness filter', () => {
			const r = makeRenderer();
			r.drawRasterTiles(
				[makeTile()],
				defaultRasterStyle({ brightnessMin: 0.2, brightnessMax: 0.8 }),
			);
			const svg = r.getString();
			expect(svg).toContain('brightness(0.5)');
		});

		test('no filter attribute when all defaults', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle());
			const svg = r.getString();
			expect(svg).not.toContain('filter=');
		});

		test('nearest resampling adds image-rendering:pixelated', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ resampling: 'nearest' }));
			const svg = r.getString();
			expect(svg).toContain('image-rendering:pixelated');
		});

		test('linear resampling does not add image-rendering', () => {
			const r = makeRenderer();
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ resampling: 'linear' }));
			const svg = r.getString();
			expect(svg).not.toContain('image-rendering');
		});
	});
});
