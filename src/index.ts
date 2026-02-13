import { SVGRenderer } from './renderer/renderer_svg.js';
import { renderVectorTiles } from './processor/render.js';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Point2D } from './lib/geometry.js';

export async function renderToSVG(options: {
	width?: number;
	height?: number;
	scale?: number;
	style: StyleSpecification;
	lon?: number;
	lat?: number;
	zoom?: number;
}): Promise<string> {
	return await renderVectorTiles({
		renderer: new SVGRenderer({
			width: options.width ?? 1024,
			height: options.height ?? 1024,
			scale: options.scale ?? 1,
		}),
		style: options.style,
		view: {
			center: new Point2D(options.lon ?? 0, options.lat ?? 0),
			zoom: options.zoom ?? 2,
		},
	});
}
