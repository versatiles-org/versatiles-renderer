import type { RenderJob } from '../types.js';
import { getLayerStyles } from './styles.js';
import { getLayerFeatures } from './vector.js';

export async function renderVectorTiles(job: RenderJob): Promise<void> {
	const layerFeatures = await getLayerFeatures(job);
	const layerStyles = getLayerStyles(job);
}