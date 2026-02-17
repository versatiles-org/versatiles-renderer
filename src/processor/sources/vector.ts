import { Point2D, Feature } from '../../lib/geometry.js';
import type { RenderJob } from '../../types.js';
import { calculateTileGrid, getTile } from './tiles.js';
import type { LayerFeatures } from './types.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const TILE_EXTENT = 4096;

export async function loadVectorSource(
	source: Record<string, unknown>,
	job: RenderJob,
	layerFeatures: LayerFeatures,
): Promise<void> {
	const tiles = source.tiles as string[] | undefined;
	if (!tiles) return;

	const { width, height } = job.renderer;
	const { zoom, center } = job.view;

	const {
		zoomLevel,
		tileSize,
		tiles: tileCoordinates,
	} = calculateTileGrid(width, height, center, zoom, source.maxzoom as number | undefined);

	await Promise.all(
		tileCoordinates.map(async ({ x, y, offsetX, offsetY }): Promise<void> => {
			const offset = new Point2D(offsetX, offsetY);

			const tile = await getTile(tiles[0], zoomLevel, x, y);
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
}
