import type { VersaTiles } from '@versatiles/container';
import type { RendererClass } from './renderer/renderer.js';
import type { Point } from './lib/geometry.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

export interface View {
	center: Point;
	zoom: number;
}

export interface RenderJob {
	container: VersaTiles;
	style: StyleSpecification;
	view: View;
	renderer: RendererClass;
}

export interface RendererOptions {
	width: number;
	height: number;
	scale: number;
}
