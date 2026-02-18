import type { GeoJSON } from 'geojson';
import type { RenderJob } from '../renderer/renderer_svg.js';
import { mergePolygons } from './helper.js';
import { loadVectorSource } from './vector.js';
import { loadGeoJSONSource } from './geojson.js';
import type { LayerFeatures } from './types.js';

export type { Features, LayerFeatures } from './types.js';
export { getRasterTiles } from './raster.js';

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
					loadGeoJSONSource(
						sourceName,
						source.data as GeoJSON,
						width,
						height,
						zoom,
						center,
						layerFeatures,
					);
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
