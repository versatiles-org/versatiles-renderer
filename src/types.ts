import type { VersaTiles } from '@versatiles/container';
import type { RendererClass } from './renderer/renderer.js';
import type { Style } from 'mapbox-gl';
import type { Point } from './lib/geometry.js';

export interface View {
	center: Point;
	zoom: number;
}

export interface RenderJob {
	container: VersaTiles;
	style: Style;
	view: View;
	renderer: RendererClass;
}

export interface RendererOptions {
	width: number;
	height: number;
	scale: number;
}
