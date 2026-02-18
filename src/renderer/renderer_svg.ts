import type { Feature } from '../lib/geometry.js';
import { Color } from '../lib/color.js';
import type { Segment } from './svg_path.js';
import { chainSegments, formatNum, segmentsToPath } from './svg_path.js';
import type {
	BackgroundStyle,
	CircleStyle,
	FillStyle,
	LineStyle,
	RasterStyle,
	RasterTile,
	RendererOptions,
} from './types.js';

export type {
	BackgroundStyle,
	CircleStyle,
	FillStyle,
	LineStyle,
	RasterStyle,
	RasterTile,
	RenderJob,
	RendererOptions,
	View,
} from './types.js';

export class SVGRenderer {
	public readonly width: number;

	public readonly height: number;

	readonly #svg: string[];

	readonly #scale: number;

	#backgroundColor: Color;

	public constructor(opt: RendererOptions) {
		this.width = opt.width;
		this.height = opt.height;
		this.#svg = [];
		this.#scale = opt.scale;
		this.#backgroundColor = Color.transparent;
	}

	public drawBackgroundFill(style: BackgroundStyle): void {
		const color = style.color.clone();
		color.alpha *= style.opacity;
		this.#backgroundColor = color;
	}

	public drawPolygons(features: [Feature, FillStyle][], opacity: number): void {
		if (features.length === 0) return;
		if (opacity <= 0) return;

		this.#svg.push(`<g opacity="${String(opacity)}">`);

		const groups = new Map<string, { segments: Segment[]; attrs: string }>();
		features.forEach(([feature, style]) => {
			if (style.color.alpha <= 0) return;

			const translate =
				style.translate[0] === 0 && style.translate[1] === 0
					? ''
					: ` transform="translate(${formatPoint(style.translate, this.#scale)})"`;
			const key = style.color.hex + translate;

			let group = groups.get(key);
			if (!group) {
				group = { segments: [], attrs: `${fillAttr(style.color)}${translate}` };
				groups.set(key, group);
			}
			feature.geometry.forEach((ring) => {
				group.segments.push(ring.map((p) => roundXY(p.x, p.y, this.#scale)));
			});
		});

		for (const { segments, attrs } of groups.values()) {
			const d = segmentsToPath(segments, true);
			this.#svg.push(`<path d="${d}" ${attrs} />`);
		}

		this.#svg.push('</g>');
	}

	public drawLineStrings(features: [Feature, LineStyle][], opacity: number): void {
		if (features.length === 0) return;
		if (opacity <= 0) return;

		this.#svg.push(`<g opacity="${String(opacity)}">`);

		const groups = new Map<string, { segments: Segment[]; attrs: string }>();
		features.forEach(([feature, style]) => {
			if (style.width <= 0 || style.color.alpha <= 0) return;

			const translate =
				style.translate[0] === 0 && style.translate[1] === 0
					? ''
					: ` transform="translate(${formatPoint(style.translate, this.#scale)})"`;
			const roundedWidth = roundValue(style.width, this.#scale);
			const key = [
				style.color.hex,
				roundedWidth,
				style.cap,
				style.join,
				String(style.miterLimit),
				translate,
			].join('\0');

			let group = groups.get(key);
			if (!group) {
				group = {
					segments: [],
					attrs:
						[
							'fill="none"',
							strokeAttr(style.color, roundedWidth),
							`stroke-linecap="${style.cap}"`,
							`stroke-linejoin="${style.join}"`,
							`stroke-miterlimit="${String(style.miterLimit)}"`,
						].join(' ') + translate,
				};
				groups.set(key, group);
			}

			feature.geometry.forEach((line) => {
				group.segments.push(line.map((p) => roundXY(p.x, p.y, this.#scale)));
			});
		});

		for (const { segments, attrs } of groups.values()) {
			const chains = chainSegments(segments);
			const d = segmentsToPath(chains);
			this.#svg.push(`<path d="${d}" ${attrs} />`);
		}

		this.#svg.push('</g>');
	}

	public drawCircles(features: [Feature, CircleStyle][], opacity: number): void {
		if (features.length === 0) return;
		if (opacity <= 0) return;

		this.#svg.push(`<g opacity="${String(opacity)}">`);

		const groups = new Map<string, { points: [number, number][]; attrs: string }>();
		features.forEach(([feature, style]) => {
			if (style.radius <= 0 || style.color.alpha <= 0) return;

			const translate =
				style.translate[0] === 0 && style.translate[1] === 0
					? ''
					: ` transform="translate(${formatPoint(style.translate, this.#scale)})"`;
			const roundedRadius = roundValue(style.radius, this.#scale);
			const strokeAttrs =
				style.strokeWidth > 0
					? ` ${strokeAttr(style.strokeColor, roundValue(style.strokeWidth, this.#scale))}`
					: '';
			const key = [style.color.hex, roundedRadius, strokeAttrs, translate].join('\0');

			let group = groups.get(key);
			if (!group) {
				group = {
					points: [],
					attrs: `r="${roundedRadius}" ${fillAttr(style.color)}${strokeAttrs}${translate}`,
				};
				groups.set(key, group);
			}
			feature.geometry.forEach((ring) => {
				group.points.push(roundXY(ring[0].x, ring[0].y, this.#scale));
			});
		});

		for (const { points, attrs } of groups.values()) {
			for (const [x, y] of points) {
				this.#svg.push(`<circle cx="${formatNum(x)}" cy="${formatNum(y)}" ${attrs} />`);
			}
		}

		this.#svg.push('</g>');
	}

	public drawRasterTiles(tiles: RasterTile[], style: RasterStyle): void {
		if (tiles.length === 0) return;
		if (style.opacity <= 0) return;

		const filters: string[] = [];
		if (style.hueRotate !== 0) filters.push(`hue-rotate(${String(style.hueRotate)}deg)`);
		if (style.saturation !== 0) filters.push(`saturate(${String(style.saturation + 1)})`);
		if (style.contrast !== 0) filters.push(`contrast(${String(style.contrast + 1)})`);
		if (style.brightnessMin !== 0 || style.brightnessMax !== 1) {
			const brightness = (style.brightnessMin + style.brightnessMax) / 2;
			filters.push(`brightness(${String(brightness)})`);
		}

		let gAttrs = `opacity="${String(style.opacity)}"`;
		if (filters.length > 0) gAttrs += ` filter="${filters.join(' ')}"`;

		this.#svg.push(`<g ${gAttrs}>`);

		const pixelated = style.resampling === 'nearest';
		for (const tile of tiles) {
			const overlap = Math.min(tile.width, tile.height) / 10000; // slight overlap to prevent sub-pixel gaps between tiles
			const s = this.#scale;
			let attrs = `x="${roundValue(tile.x - overlap, s)}" y="${roundValue(tile.y - overlap, s)}" width="${roundValue(tile.width + overlap * 2, s)}" height="${roundValue(tile.height + overlap * 2, s)}" href="${tile.dataUri}"`;
			if (pixelated) attrs += ' style="image-rendering:pixelated"';
			this.#svg.push(`<image ${attrs} />`);
		}

		this.#svg.push('</g>');
	}

	public getString(): string {
		const w = this.width.toFixed(0);
		const h = this.height.toFixed(0);
		const parts = [
			`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`,
			`<defs><clipPath id="vb"><rect width="${w}" height="${h}"/></clipPath></defs>`,
			`<g clip-path="url(#vb)">`,
		];
		if (this.#backgroundColor.alpha > 0) {
			parts.push(
				`<rect x="-1" y="-1" width="${(this.width + 2).toFixed(0)}" height="${(this.height + 2).toFixed(0)}" ${fillAttr(this.#backgroundColor)} />`,
			);
		}
		parts.push(...this.#svg, '</g>', '</svg>');
		return parts.join('\n');
	}
}

function fillAttr(color: Color): string {
	let attr = `fill="${color.rgb}"`;
	if (color.alpha < 255) attr += ` fill-opacity="${color.opacity.toFixed(3)}"`;
	return attr;
}

function strokeAttr(color: Color, width: string): string {
	let attr = `stroke="${color.rgb}" stroke-width="${width}"`;
	if (color.alpha < 255) attr += ` stroke-opacity="${color.opacity.toFixed(3)}"`;
	return attr;
}

function roundValue(v: number, scale: number): string {
	return (v * scale).toFixed(3);
}

function roundXY(x: number, y: number, scale: number): [number, number] {
	return [Math.round(x * scale * 10), Math.round(y * scale * 10)];
}

function formatPoint(p: [number, number], scale: number): string {
	const [x, y] = roundXY(p[0], p[1], scale);
	return formatNum(x) + ',' + formatNum(y);
}
