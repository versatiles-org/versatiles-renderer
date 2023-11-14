import { writeFileSync } from 'fs';
import type { Feature, Point2D } from '../lib/geometry.js';
import type { SVGRenderer } from './renderer_svg.js';
import type { BackgroundStyle, FillStyle, LineStyle, SymbolStyle, TextStyle, RendererOptions } from '../types.js';

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
	public abstract drawPolygons(features: [Feature, FillStyle][], opacity: number): void;
	public abstract drawLineStrings(features: [Feature, LineStyle][], opacity: number): void;
	public abstract drawText(position: Point2D, text: string, style: TextStyle): void;
	public abstract drawSymbol(position: Point2D, symbol: symbol, style: SymbolStyle): void;

	public abstract getBuffer(): Buffer;
}

export type RendererClass = SVGRenderer;
