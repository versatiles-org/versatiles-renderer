import type { Feature, Point2D } from '../lib/geometry';
import { Color } from '../lib/color';
import { Renderer } from './renderer';
import type { BackgroundStyle, FillStyle, LineStyle, RendererOptions } from '../types';

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
		features.forEach(([feature, style]) => {
			const path: string = feature.geometry.map(ring =>
				ring.map((p, i) => (i === 0 ? 'M' : 'L') + this.#roundPoint(p))
					.join('') + 'z',
			).join('');
			this.#svg.push([
				'<path',
				`d="${path}"`,
				`fill="${style.color.hex}"`,
				style.translate.isZero() ? '' : `transform="translate(${this.#roundPoint(style.translate)})"`,
				'/>',
			].join(' '));
		});
		this.#svg.push('</g>');
	}

	public drawLineStrings(features: [Feature, LineStyle][], opacity: number): void {
		this.#svg.push(`<g opacity="${String(opacity)}">`);
		features.forEach(([feature, style]) => {
			feature.geometry.forEach(line => {
				const path: string = line.map((p, i) =>
					(i === 0 ? 'M' : 'L') + this.#roundPoint(p),
				).join('');
				this.#svg.push([
					'<path',
					`d="${path}"`,
					'fill="none"',
					`stroke="${style.color.hex}"`,
					`stroke-width="${this.#round(style.width)}"`,
					style.translate.isZero() ? '' : `transform="translate(${this.#roundPoint(style.translate)})"`,
					`stroke-linecap="${style.cap}"`,
					`stroke-linejoin="${style.join}"`,
					`stroke-miterlimit="${String(style.miterLimit)}"`,
					'/>',
				].join(' '));
			});
		});
		this.#svg.push('</g>');
	}

	//	public drawText(feature: Feature, text: string, style: TextStyle): void {
	//		throw Error('implement me');
	// implement me!
	//	}

	//	public drawSymbol(feature: Feature, symbol: symbol, style: SymbolStyle): void {
	//		throw Error('implement me');
	// implement me!
	//	}

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