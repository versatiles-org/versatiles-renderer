import {
	featureFilter,
	type Feature,
	type Color as MaplibreColor,
} from '@maplibre/maplibre-gl-style-spec';
import { getLayerFeatures, getRasterTiles } from '../sources/index.js';
import { getLayerStyles } from './style_layer.js';
import type { PossiblyEvaluatedPropertyValue, StyleLayer } from './style_layer.js';
import type { RenderJob } from '../renderer/svg.js';
import type { Features, LayerFeatures } from '../geometry.js';

export async function renderMap(job: RenderJob): Promise<string> {
	await render(job);
	return job.renderer.getString();
}

function getFeatures(layerFeatures: LayerFeatures, layerStyle: StyleLayer): Features | undefined {
	return layerFeatures.get(layerStyle.sourceLayer) ?? layerFeatures.get(layerStyle.source);
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

		function getPaint<T>(key: string, feature?: Feature): T {
			return getStyleValue(layerStyle.paint, key, feature) as T;
		}

		function getLayout<T>(key: string, feature?: Feature): T {
			return getStyleValue(layerStyle.layout, key, feature) as T;
		}

		switch (layerStyle.type) {
			case 'background':
				{
					renderer.drawBackgroundFill({
						color: getPaint<MaplibreColor>('background-color'),
						opacity: getPaint<number>('background-opacity'),
					});
				}
				continue;
			case 'fill':
				{
					const polygons = getFeatures(layerFeatures, layerStyle)?.polygons;
					if (!polygons || polygons.length === 0) continue;
					const filter = featureFilter(layerStyle.filter);
					const polygonFeatures = polygons.filter((feature) => filter.filter({ zoom }, feature));

					if (polygonFeatures.length === 0) continue;

					renderer.drawPolygons(
						polygonFeatures.map((feature) => [
							feature,
							{
								color: getPaint<MaplibreColor>('fill-color', feature),
								translate: getPaint<[number, number]>('fill-translate', feature),
							},
						]),
						getPaint<number>('fill-opacity', polygonFeatures[0]),
					);
				}
				continue;
			case 'line':
				{
					const lineStrings = getFeatures(layerFeatures, layerStyle)?.linestrings;
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
								color: getPaint<MaplibreColor>('line-color', feature),
								translate: getPaint<[number, number]>('line-translate', feature),
								cap: getLayout<'butt' | 'round' | 'square'>('line-cap', feature),
								dasharray: getPaint<number[] | undefined>('line-dasharray', feature),
								join: getLayout<'bevel' | 'miter' | 'round'>('line-join', feature),
								miterLimit: getLayout<number>('line-miter-limit', feature),
								offset: getPaint<number>('line-offset', feature),
								width: getPaint<number>('line-width', feature),
							},
						]),
						getPaint<number>('line-opacity', lineStringFeatures[0]),
					);
				}
				continue;
			case 'raster':
				{
					const tiles = await getRasterTiles(job, layerStyle.source);
					renderer.drawRasterTiles(tiles, {
						opacity: getPaint<number>('raster-opacity'),
						hueRotate: getPaint<number>('raster-hue-rotate'),
						brightnessMin: getPaint<number>('raster-brightness-min'),
						brightnessMax: getPaint<number>('raster-brightness-max'),
						saturation: getPaint<number>('raster-saturation'),
						contrast: getPaint<number>('raster-contrast'),
						resampling: getPaint<'linear' | 'nearest'>('raster-resampling'),
					});
				}
				continue;
			case 'circle':
				{
					const points = getFeatures(layerFeatures, layerStyle)?.points;
					if (!points || points.length === 0) continue;
					const filter = featureFilter(layerStyle.filter);
					const pointFeatures = points.filter((feature) => filter.filter({ zoom }, feature));

					if (pointFeatures.length === 0) continue;

					renderer.drawCircles(
						pointFeatures.map((feature) => [
							feature,
							{
								color: getPaint<MaplibreColor>('circle-color', feature),
								radius: getPaint<number>('circle-radius', feature),
								translate: getPaint<[number, number]>('circle-translate', feature),
								strokeWidth: getPaint<number>('circle-stroke-width', feature),
								strokeColor: getPaint<MaplibreColor>('circle-stroke-color', feature),
							},
						]),
						getPaint<number>('circle-opacity', pointFeatures[0]),
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
