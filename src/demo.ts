import { Point2D } from './lib/geometry.js';
import { styles } from '@versatiles/style';
import { renderVectorTiles, SVGRenderer } from './index';
import { writeFileSync } from 'fs';

const style = styles.colorful({});

const svgString = await renderVectorTiles({
	renderer: new SVGRenderer({ width: 512, height: 384, scale: 1 }),
	style,
	view: {
		center: new Point2D(13.408333, 52.518611),
		zoom: 10,
	},
});

writeFileSync(new URL('../docs/demo.svg', import.meta.url).pathname, svgString);
