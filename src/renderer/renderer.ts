import { writeFileSync } from 'fs';
import type { Point, Polygon, Polyline } from '../lib/geometry.js';
import type { SVGRenderer } from './renderer_svg.js';
import type { BackgroundStyle, FillStyle, LineStyle, SymbolStyle, TextStyle } from './styles.js';
import type { RendererOptions } from '../types.js';

export abstract class Renderer {
	public readonly width: number;

	public readonly height: number;

	public readonly scale: number;

	public constructor(opt: RendererOptions) {
		this.width = opt.width;
		this.height = opt.height;
		this.scale = opt.scale;
	}

	public save(filename: string): void {
		writeFileSync(filename, this.getBuffer());
	}

	public abstract drawBackgroundFill(style: BackgroundStyle): void;
	public abstract drawPolygon(polygon: Polygon, style: FillStyle): void;
	public abstract drawLineString(polyline: Polyline, style: LineStyle): void;
	public abstract drawText(position: Point, text: string, style: TextStyle): void;
	public abstract drawSymbol(position: Point, symbol: symbol, style: SymbolStyle): void;

	public abstract getBuffer(): Buffer;
}

export type RendererClass = SVGRenderer;
