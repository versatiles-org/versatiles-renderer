import { writeFileSync } from 'fs';
import type { PixelCoordinate, Polygon, Polyline } from '../lib/geometry.js';
import type { SVGRenderer } from './renderer_svg.js';
import type { BackgroundStyle, FillStyle, LineStyle, SymbolStyle, TextStyle } from './styles.js';

export abstract class Renderer {
	protected readonly width: number;

	protected readonly height: number;

	protected readonly scale: number;

	public constructor(opt: { width: number; height: number; scale: number }) {
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
	public abstract drawText(position: PixelCoordinate, text: string, style: TextStyle): void;
	public abstract drawSymbol(position: PixelCoordinate, symbol: symbol, style: SymbolStyle): void;

	public abstract getBuffer(): Buffer;
}

export type RendererClass = SVGRenderer;
