import { VersaTiles } from '@versatiles/container';
import { SVGRenderer } from './renderer/renderer_svg.js';
import { readFileSync } from 'fs';
import { Point2D } from './lib/geometry.js';
import { resolve } from 'path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { renderVectorTiles } from './processor/render.js';

const DIRNAME = new URL('../', import.meta.url).pathname;

await renderVectorTiles({
	renderer: new SVGRenderer({ width: 1024, height: 768, scale: 1 }),
	container: new VersaTiles(resolve(DIRNAME, '../tiles/planet-20230925.versatiles')),
	style: JSON.parse(readFileSync(resolve(DIRNAME, 'test/colorful.json'), 'utf8')) as StyleSpecification,
	view: {
		center: new Point2D(13.408333, 52.518611),
		zoom: 8.99,
	},
});
