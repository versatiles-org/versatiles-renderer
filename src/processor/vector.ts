import { Point2D, Feature } from '../lib/geometry.js';
import type { RenderJob } from '../types.js';
import { mergePolygons } from './helper.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const TILE_EXTENT = 4096;

export interface TileInfo {
	x: number;
	y: number;
	offsetX: number;
	offsetY: number;
}

export interface TileGrid {
	zoomLevel: number;
	tileSize: number;
	tiles: TileInfo[];
}

export function calculateTileGrid(
	width: number,
	height: number,
	center: Point2D,
	zoom: number,
): TileGrid {
	const zoomLevel = Math.floor(zoom);
	const tileCenterCoordinate = center.getProject2Pixel().scale(2 ** zoomLevel);
	const tileSize = 2 ** (zoom - zoomLevel + 9); // 512 (2^9) is the standard tile size

	const tileCols = width / tileSize;
	const tileRows = height / tileSize;
	const tileMinX = Math.floor(tileCenterCoordinate.x - tileCols / 2);
	const tileMinY = Math.floor(tileCenterCoordinate.y - tileRows / 2);
	const tileMaxX = Math.floor(tileCenterCoordinate.x + tileCols / 2);
	const tileMaxY = Math.floor(tileCenterCoordinate.y + tileRows / 2);

	const tiles: TileInfo[] = [];
	for (let x = tileMinX; x <= tileMaxX; x++) {
		for (let y = tileMinY; y <= tileMaxY; y++) {
			tiles.push({
				x,
				y,
				offsetX: width / 2 + (x - tileCenterCoordinate.x) * tileSize,
				offsetY: height / 2 + (y - tileCenterCoordinate.y) * tileSize,
			});
		}
	}

	return { zoomLevel, tileSize, tiles };
}

export interface TileResponse {
	buffer: ArrayBuffer;
	contentType: string;
}

export async function getTile(
	url: string,
	z: number,
	x: number,
	y: number,
): Promise<TileResponse | null> {
	const tileUrl = url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
	try {
		const response = await fetch(tileUrl);
		if (!response.ok) return null;
		const buffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
		return { buffer, contentType };
	} catch {
		console.warn(`Failed to load tile: ${tileUrl}`);
		return null;
	}
}

export async function getLayerFeatures(job: RenderJob): Promise<LayerFeatures> {
	const { width, height } = job.renderer;
	const { zoom, center } = job.view;
	const { sources } = job.style;
	const source = sources['versatiles-shortbread'] as { type: string; tiles?: string[] } | undefined;

	if (!source) return new Map();

	if (source?.type !== 'vector' || !source.tiles) {
		console.error('Invalid source configuration. Expected a vector source with tile URLs.');
		console.error('Source config:', source);
		throw Error('Invalid source');
	}
	const sourceUrl: string = source.tiles[0];

	const {
		zoomLevel,
		tileSize,
		tiles: tileCoordinates,
	} = calculateTileGrid(width, height, center, zoom);

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
