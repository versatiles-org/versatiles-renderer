import { Point2D } from './lib/geometry.js';
import { resolve } from 'path';
import { styles } from '@versatiles/style';
import { renderVectorTiles, SVGRenderer } from './index';
import { writeFileSync } from 'fs';

const DIRNAME = new URL('../', import.meta.url).pathname;

const style = styles.colorful({});

const svgString = await renderVectorTiles({
	renderer: new SVGRenderer({ width: 512, height: 384, scale: 1 }),
	style,
	view: {
		center: new Point2D(13.408333, 52.518611),
		zoom: 8.99,
	},
});

writeFileSync(resolve(DIRNAME, '../demo.svg'), svgString);
