import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { createStyleLayer, type StyleLayer } from '../lib/style_layer.js';

export function getLayerStyles(layers: LayerSpecification[]): StyleLayer[] {
	return layers.map((layerSpecification) => {
		const styleLayer = createStyleLayer(layerSpecification);
		return styleLayer;
	});
}
