import type { Color as MaplibreColor, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Feature } from '../geometry.js';
import type { SpriteAtlas } from '../sources/sprite.js';

export interface View {
	center: [number, number];
	zoom: number;
}

export interface Renderer {
	readonly width: number;
	readonly height: number;
	drawBackgroundFill(style: BackgroundStyle): void;
	drawPolygons(features: [Feature, FillStyle][]): void;
	drawLineStrings(features: [Feature, LineStyle][]): void;
	drawCircles(features: [Feature, CircleStyle][]): void;
	drawSymbols(features: [Feature, SymbolStyle][]): void;
	drawIcons(features: [Feature, IconStyle][], spriteAtlas: SpriteAtlas): void;
	drawRasterTiles(tiles: RasterTile[], style: RasterStyle): void;
	getString(): string;
}

export interface RenderJob {
	style: StyleSpecification;
	view: View;
	renderer: Renderer;
	renderLabels?: boolean;
}

export interface RendererOptions {
	width: number;
	height: number;
}

export interface BackgroundStyle {
	color: MaplibreColor;
	opacity: number;
}

export interface FillStyle {
	color: MaplibreColor;
	opacity: number;
	translate: [number, number];
}

export interface LineStyle {
	cap: 'butt' | 'round' | 'square';
	color: MaplibreColor;
	dasharray?: number[];
	join: 'bevel' | 'miter' | 'round';
	miterLimit: number;
	offset: number;
	opacity: number;
	translate: [number, number];
	width: number;
}

export interface CircleStyle {
	color: MaplibreColor;
	opacity: number;
	radius: number;
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

export interface SymbolStyle {
	text: string;
	size: number;
	font: string[];
	anchor: string;
	offset: [number, number];
	rotate: number;
	color: MaplibreColor;
	opacity: number;
	haloColor: MaplibreColor;
	haloWidth: number;
}

export interface IconStyle {
	image: string;
	size: number;
	anchor: string;
	offset: [number, number];
	rotate: number;
	opacity: number;
}

export interface RasterTile {
	x: number;
	y: number;
	width: number;
	height: number;
	dataUri: string;
}
