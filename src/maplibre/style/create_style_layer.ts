import {FillStyleLayer} from './style_layer/fill_style_layer.js';
import {LineStyleLayer} from './style_layer/line_style_layer.js';
import {SymbolStyleLayer} from './style_layer/symbol_style_layer.js';
import {BackgroundStyleLayer} from './style_layer/background_style_layer.js';

import type {LayerSpecification} from '@maplibre/maplibre-gl-style-spec';
import type {StyleLayer} from './style_layer.js';

export function createStyleLayer(layer: LayerSpecification, globalState: Record<string, any> = {}): StyleLayer {
	switch (layer.type) {
		case 'background':
			return new BackgroundStyleLayer(layer, globalState);
		case 'fill':
			return new FillStyleLayer(layer, globalState);
		case 'line':
			return new LineStyleLayer(layer, globalState);
		case 'symbol':
			return new SymbolStyleLayer(layer, globalState);
		default:
			throw Error('Unsupported layer type: ' + layer.type);
	}
}
