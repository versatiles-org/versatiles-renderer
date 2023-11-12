import type { RenderJob } from './types.js';
import { processVectorTiles } from './vector_tiles/vector_processor.js';

export function render(job: RenderJob): void {
	const { rendererClass } = job;
	const renderer = new rendererClass(job.viewport);
	processVectorTiles({ ...job, renderer });
}
