import { featureFilter, type Feature, type Color as MaplibreColor } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../lib/color.js';
import { getLayerFeatures } from './vector.js';
import { getLayerStyles } from './styles.js';
import type { StyleLayer } from '../maplibre/index.js';
import type { RenderJob } from '../types.js';
import { EvaluationParameters } from '../maplibre/index.js';
import type { PossiblyEvaluatedPropertyValue } from '../maplibre/style/properties.js';
import { Point2D } from '../lib/geometry.js';

export async function renderVectorTiles(job: RenderJob): Promise<void> {
	//console.table(layerStyles.map(l => ({ id: l.id, type: l.type })));

	await render(job);

	job.renderer.save('test.svg');
}

async function render(job: RenderJob): Promise<void> {
	const { renderer } = job;
	const { zoom } = job.view;
	const layerFeatures = await getLayerFeatures(job);
	const layerStyles = getLayerStyles(job.style.layers);
	const evaluationParameters = new EvaluationParameters(zoom);
	const availableImages: string[] = [];
	const featureState = {};

	layerStyles.forEach((layerStyle: StyleLayer) => {
		if (layerStyle.isHidden(zoom)) return;

		layerStyle.recalculate(evaluationParameters, availableImages);

		//console.log(layerFeatures);
		//const { paint: PossiblyEvaluated, layout } = layerStyle;
		//console.log(layerStyle);

		switch (layerStyle.type) {
			case 'background':
				{
					//const layer = layerStyle as BackgroundStyleLayer;
					renderer.drawBackgroundFill({
						color: new Color(getPaint<MaplibreColor>('background-color')),
						opacity: Number(getPaint<number>('background-opacity')),
					});
				}
				return;
			case 'fill':
				{
					const polygons = layerFeatures.get(layerStyle.sourceLayer)?.polygons;
					if (!polygons || polygons.length === 0) return;
					const filter = featureFilter(layerStyle.filter);
					const polygonFeatures = polygons.filter(feature => filter.filter({ zoom }, feature));

					if (polygonFeatures.length === 0) return;

					renderer.drawPolygons(
						polygonFeatures.map(feature => [feature, {
							color: new Color(getPaint<MaplibreColor>('fill-color', feature)),
							translate: new Point2D(...getPaint<[number, number]>('fill-translate', feature)),
						}]),
						getPaint<number>('fill-opacity', polygonFeatures[0]),
					);
				}
				return;
			case 'line':
				{
					const lineStrings = layerFeatures.get(layerStyle.sourceLayer)?.linestrings;
					if (!lineStrings || lineStrings.length === 0) return;
					const filter = featureFilter(layerStyle.filter);
					const lineStringFeatures = lineStrings.filter(feature => filter.filter({ zoom }, feature));

					if (lineStringFeatures.length === 0) return;

					renderer.drawLineStrings(
						lineStringFeatures.map(feature => [feature, {
							color: new Color(getPaint<MaplibreColor>('line-color', feature)),
							translate: new Point2D(...getPaint<[number, number]>('line-translate', feature)),
							blur: getPaint<number>('line-blur', feature),
							cap: getLayout<'butt' | 'round' | 'square'>('line-cap', feature),
							dasharray: getPaint<number[] | undefined>('line-dasharray', feature),
							gapWidth: getPaint<number>('line-gap-width', feature),
							join: getLayout<'bevel' | 'miter' | 'round'>('line-join', feature),
							miterLimit: getLayout<number>('line-miter-limit', feature),
							offset: getPaint<number>('line-offset', feature),
							roundLimit: getLayout<number>('line-round-limit', feature),
							width: getPaint<number>('line-width', feature),
						}]),
						getPaint<number>('line-opacity', lineStringFeatures[0]),
					);
				}
				return;
			case 'symbol':
				console.log('implement symbols');
				return;
			default:
				throw Error('layerStyle.type: ' + layerStyle.type);
		}

		function getPaint<I>(key: string, feature?: Feature): I {
			// @ts-expect-error: unsure to handle that
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			const value = layerStyle.paint.get(key) as PossiblyEvaluatedPropertyValue<I>;
			if (!value) return value;
			//console.log('getPaint', value);
			if (!value.evaluate) {
				// @ts-expect-error: unsure to handle that
				return value;
			}
			return value.evaluate(feature, featureState, availableImages);
		}

		function getLayout<I>(key: string, feature?: Feature): I {
			// @ts-expect-error: unsure to handle that
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			const value = layerStyle.layout.get(key) as PossiblyEvaluatedPropertyValue<I>;
			if (!value) return value;
			//console.log('getLayout', value);
			if (!value.evaluate) {
				// @ts-expect-error: unsure to handle that
				return value;
			}
			return value.evaluate(feature, featureState, availableImages);
		}

	});
}
