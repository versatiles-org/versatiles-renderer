import { createStyleLayer } from '../maplibre/index.js';
import type { StyleLayer } from '../maplibre/style/style_layer.js';
import type { RenderJob } from '../types.js';

export function getLayerStyles(job: RenderJob): void {

	job.style.layers.forEach(layerSpecification => {
		const styleLayer = createStyleLayer(layerSpecification) as StyleLayer;
		console.log(styleLayer);
		styleLayer.recalculate(evaluationParameters, availableImages);
		process.exit();
		switch (styleLayer.type) {
			case 'background':
				console.log(styleLayer);

				//styleLayer.
				//const styleB = makeBackgroundStyle(layer, styleOptions);
				//renderer.drawBackgroundFill(styleB);
				break;
			default:
				throw Error('styleLayer.type: ' + styleLayer.type);
		}
	});
}