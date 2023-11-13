import { Polygon, Polyline } from '../lib/geometry.js';
import { Point } from '../lib/geometry.js';
import type { RenderJob } from '../types.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { createStyleLayer } from '../../node_modules/maplibre-gl/src/style/create_style_layer.js';
import type { StyleLayer } from '../../node_modules/maplibre-gl/src/style/style_layer.js';
import { EvaluationParameters } from 'maplibre-gl/src/style/evaluation_parameters.js';
import type { TransitionParameters } from 'maplibre-gl/src/style/properties.js';

export async function processVectorTiles(job: RenderJob): Promise<void> {
	const layerFeatures = await getLayerFeatures(job);

	const { renderer } = job;

	/*
	const styleOptions: StyleOptions = {
		zoom: job.view.zoom,
	};
	*/

	const evaluationParameters = new EvaluationParameters(job.view.zoom);
	const availableImages: string[] = [];
	const transitionParameters: TransitionParameters = {
		now: 0,
		transition: {},
	};

	job.style.layers.forEach(layerSpecification => {
		console.log('Z1');
		const styleLayer = createStyleLayer(layerSpecification);
		console.log('Z2');
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


	/*
		switch (layer.type) {
			case 'background':
				const styleB = makeBackgroundStyle(layer, styleOptions);
				renderer.drawBackgroundFill(styleB);
				break;
			case 'fill':
				const styleF = makeFillStyle(layer, styleOptions);
				const source: string = layer['source-layer'] ?? '';
				const polygons: Polygon[] = layerFeatures.get(source)?.polygons ?? [];
				for (const polygon of polygons) {
					renderer.drawPolygon(polygon, styleF);
				}
				break;
			default:
				throw Error('layer.type: ' + layer.type);
		}
	}
	*/
	//console.log({ tileCenterCoordinate, tileCols, tileRows });
	//console.log(tileCoordinates);
}

async function getLayerFeatures(job: RenderJob): Promise<LayerFeatures> {
	const { width, height } = job.renderer;
	const { zoom, center } = job.view;

	const zoomLevel = Math.floor(zoom);
	const tileCenterCoordinate = center.getProject2Pixel().scale(2 ** zoomLevel);

	const scale = 2 ** (zoom - zoomLevel + 8);

	const tileCols = width / scale;
	const tileRows = height / scale;
	const tileMinX = Math.floor(tileCenterCoordinate.x - tileCols / 2);
	const tileMinY = Math.floor(tileCenterCoordinate.y - tileRows / 2);
	const tileMaxX = Math.floor(tileCenterCoordinate.x + tileCols / 2);
	const tileMaxY = Math.floor(tileCenterCoordinate.y + tileRows / 2);
	const tileCoordinates = [];
	for (let x = tileMinX; x <= tileMaxX; x++) {
		for (let y = tileMinY; y <= tileMaxY; y++) {
			tileCoordinates.push({ x, y });
		}
	}

	const layerFeatures: LayerFeatures = new Map();

	await Promise.all(tileCoordinates.map(async ({ x, y }: { x: number; y: number }): Promise<void> => {
		const offset = new Point(
			width / 2 + (x - tileCenterCoordinate.x) * scale,
			height / 2 + (y - tileCenterCoordinate.y) * scale,
		);

		const buffer = await job.container.getTileUncompressed(zoomLevel, x, y);
		if (!buffer) return;

		const vectorTile = new VectorTile(new Protobuf(buffer));
		for (const [name, layer] of Object.entries(vectorTile.layers)) {

			let features: Features;
			if (layerFeatures.has(name)) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				features = layerFeatures.get(name)!;
			} else {
				features = { points: [], linestrings: [], polygons: [] };
				layerFeatures.set(name, features);
			}

			for (let i = 0; i < layer.length; i++) {
				const feature = layer.feature(i);
				const geometry = feature.loadGeometry();
				switch (feature.type) {
					case 0: //Unknown
						continue; //ignore;
					case 1: //Point
						geometry.forEach(ring => {
							ring.forEach(p => {
								features.points.push(new Point(
									p.x,
									p.y,
									feature.properties,
								).scale(scale / 4096).translate(offset));
							});
						});
						break;
					case 2: //LineString
						geometry.forEach(ring => {
							features.linestrings.push(new Polyline(
								ring.map(p => new Point(p.x, p.y).scale(scale / 4096).translate(offset)),
								feature.properties,
							));
						});
						break;
					case 3: //Polygon
						features.polygons.push(new Polygon(
							geometry.map(ring =>
								ring.map(p => new Point(p.x, p.y).scale(scale / 4096).translate(offset)),
							), feature.properties,
						));
						break;
				}
			}
		}
	}));

	return layerFeatures;
}

interface Features {
	points: Point[];
	linestrings: Polyline[];
	polygons: Polygon[];
}

type LayerFeatures = Map<string, Features>;
