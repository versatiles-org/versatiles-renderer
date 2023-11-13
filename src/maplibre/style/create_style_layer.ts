//import { CircleStyleLayer } from './style_layer/circle_style_layer.js';
//import { HeatmapStyleLayer } from './style_layer/heatmap_style_layer.js';
//import { HillshadeStyleLayer } from './style_layer/hillshade_style_layer.js';
import { FillStyleLayer } from './style_layer/fill_style_layer.js';
//import { FillExtrusionStyleLayer } from './style_layer/fill_extrusion_style_layer.js';
import { LineStyleLayer } from './style_layer/line_style_layer.js';
import { SymbolStyleLayer } from './style_layer/symbol_style_layer.js';
import { BackgroundStyleLayer } from './style_layer/background_style_layer.js';
//import { RasterStyleLayer } from './style_layer/raster_style_layer.js';
//import { CustomStyleLayer, type CustomLayerInterface } from './style_layer/custom_style_layer.js';

import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

export function createStyleLayer(layer: LayerSpecification): StyleLayer {
	switch (layer.type) {
		case 'background':
			return new BackgroundStyleLayer(layer);
		case 'fill':
			return new FillStyleLayer(layer);
		case 'line':
			return new LineStyleLayer(layer);
		case 'symbol':
			return new SymbolStyleLayer(layer);
		default:
			throw Error('implement me!');

		/*
		case 'circle':
			return new CircleStyleLayer(layer);
		case 'fill-extrusion':
			return new FillExtrusionStyleLayer(layer);
		case 'heatmap':
			return new HeatmapStyleLayer(layer);
		case 'hillshade':
			return new HillshadeStyleLayer(layer);
		case 'raster':
			return new RasterStyleLayer(layer);
		*/
	}
}

