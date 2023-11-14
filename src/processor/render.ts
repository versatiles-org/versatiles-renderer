import { Color } from '../lib/color.js';
import { getLayerFeatures } from './vector.js';
import { getLayerStyles } from './styles.js';
import type { BackgroundPaintProps, StyleLayer, PossiblyEvaluated, BackgroundPaintPropsPossiblyEvaluated, FillPaintProps, FillPaintPropsPossiblyEvaluated } from '../maplibre/index.js';
import type { RenderJob } from '../types.js';
import { Polygon } from '../lib/geometry.js';
import { EvaluationParameters } from '../maplibre/index.js';
import { BackgroundStyleLayer } from '../maplibre/style/style_layer/background_style_layer.js';

export async function renderVectorTiles(job: RenderJob): Promise<void> {
	const { renderer } = job;
	const { zoom } = job.view;

	const layerFeatures = await getLayerFeatures(job);
	const layerStyles = getLayerStyles(job.style.layers);
	const evaluationParameters = new EvaluationParameters(zoom);
	const availableImages: string[] = [];

	layerStyles.forEach((layerStyle: StyleLayer) => {
		if (layerStyle.isHidden(zoom)) return;

		layerStyle.recalculate(evaluationParameters, availableImages);

		//const { paint: PossiblyEvaluated, layout } = layerStyle;

		switch (layerStyle.type) {
			case 'background':
				const { paint: paintB } = layerStyle as BackgroundStyleLayer;
				renderer.drawBackgroundFill({
					color: new Color(paintB.get('background-color')),
					opacity: Number(paintB.get('background-opacity')),
				});
				break;
			case 'fill':
				const polygons: Polygon[] | undefined = layerFeatures.get(layerStyle.id)?.polygons;
				if (!polygons || polygons.length === 0) return;


				const { layout: layoutF, paint: paintF } = layerStyle as BackgroundStyleLayer;

				polygons.forEach(polygon => {
					renderer.drawPolygon(polygon,
						{
							color: new Color(paintF.get('background-color')),
							opacity: Number(paintF.get('background-opacity')),
						}
					);
				})
				break;
			default:
				throw Error('layerStyle.type: ' + layerStyle.type);
		}
	});
}