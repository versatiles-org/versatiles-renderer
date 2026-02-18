import type { Feature } from './geometry.js';

export interface Features {
	points: Feature[];
	linestrings: Feature[];
	polygons: Feature[];
}

export type LayerFeatures = Map<string, Features>;
