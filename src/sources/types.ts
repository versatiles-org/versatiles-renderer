import type { Feature } from '../lib/geometry.js';

export interface Features {
	points: Feature[];
	linestrings: Feature[];
	polygons: Feature[];
}

export type LayerFeatures = Map<string, Features>;
