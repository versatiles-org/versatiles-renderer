import type { Feature, Point2D } from '../lib/geometry.js';
import { Color } from '../lib/color.js';
import { Renderer } from './renderer.js';
import type { BackgroundStyle, FillStyle, LineStyle, RendererOptions } from '../types.js';

type Segment = [number, number][];

export class SVGRenderer extends Renderer {
	readonly #svg: string[];

	readonly #scale: number;

	#backgroundColor: Color;

	public constructor(opt: RendererOptions) {
		super(opt);
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
				: ` transform="translate(${this.#formatPoint(style.translate)})"`;
			const key = style.color.hex + translate;

			let group = groups.get(key);
			if (!group) {
				group = { segments: [], attrs: `fill="${style.color.hex}"${translate}` };
				groups.set(key, group);
			}
			feature.geometry.forEach((ring) => {
				group.segments.push(ring.map((p) => this.#roundXY(p)));
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
				: ` transform="translate(${this.#formatPoint(style.translate)})"`;
			const key = [
				style.color.hex,
				this.#round(style.width),
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
							`stroke-width="${this.#round(style.width)}"`,
							`stroke-linecap="${style.cap}"`,
							`stroke-linejoin="${style.join}"`,
							`stroke-miterlimit="${String(style.miterLimit)}"`,
						].join(' ') + translate,
				};
				groups.set(key, group);
			}

			feature.geometry.forEach((line) => {
				group.segments.push(line.map((p) => this.#roundXY(p)));
			});
		});

		for (const { segments, attrs } of groups.values()) {
			const chains = chainSegments(segments);
			const d = segmentsToPath(chains);
			this.#svg.push(`<path d="${d}" ${attrs} />`);
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

	#round(v: number): string {
		return (v * this.#scale).toFixed(3);
	}

	#formatPoint(p: Point2D): string {
		const [x, y] = this.#roundXY(p);
		return formatNum(x) + ',' + formatNum(y);
	}

	#roundXY(p: Point2D): [number, number] {
		return [Math.round(p.x * this.#scale * 10), Math.round(p.y * this.#scale * 10)];
	}
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
