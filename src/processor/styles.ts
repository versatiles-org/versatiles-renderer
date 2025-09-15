import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { createStyleLayer } from '../maplibre/index.js';
import type { StyleLayer } from '../maplibre/style/style_layer.js';

export function getLayerStyles(layers: LayerSpecification[]): StyleLayer[] {

	return layers.map(layerSpecification => {
		const styleLayer = createStyleLayer(layerSpecification);
		return styleLayer;
	});
}
