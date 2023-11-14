import type { Polygon, Polyline, Point } from '../lib/geometry.js';
import { Color } from '../lib/color.js';
import { Renderer } from './renderer.js';
import type { BackgroundStyle, FillStyle, LineStyle, SymbolStyle, TextStyle, RendererOptions } from '../types.js';

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
		console.log(style);
		this.#backgroundColor = style.color;
	}

	public drawPolygon(polygon: Polygon, style: FillStyle): void {
		const path: string = polygon.rings.map(ring =>
			ring.map((p, i) =>
				(i === 0 ? 'M' : 'L') + this.#roundPoint(p),
			).join('') + 'z',
		).join('');
		this.#svg.push([
			'<path',
			`d="${path}"`,
			(style.opacity === 1) ? '' : `fill-opacity="${style.opacity.toFixed(3)}"`,
			`fill="${style.color.hex}"`,
			style.translate.isZero() ? '' : `transform="translate(${this.#roundPoint(style.translate)})"`,
			'/>',
		].join(' '));
	}

	public drawLineString(polyline: Polyline, style: LineStyle): void {
		const path: string = polyline.ring.map((p, i) =>
			(i === 0 ? 'M' : 'L') + this.#roundPoint(p),
		).join('');
		this.#svg.push([
			'<path',
			`d="${path}"`,
			(style.opacity === 1) ? '' : `stroke-opacity="${style.opacity.toFixed(3)}"`,
			`stroke="${style.color.hex}"`,
			`stroke-width="${this.#round(style.width)}"`,
			style.translate.isZero() ? '' : `transform="translate(${this.#roundPoint(style.translate)})"`,
			'/>',
		].join(' '));
	}

	public drawText(position: Point, text: string, style: TextStyle): void {
		// implement me!
	}

	public drawSymbol(position: Point, symbol: symbol, style: SymbolStyle): void {
		// implement me!
	}

	public getBuffer(): Buffer {
		return Buffer.from([
			`<svg viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg" fill="${this.#backgroundColor.hex}">`,
			...this.#svg,
			'</svg>',
		].join('\n'));
	}

	#round(v: number): string {
		return (v * this.#scale).toFixed(3);
	}

	#roundPoint(p: Point): string {
		return (p.x * this.#scale).toFixed(3) + ',' + (p.y * this.#scale).toFixed(3);
	}
}