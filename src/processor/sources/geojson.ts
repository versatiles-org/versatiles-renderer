import { Point2D, Feature } from '../../lib/geometry.js';
import type { Features, LayerFeatures } from './types.js';

type Coord = [number, number];

export function loadGeoJSONSource(
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

	function makeFeature(
		type: 'LineString' | 'Point' | 'Polygon',
		geometry: Point2D[][],
		id: unknown,
		properties: Record<string, unknown>,
	): Feature | null {
		const feature = new Feature({ type, geometry, id, properties });
		if (!feature.doesOverlap([0, 0, width, height])) return null;
		return feature;
	}

	function extractPoints(geometry: Point2D[][]): Point2D[][] {
		return geometry.flatMap((ring) => ring.map((p) => [p]));
	}

	function addFeature(
		type: 'LineString' | 'Point' | 'Polygon',
		geometry: Point2D[][],
		id: unknown,
		properties: Record<string, unknown>,
	): void {
		switch (type) {
			case 'Point': {
				const f = makeFeature('Point', geometry, id, properties);
				if (f) features.points.push(f);
				break;
			}
			case 'LineString': {
				const f = makeFeature('LineString', geometry, id, properties);
				if (f) {
					features.linestrings.push(f);
					features.points.push(
						new Feature({ type: 'Point', geometry: extractPoints(geometry), id, properties }),
					);
				}
				break;
			}
			case 'Polygon': {
				geometry.forEach((ring, ringIndex) => {
					const needsCW = ringIndex === 0;

					let area = 0;
					for (let i = 0; i < ring.length; i++) {
						const j = (i + 1) % ring.length;
						area += ring[i].x * ring[j].y;
						area -= ring[j].x * ring[i].y;
					}
					let isClockwise = area < 0;

					if (isClockwise !== needsCW) ring.reverse();
				});
				const f = makeFeature('Polygon', geometry, id, properties);
				if (f) {
					features.polygons.push(f);
					features.linestrings.push(new Feature({ type: 'LineString', geometry, id, properties }));
					features.points.push(
						new Feature({ type: 'Point', geometry: extractPoints(geometry), id, properties }),
					);
				}
				break;
			}
		}
	}

	function processGeometry(
		geom: Record<string, unknown>,
		id: unknown,
		properties: Record<string, unknown>,
	): void {
		const coords = geom.coordinates;
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
