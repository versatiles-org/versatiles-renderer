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

	const layerFeatures: LayerFeatures = new Map();

	for (const [sourceName, sourceSpec] of Object.entries(sources)) {
		const source = sourceSpec as Record<string, unknown>;

		switch (source.type) {
			case 'vector':
				await loadVectorSource(source, job, layerFeatures);
				break;
			case 'geojson':
				if (source.data) {
					loadGeoJSONSource(sourceName, source.data, width, height, zoom, center, layerFeatures);
				}
				break;
		}
	}

	for (const [name, features] of layerFeatures) {
		layerFeatures.set(name, {
			points: features.points,
			linestrings: features.linestrings,
			polygons: mergePolygons(features.polygons),
		});
	}

	return layerFeatures;
}

async function loadVectorSource(
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

type Coord = [number, number];

function loadGeoJSONSource(
	sourceName: string,
	data: unknown,
	width: number,
	height: number,
	zoom: number,
	center: Point2D,
	layerFeatures: LayerFeatures,
): void {
	const existing = layerFeatures.get(sourceName);
	const features: Features = existing ?? { points: [], linestrings: [], polygons: [] };
	if (!existing) layerFeatures.set(sourceName, features);

	const worldSize = 512 * 2 ** zoom;
	const centerMercator = center.getProject2Pixel();

	function projectCoord(coord: Coord): Point2D {
		const mercator = new Point2D(coord[0], coord[1]).getProject2Pixel();
		return new Point2D(
			(mercator.x - centerMercator.x) * worldSize + width / 2,
			(mercator.y - centerMercator.y) * worldSize + height / 2,
		);
	}

	function addFeature(
		type: 'LineString' | 'Point' | 'Polygon',
		geometry: Point2D[][],
		id: unknown,
		properties: Record<string, unknown>,
	): void {
		const feature = new Feature({ type, geometry, id, properties });
		if (!feature.doesOverlap([0, 0, width, height])) return;
		switch (type) {
			case 'Point':
				features.points.push(feature);
				break;
			case 'LineString':
				features.linestrings.push(feature);
				break;
			case 'Polygon':
				features.polygons.push(feature);
				break;
		}
	}

	function processGeometry(
		geom: Record<string, unknown>,
		id: unknown,
		properties: Record<string, unknown>,
	): void {
		const coords = geom.coordinates as unknown;
		switch (geom.type) {
			case 'Point':
				addFeature('Point', [[projectCoord(coords as Coord)]], id, properties);
				break;
			case 'MultiPoint':
				addFeature(
					'Point',
					(coords as Coord[]).map((c) => [projectCoord(c)]),
					id,
					properties,
				);
				break;
			case 'LineString':
				addFeature('LineString', [(coords as Coord[]).map((c) => projectCoord(c))], id, properties);
				break;
			case 'MultiLineString':
				addFeature(
					'LineString',
					(coords as Coord[][]).map((line) => line.map((c) => projectCoord(c))),
					id,
					properties,
				);
				break;
			case 'Polygon':
				addFeature(
					'Polygon',
					(coords as Coord[][]).map((ring) => ring.map((c) => projectCoord(c))),
					id,
					properties,
				);
				break;
			case 'MultiPolygon':
				addFeature(
					'Polygon',
					(coords as Coord[][][]).flatMap((polygon) =>
						polygon.map((ring) => ring.map((c) => projectCoord(c))),
					),
					id,
					properties,
				);
				break;
			case 'GeometryCollection':
				for (const g of geom.geometries as Record<string, unknown>[]) {
					processGeometry(g, id, properties);
				}
				break;
		}
	}

	const geojson = data as Record<string, unknown>;
	switch (geojson.type) {
		case 'FeatureCollection':
			for (const f of geojson.features as Record<string, unknown>[]) {
				processGeometry(
					f.geometry as Record<string, unknown>,
					f.id,
					(f.properties ?? {}) as Record<string, unknown>,
				);
			}
			break;
		case 'Feature':
			processGeometry(
				geojson.geometry as Record<string, unknown>,
				geojson.id,
				(geojson.properties ?? {}) as Record<string, unknown>,
			);
			break;
		default:
			processGeometry(geojson, undefined, {});
			break;
	}
}

interface Features {
	points: Feature[];
	linestrings: Feature[];
	polygons: Feature[];
}

type LayerFeatures = Map<string, Features>;
