import type { VersaTiles } from '@versatiles/container';
import type { Style } from 'util';
import type { RendererClass } from './renderer/renderer.js';

interface GeoCoordinate {
	lon: number;
	lat: number;
}

interface Viewport {
	width: number;
	height: number;
	center: GeoCoordinate;
	zoom: number;
	scale: number;
}

export interface RenderJob {
	container: VersaTiles;
	style: Style;
	viewport: Viewport;
	rendererClass: RendererClass;
}
