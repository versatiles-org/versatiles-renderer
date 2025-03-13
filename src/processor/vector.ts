import { Point2D, Feature } from '../lib/geometry.js';
import type { RenderJob } from '../types.js';
import { mergePolygons } from './helper.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';


export async function getLayerFeatures(job: RenderJob): Promise<LayerFeatures> {
	const { width, height } = job.renderer;
	const { zoom, center } = job.view;

	const zoomLevel = Math.floor(zoom);
	const tileCenterCoordinate = center.getProject2Pixel().scale(2 ** zoomLevel);

	const tileSize = 2 ** (zoom - zoomLevel + 8);

	const tileCols = width / tileSize;
	const tileRows = height / tileSize;
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
		const offset = new Point2D(
			width / 2 + (x - tileCenterCoordinate.x) * tileSize,
			height / 2 + (y - tileCenterCoordinate.y) * tileSize,
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
				const featureSrc = layer.feature(i);
				const geometry = featureSrc.loadGeometry().map(ring =>
					ring.map(point =>
						new Point2D(point.x, point.y).scale(tileSize / 4096).translate(offset),
					),
				);

				let type: 'LineString' | 'Point' | 'Polygon';
				let list: Feature[];
				switch (featureSrc.type) {
					case 0: //Unknown
						throw Error();
						continue; //ignore;
					case 1: //Point
						type = 'Point';
						list = features.points;
						break;
					case 2: //LineString
						type = 'LineString';
						list = features.linestrings;
						break;
					case 3: //Polygon
						type = 'Polygon';
						list = features.polygons;
						break;
				}

				const feature = new Feature({
					type,
					geometry,
					id: featureSrc.id,
					properties: featureSrc.properties,
				});

				if (feature.doesOverlap([0, 0, width, height])) list.push(feature);
			}
		}
	}));

	for (const [name, features] of layerFeatures) {
		layerFeatures.set(name, {
			points: features.points,
			linestrings: features.linestrings,
			polygons: mergePolygons(features.polygons),
		});
	}

	return layerFeatures;
}

interface Features {
	points: Feature[];
	linestrings: Feature[];
	polygons: Feature[];
}

type LayerFeatures = Map<string, Features>;
