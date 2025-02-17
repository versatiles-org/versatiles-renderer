import { union } from '@turf/union';
import type { Polygon, Feature as GeoJsonFeature, GeoJsonProperties, Position, MultiPolygon } from 'geojson';
import { Point2D, Feature } from '../lib/geometry.js';


function geojsonToFeature(id: number, polygonFeature: GeoJsonFeature<Polygon, GeoJsonProperties>): Feature {
	const geometry = polygonFeature.geometry.coordinates.map((ring) => {
		return ring.map((coord: Position) => new Point2D(coord[0], coord[1]));
	});
	return new Feature({
		type: 'Polygon',
		geometry,
		id,
		properties: polygonFeature.properties || {}
	});
}

export function mergePolygons(features: Feature[]): Feature[] {
	const featuresById = new Map<number, Feature[]>();
	for (const feature of features) {
		if (typeof feature.id !== 'number') {
			throw new Error('Feature id is not a number');
		}
		if (featuresById.has(feature.id)) {
			featuresById.get(feature.id)!.push(feature);
		} else {
			featuresById.set(feature.id, [feature]);
		}
	}
	const mergedFeatures: Feature[] = [];
	for (const [id, features] of featuresById) {
		if (features.length === 1) {
			mergedFeatures.push(features[0]);
			continue;
		}
		const turfFeatures: GeoJsonFeature<Polygon, GeoJsonProperties>[] = [];
		features.forEach(f => {
			const rings = f.geometry.map(ring => ring.map(p => [p.x, p.y]));
			rings.forEach(ring => {
				turfFeatures.push({
					type: 'Feature' as const,
					geometry: {
						type: 'Polygon' as const,
						coordinates: [ring]
					},
					properties: f.properties
				});
			});
		});
		const merged = union({
			type: 'FeatureCollection' as const,
			features: turfFeatures
		});
		if (merged) {
			if (merged.geometry.type === 'Polygon') {
				const typedMerged = merged as GeoJsonFeature<Polygon, GeoJsonProperties>;
				mergedFeatures.push(geojsonToFeature(id, typedMerged));
			} else {
				const typedMerged = merged as GeoJsonFeature<MultiPolygon, GeoJsonProperties>;
				for (const polygon of typedMerged.geometry.coordinates) {
					const currentPolygon: GeoJsonFeature<Polygon, GeoJsonProperties> = {
						type: 'Feature',
						geometry: {
							type: 'Polygon',
							coordinates: polygon
						},
						properties: typedMerged.properties
					}
					mergedFeatures.push(geojsonToFeature(id, currentPolygon));
				}
			}
		}
	}
	return mergedFeatures;
}