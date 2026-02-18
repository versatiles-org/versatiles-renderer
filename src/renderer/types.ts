import type { Color as MaplibreColor, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { SVGRenderer } from './svg.js';

export interface View {
	center: [number, number];
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
	color: MaplibreColor;
	opacity: number;
}

export interface FillStyle {
	color: MaplibreColor;
	translate: [number, number];
}

export interface LineStyle {
	blur: number;
	cap: 'butt' | 'round' | 'square';
	color: MaplibreColor;
	dasharray?: number[];
	gapWidth: number;
	join: 'bevel' | 'miter' | 'round';
	miterLimit: number;
	offset: number;
	roundLimit: number;
	translate: [number, number];
	width: number;
}

export interface CircleStyle {
	color: MaplibreColor;
	radius: number;
	blur: number;
	translate: [number, number];
	strokeWidth: number;
	strokeColor: MaplibreColor;
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
