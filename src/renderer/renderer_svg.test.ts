import { describe, expect, test } from 'vitest';
import { SVGRenderer } from './renderer_svg.js';
import { Color } from '../lib/color.js';
import { Feature, Point2D } from '../lib/geometry.js';

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
});
