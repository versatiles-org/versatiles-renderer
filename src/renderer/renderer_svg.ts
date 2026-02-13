import type { Feature, Point2D } from '../lib/geometry.js';
import { Color } from '../lib/color.js';
import { Renderer } from './renderer.js';
import type { BackgroundStyle, FillStyle, LineStyle, RendererOptions } from '../types.js';

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
		this.#svg.push(`<g opacity="${String(opacity)}">`);

		const groups = new Map<string, { paths: string[]; attrs: string }>();
		features.forEach(([feature, style]) => {
			if (style.color.alpha <= 0) return;

			const path: string = feature.geometry
				.map(
					(ring) => ring.map((p, i) => (i === 0 ? 'M' : 'L') + this.#roundPoint(p)).join('') + 'z',
				)
				.join('');

			const translate = style.translate.isZero()
				? ''
				: ` transform="translate(${this.#roundPoint(style.translate)})"`;
			const key = style.color.hex + translate;

			let group = groups.get(key);
			if (!group) {
				group = { paths: [], attrs: `fill="${style.color.hex}"${translate}` };
				groups.set(key, group);
			}
			group.paths.push(path);
		});

		for (const { paths, attrs } of groups.values()) {
			this.#svg.push(`<path d="${paths.join('')}" ${attrs} />`);
		}

		this.#svg.push('</g>');
	}

	public drawLineStrings(features: [Feature, LineStyle][], opacity: number): void {
		this.#svg.push(`<g opacity="${String(opacity)}">`);

		const groups = new Map<string, { paths: string[]; attrs: string }>();
		features.forEach(([feature, style]) => {
			if (style.width <= 0 || style.color.alpha <= 0) return;

			const translate = style.translate.isZero()
				? ''
				: ` transform="translate(${this.#roundPoint(style.translate)})"`;
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
					paths: [],
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
				group.paths.push(line.map((p, i) => (i === 0 ? 'M' : 'L') + this.#roundPoint(p)).join(''));
			});
		});

		for (const { paths, attrs } of groups.values()) {
			this.#svg.push(`<path d="${paths.join('')}" ${attrs} />`);
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

	#roundPoint(p: Point2D): string {
		return (p.x * this.#scale).toFixed(1) + ',' + (p.y * this.#scale).toFixed(1);
	}
}
