import { describe, expect, test } from 'vitest';
import { SVGRenderer } from './renderer_svg.js';
import { Color } from '../lib/color.js';
import { Feature, Point2D } from '../lib/geometry.js';
import type { RasterStyle, RasterTile } from '../types.js';

function makeRenderer(scale = 1): SVGRenderer {
	return new SVGRenderer({ width: 256, height: 256, scale });
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

		test('default background is transparent', () => {
			const r = makeRenderer();
			const svg = r.getString();
			expect(svg).toContain('background-color:#00000000');
		});
	});

	describe('drawBackgroundFill', () => {
		test('sets background color', () => {
			const r = makeRenderer();
			r.drawBackgroundFill({ color: new Color('#FF0000'), opacity: 1 });
			const svg = r.getString();
			expect(svg).toContain('background-color:#FF0000');
		});

		test('applies opacity to alpha', () => {
			const r = makeRenderer();
			r.drawBackgroundFill({ color: new Color('#FF0000'), opacity: 0.5 });
			const svg = r.getString();
			expect(svg).toContain('background-color:#FF0000');
			// alpha should be ~128 (255 * 0.5)
			expect(svg).toMatch(/background-color:#FF0000[0-9A-F]{2}/);
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
			const style = { color: new Color('#336699'), translate: new Point2D(0, 0) };
			r.drawPolygons([[feature, style]], 1);
			const svg = r.getString();
			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="#336699"');
			expect(svg).toContain('<g opacity="1">');
		});

		test('empty features produce no output', () => {
			const r = makeRenderer();
			r.drawPolygons([], 1);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
			expect(svg).not.toContain('<g');
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
			const style = { color: new Color('#336699'), translate: new Point2D(0, 0) };
			r.drawPolygons([[feature, style]], 0);
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
			const style = { color: Color.transparent, translate: new Point2D(0, 0) };
			r.drawPolygons([[feature, style]], 1);
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
				blur: 0,
				cap: 'round' as const,
				color: new Color('#FF0000'),
				gapWidth: 0,
				join: 'round' as const,
				miterLimit: 2,
				offset: 0,
				roundLimit: 1,
				translate: new Point2D(0, 0),
				width: 2,
			};
			r.drawLineStrings([[feature, style]], 1);
			const svg = r.getString();
			expect(svg).toContain('<path d=');
			expect(svg).toContain('fill="none"');
			expect(svg).toContain('stroke="#FF0000"');
			expect(svg).toContain('stroke-linecap="round"');
			expect(svg).toContain('stroke-linejoin="round"');
		});

		test('empty features produce no output', () => {
			const r = makeRenderer();
			r.drawLineStrings([], 1);
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
				blur: 0,
				cap: 'butt' as const,
				color: new Color('#FF0000'),
				gapWidth: 0,
				join: 'miter' as const,
				miterLimit: 2,
				offset: 0,
				roundLimit: 1,
				translate: new Point2D(0, 0),
				width: 1,
			};
			r.drawLineStrings([[feature, style]], 0);
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
				blur: 0,
				cap: 'butt' as const,
				color: new Color('#FF0000'),
				gapWidth: 0,
				join: 'miter' as const,
				miterLimit: 2,
				offset: 0,
				roundLimit: 1,
				translate: new Point2D(0, 0),
				width: 0,
			};
			r.drawLineStrings([[feature, style]], 1);
			const svg = r.getString();
			expect(svg).not.toContain('<path');
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
			const tiles = [
				makeTile({ x: 0, y: 0 }),
				makeTile({ x: 256, y: 0 }),
			];
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
			expect(svg).not.toContain('<g');
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
			r.drawRasterTiles([makeTile()], defaultRasterStyle({ brightnessMin: 0.2, brightnessMax: 0.8 }));
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
