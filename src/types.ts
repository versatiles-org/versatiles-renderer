import type { SVGRenderer } from './renderer/renderer_svg.js';
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
	renderer: SVGRenderer;
}

export interface RendererOptions {
	width: number;
	height: number;
	scale: number;
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

export interface RasterStyle {
	opacity: number;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
	resampling: 'linear' | 'nearest';
}

export interface RasterTile {
	x: number;
	y: number;
	width: number;
	height: number;
	dataUri: string;
}
