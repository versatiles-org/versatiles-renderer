import { Container } from '@versatiles/container';
import { Point2D } from './lib/geometry.js';
import { resolve } from 'path';
import { styles } from '@versatiles/style';
import { renderVectorTiles, SVGRenderer } from './index';

const DIRNAME = new URL('../', import.meta.url).pathname;

const style = styles.colorful({});

await renderVectorTiles(
	{
		renderer: new SVGRenderer({ width: 512, height: 384, scale: 1 }),
		container: new Container('https://download.versatiles.org/osm.versatiles'),
		style,
		view: {
			center: new Point2D(13.408333, 52.518611),
			zoom: 8.99,
		},
	},
	resolve(DIRNAME, 'docs/demo.svg'),
);
