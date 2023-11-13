import { VersaTiles } from '@versatiles/container';
import { SVGRenderer } from './renderer/renderer_svg.js';
import { processVectorTiles } from './vector_tiles/vector_processor.js';
import { readFileSync } from 'fs';
import { Point } from './lib/geometry.js';
import { resolve } from 'path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

const DIRNAME = new URL('../', import.meta.url).pathname;

await processVectorTiles({
	renderer: new SVGRenderer({ width: 1024, height: 768, scale: 1 }),
	container: new VersaTiles(resolve(DIRNAME, '../tiles/planet-20230925.versatiles')),
	style: JSON.parse(readFileSync(resolve(DIRNAME, 'test/colorful.json'), 'utf8')) as StyleSpecification,
	view: {
		center: new Point(13.408333, 52.518611),
		zoom: 8.99,
	},
});
