import {
	featureFilter,
	type Feature,
	type Color as MaplibreColor,
} from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../lib/color.js';
import { getLayerFeatures, getRasterTiles } from './sources/index.js';
import { getLayerStyles } from './styles.js';
import type { PossiblyEvaluatedPropertyValue } from '../lib/style_layer.js';
import type { RenderJob } from '../types.js';
import { Point2D } from '../lib/geometry.js';

export async function renderVectorTiles(job: RenderJob): Promise<string> {
	await render(job);
	return job.renderer.getString();
}

async function render(job: RenderJob): Promise<void> {
	const { renderer } = job;
	const { zoom } = job.view;
	const layerFeatures = await getLayerFeatures(job);
	const layerStyles = getLayerStyles(job.style.layers);
	const availableImages: string[] = [];
	const featureState = {};

	for (const layerStyle of layerStyles) {
		if (layerStyle.isHidden(zoom)) continue;

		layerStyle.recalculate({ zoom }, availableImages);

		function getStyleValue(obj: unknown, key: string, feature?: Feature): unknown {
			const getter = obj as { get(k: string): unknown };
			const value = getter.get(key);
			if (typeof value === 'object' && value !== null && 'evaluate' in value) {
				const evaluatable = value as PossiblyEvaluatedPropertyValue<unknown>;
				return evaluatable.evaluate(
					feature ?? ({} as Feature),
					featureState,
					undefined,
					availableImages,
				);
			}
			return value;
		}

		function getPaint(key: string, feature?: Feature): unknown {
			return getStyleValue(layerStyle.paint, key, feature);
		}

		function getLayout(key: string, feature?: Feature): unknown {
			return getStyleValue(layerStyle.layout, key, feature);
		}

		switch (layerStyle.type) {
			case 'background':
				{
					renderer.drawBackgroundFill({
						color: new Color(getPaint('background-color') as MaplibreColor),
						opacity: getPaint('background-opacity') as number,
					});
				}
				continue;
			case 'fill':
				{
					const polygons = (
						layerFeatures.get(layerStyle.sourceLayer) ?? layerFeatures.get(layerStyle.source)
					)?.polygons;
					if (!polygons || polygons.length === 0) continue;
					const filter = featureFilter(layerStyle.filter);
					const polygonFeatures = polygons.filter((feature) => filter.filter({ zoom }, feature));

					if (polygonFeatures.length === 0) continue;

					renderer.drawPolygons(
						polygonFeatures.map((feature) => [
							feature,
							{
								color: new Color(getPaint('fill-color', feature) as MaplibreColor),
								translate: new Point2D(
									...(getPaint('fill-translate', feature) as [number, number]),
								),
							},
						]),
						getPaint('fill-opacity', polygonFeatures[0]) as number,
					);
				}
				continue;
			case 'line':
				{
					const lineStrings = (
						layerFeatures.get(layerStyle.sourceLayer) ?? layerFeatures.get(layerStyle.source)
					)?.linestrings;
					if (!lineStrings || lineStrings.length === 0) continue;
					const filter = featureFilter(layerStyle.filter);
					const lineStringFeatures = lineStrings.filter((feature) =>
						filter.filter({ zoom }, feature),
					);

					if (lineStringFeatures.length === 0) continue;

					renderer.drawLineStrings(
						lineStringFeatures.map((feature) => [
							feature,
							{
								color: new Color(getPaint('line-color', feature) as MaplibreColor),
								translate: new Point2D(
									...(getPaint('line-translate', feature) as [number, number]),
								),
								blur: getPaint('line-blur', feature) as number,
								cap: getLayout('line-cap', feature) as 'butt' | 'round' | 'square',
								dasharray: getPaint('line-dasharray', feature) as number[] | undefined,
								gapWidth: getPaint('line-gap-width', feature) as number,
								join: getLayout('line-join', feature) as 'bevel' | 'miter' | 'round',
								miterLimit: getLayout('line-miter-limit', feature) as number,
								offset: getPaint('line-offset', feature) as number,
								roundLimit: getLayout('line-round-limit', feature) as number,
								width: getPaint('line-width', feature) as number,
							},
						]),
						getPaint('line-opacity', lineStringFeatures[0]) as number,
					);
				}
				continue;
			case 'raster':
				{
					const tiles = await getRasterTiles(job, layerStyle.source);
					renderer.drawRasterTiles(tiles, {
						opacity: getPaint('raster-opacity') as number,
						hueRotate: getPaint('raster-hue-rotate') as number,
						brightnessMin: getPaint('raster-brightness-min') as number,
						brightnessMax: getPaint('raster-brightness-max') as number,
						saturation: getPaint('raster-saturation') as number,
						contrast: getPaint('raster-contrast') as number,
						resampling: getPaint('raster-resampling') as 'linear' | 'nearest',
					});
				}
				continue;
			case 'circle':
				{
					const points = (
						layerFeatures.get(layerStyle.sourceLayer) ?? layerFeatures.get(layerStyle.source)
					)?.points;
					if (!points || points.length === 0) continue;
					const filter = featureFilter(layerStyle.filter);
					const pointFeatures = points.filter((feature) => filter.filter({ zoom }, feature));

					if (pointFeatures.length === 0) continue;

					renderer.drawCircles(
						pointFeatures.map((feature) => [
							feature,
							{
								color: new Color(getPaint('circle-color', feature) as MaplibreColor),
								radius: getPaint('circle-radius', feature) as number,
								blur: getPaint('circle-blur', feature) as number,
								translate: new Point2D(
									...(getPaint('circle-translate', feature) as [number, number]),
								),
								strokeWidth: getPaint('circle-stroke-width', feature) as number,
								strokeColor: new Color(getPaint('circle-stroke-color', feature) as MaplibreColor),
							},
						]),
						getPaint('circle-opacity', pointFeatures[0]) as number,
					);
				}
				continue;
			case 'color-relief':
			case 'fill-extrusion':
			case 'heatmap':
			case 'hillshade':
			case 'symbol':
				continue;
			default:
				throw Error('layerStyle.type: ' + String(layerStyle.type));
		}
	}
}
