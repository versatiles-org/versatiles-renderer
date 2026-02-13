import { Point2D, Feature } from '../lib/geometry.js';
import type { RenderJob } from '../types.js';
import { mergePolygons } from './helper.js';
import { calculateTileGrid, getTile } from './tiles.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const TILE_EXTENT = 4096;

export async function getLayerFeatures(job: RenderJob): Promise<LayerFeatures> {
	const { width, height } = job.renderer;
	const { zoom, center } = job.view;
	const { sources } = job.style;
	const source = sources['versatiles-shortbread'] as
		| { type: string; tiles?: string[]; maxzoom?: number }
		| undefined;

	if (!source) return new Map();

	if (source.type !== 'vector' || !source.tiles) {
		console.error('Invalid source configuration. Expected a vector source with tile URLs.');
		console.error('Source config:', source);
		throw Error('Invalid source');
	}
	const sourceUrl: string = source.tiles[0];

	const {
		zoomLevel,
		tileSize,
		tiles: tileCoordinates,
	} = calculateTileGrid(width, height, center, zoom, source.maxzoom);

	const layerFeatures: LayerFeatures = new Map();

	await Promise.all(
		tileCoordinates.map(async ({ x, y, offsetX, offsetY }): Promise<void> => {
			const offset = new Point2D(offsetX, offsetY);

			const tile = await getTile(sourceUrl, zoomLevel, x, y);
			if (!tile) return;

			const vectorTile = new VectorTile(new Protobuf(tile.buffer));
			for (const [name, layer] of Object.entries(vectorTile.layers)) {
				let features = layerFeatures.get(name);
				if (!features) {
					features = { points: [], linestrings: [], polygons: [] };
					layerFeatures.set(name, features);
				}

				for (let i = 0; i < layer.length; i++) {
					const featureSrc = layer.feature(i);
					const geometry = featureSrc
						.loadGeometry()
						.map((ring) =>
							ring.map((point) =>
								new Point2D(point.x, point.y).scale(tileSize / TILE_EXTENT).translate(offset),
							),
						);

					let type: 'LineString' | 'Point' | 'Polygon';
					let list: Feature[];
					switch (featureSrc.type) {
						case 0: //Unknown
							throw Error('Unknown feature type in vector tile');
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
		}),
	);

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
