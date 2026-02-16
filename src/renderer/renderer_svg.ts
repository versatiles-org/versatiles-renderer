import type { Feature, Point2D } from '../lib/geometry.js';
import { Color } from '../lib/color.js';
import type {
	BackgroundStyle,
	CircleStyle,
	FillStyle,
	LineStyle,
	RasterStyle,
	RasterTile,
	RendererOptions,
} from '../types.js';

type Segment = [number, number][];

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

			const translate = style.translate.isZero()
				? ''
				: ` transform="translate(${formatPoint(style.translate, this.#scale)})"`;
			const key = style.color.hex + translate;

			let group = groups.get(key);
			if (!group) {
				group = { segments: [], attrs: `fill="${style.color.hex}"${translate}` };
				groups.set(key, group);
			}
			feature.geometry.forEach((ring) => {
				group.segments.push(ring.map((p) => roundXY(p, this.#scale)));
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

			const translate = style.translate.isZero()
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
							`stroke="${style.color.hex}"`,
							`stroke-width="${roundedWidth}"`,
							`stroke-linecap="${style.cap}"`,
							`stroke-linejoin="${style.join}"`,
							`stroke-miterlimit="${String(style.miterLimit)}"`,
						].join(' ') + translate,
				};
				groups.set(key, group);
			}

			feature.geometry.forEach((line) => {
				group.segments.push(line.map((p) => roundXY(p, this.#scale)));
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

			const translate = style.translate.isZero()
				? ''
				: ` transform="translate(${formatPoint(style.translate, this.#scale)})"`;
			const roundedRadius = roundValue(style.radius, this.#scale);
			const strokeAttrs =
				style.strokeWidth > 0
					? ` stroke="${style.strokeColor.hex}" stroke-width="${roundValue(style.strokeWidth, this.#scale)}"`
					: '';
			const key = [style.color.hex, roundedRadius, strokeAttrs, translate].join('\0');

			let group = groups.get(key);
			if (!group) {
				group = {
					points: [],
					attrs: `r="${roundedRadius}" fill="${style.color.hex}"${strokeAttrs}${translate}`,
				};
				groups.set(key, group);
			}
			feature.geometry.forEach((ring) => {
				group.points.push(roundXY(ring[0], this.#scale));
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
		return [
			`<svg viewBox="0 0 ${String(this.width)} ${String(this.height)}" width="${String(this.width)}" height="${String(this.height)}" xmlns="http://www.w3.org/2000/svg" style="background-color:${this.#backgroundColor.hex}">`,
			...this.#svg,
			'</svg>',
		].join('\n');
	}
}

function roundValue(v: number, scale: number): string {
	return (v * scale).toFixed(3);
}

function roundXY(p: Point2D, scale: number): [number, number] {
	return [Math.round(p.x * scale * 10), Math.round(p.y * scale * 10)];
}

function formatPoint(p: Point2D, scale: number): string {
	const [x, y] = roundXY(p, scale);
	return formatNum(x) + ',' + formatNum(y);
}

function chainSegments(segments: Segment[]): Segment[] {
	// Phase 1: normalize segments left-to-right, then chain
	normalizeSegments(segments, 0);
	let chains = greedyChain(segments);

	// Phase 2: normalize remaining chains top-to-bottom, then chain again
	normalizeSegments(chains, 1);
	chains = greedyChain(chains);

	return chains;
}

function normalizeSegments(segments: Segment[], coordIndex: number): void {
	for (const seg of segments) {
		if (seg[seg.length - 1][coordIndex] < seg[0][coordIndex]) seg.reverse();
	}
}

function greedyChain(segments: Segment[]): Segment[] {
	const byStart = new Map<string, Segment[]>();
	for (const seg of segments) {
		const key = String(seg[0][0]) + ',' + String(seg[0][1]);
		let list = byStart.get(key);
		if (!list) {
			list = [];
			byStart.set(key, list);
		}
		list.push(seg);
	}

	const visited = new Set<Segment>();
	const chains: Segment[] = [];
	for (const seg of segments) {
		if (visited.has(seg)) continue;
		visited.add(seg);
		const chain: Segment = [...seg];
		let endPoint = chain[chain.length - 1];
		let candidates = byStart.get(String(endPoint[0]) + ',' + String(endPoint[1]));
		while (candidates) {
			let next: Segment | undefined;
			for (const c of candidates) {
				if (!visited.has(c)) {
					next = c;
					break;
				}
			}
			if (!next) break;
			visited.add(next);
			for (let i = 1; i < next.length; i++) chain.push(next[i]);
			endPoint = chain[chain.length - 1];
			candidates = byStart.get(String(endPoint[0]) + ',' + String(endPoint[1]));
		}
		chains.push(chain);
	}

	return chains;
}

function segmentsToPath(chains: Segment[], close = false): string {
	let d = '';
	for (const chain of chains) {
		d += 'M' + formatNum(chain[0][0]) + ',' + formatNum(chain[0][1]);
		let px = chain[0][0];
		let py = chain[0][1];
		for (let i = 1; i < chain.length; i++) {
			const x = chain[i][0];
			const y = chain[i][1];
			const dx = x - px;
			const dy = y - py;
			if (dy === 0) {
				const rel = 'h' + formatNum(dx);
				const abs = 'H' + formatNum(x);
				d += rel.length <= abs.length ? rel : abs;
			} else if (dx === 0) {
				const rel = 'v' + formatNum(dy);
				const abs = 'V' + formatNum(y);
				d += rel.length <= abs.length ? rel : abs;
			} else {
				const rel = 'l' + formatNum(dx) + ',' + formatNum(dy);
				const abs = 'L' + formatNum(x) + ',' + formatNum(y);
				d += rel.length <= abs.length ? rel : abs;
			}
			px = x;
			py = y;
		}
		if (close) d += 'z';
	}
	return d;
}

function formatNum(tenths: number): string {
	if (tenths % 10 === 0) return String(tenths / 10);
	const negative = tenths < 0;
	if (negative) tenths = -tenths;
	const whole = Math.floor(tenths / 10);
	const frac = tenths % 10;
	return (negative ? '-' : '') + String(whole) + '.' + String(frac);
}
