import { describe, expect, test, vi } from 'vitest';

vi.mock('./processor/render.js', () => ({
	renderVectorTiles: vi.fn().mockResolvedValue('<svg></svg>'),
}));

const { renderVectorTiles } = await import('./processor/render.js');
const { renderToSVG } = await import('./index.js');

describe('renderToSVG', () => {
	const minimalStyle = {
		version: 8 as const,
		sources: {},
		layers: [],
	};

	test('returns SVG string', async () => {
		const result = await renderToSVG({ style: minimalStyle });
		expect(result).toBe('<svg></svg>');
	});

	test('passes default options to renderVectorTiles', async () => {
		await renderToSVG({ style: minimalStyle });
		expect(renderVectorTiles).toHaveBeenCalledWith(
			expect.objectContaining({
				style: minimalStyle,
				view: { center: [0, 0], zoom: 2 },
			}),
		);
	});

	test('passes custom options', async () => {
		await renderToSVG({
			style: minimalStyle,
			width: 800,
			height: 600,
			scale: 2,
			lon: 13.4,
			lat: 52.5,
			zoom: 10,
		});
		expect(renderVectorTiles).toHaveBeenCalledWith(
			expect.objectContaining({
				view: { center: [13.4, 52.5], zoom: 10 },
			}),
		);
	});

	test('throws on non-positive width', async () => {
		await expect(renderToSVG({ style: minimalStyle, width: 0 })).rejects.toThrow(
			'width must be positive',
		);
		await expect(renderToSVG({ style: minimalStyle, width: -1 })).rejects.toThrow(
			'width must be positive',
		);
	});

	test('throws on non-positive height', async () => {
		await expect(renderToSVG({ style: minimalStyle, height: 0 })).rejects.toThrow(
			'height must be positive',
		);
	});

	test('throws on non-positive scale', async () => {
		await expect(renderToSVG({ style: minimalStyle, scale: 0 })).rejects.toThrow(
			'scale must be positive',
		);
	});
});
