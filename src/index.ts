import { SVGRenderer } from './renderer/svg.js';
import { renderMap } from './pipeline/render.js';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

export async function renderToSVG(options: {
	width?: number;
	height?: number;
	scale?: number;
	style: StyleSpecification;
	lon?: number;
	lat?: number;
	zoom?: number;
}): Promise<string> {
	const width = options.width ?? 1024;
	const height = options.height ?? 1024;
	const scale = options.scale ?? 1;

	if (width <= 0) throw new Error('width must be positive');
	if (height <= 0) throw new Error('height must be positive');
	if (scale <= 0) throw new Error('scale must be positive');

	return await renderMap({
		renderer: new SVGRenderer({ width, height, scale }),
		style: options.style,
		view: {
			center: [options.lon ?? 0, options.lat ?? 0],
			zoom: options.zoom ?? 2,
		},
	});
}
