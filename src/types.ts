import type { RendererClass } from './renderer/renderer.js';
import type { Point2D } from './lib/geometry.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Color } from './lib/color.js';

export interface View {
	center: Point2D;
	zoom: number;
}

export interface RenderJob {
	style: StyleSpecification;
	view: View;
	renderer: RendererClass;
}

export interface RendererOptions {
	width: number;
	height: number;
	scale: number;
}

export interface StyleOptions {
	zoom: number;
}

export interface BackgroundStyle {
	color: Color;
	opacity: number;
}

export interface FillStyle {
	color: Color;
	translate: Point2D;
}

export interface LineStyle {
	blur: number;
	cap: 'butt' | 'round' | 'square';
	color: Color;
	dasharray?: number[];
	gapWidth: number;
	join: 'bevel' | 'miter' | 'round';
	miterLimit: number;
	offset: number;
	roundLimit: number;
	translate: Point2D;
	width: number;
}

export interface TextStyle {
	color: Color;
}

export interface SymbolStyle {
	color: Color;
}

