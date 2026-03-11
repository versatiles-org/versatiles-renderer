import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { styles } from '@versatiles/style';
import { renderToSVG } from '../src/index.js';
import { ensureCacheDir, installFetchCache, readCache, writeCache } from '../e2e/fetch-cache.js';
import type { Page } from 'playwright';

const WIDTH = 800;
const HEIGHT = 600;
const outDir = resolve(import.meta.dirname, 'test-icons-output');

mkdirSync(outDir, { recursive: true });

// Render SVG with symbols (icons) but no labels
console.log('Rendering SVG...');
const style = styles.colorful({});

// Remove all symbol layers that only have text (keep ones with icons)
// Actually: renderLabels=true enables both icons and labels.
// To get icons without text labels, we filter out text-field from symbol layers.
for (const layer of style.layers) {
	if (layer.type === 'symbol' && 'layout' in layer && layer.layout) {
		// Remove text rendering but keep icon rendering
		delete (layer.layout as Record<string, unknown>)['text-field'];
	}
}

const svg = await renderToSVG({
	width: WIDTH,
	height: HEIGHT,
	style,
	lon: 13.415893,
	lat: 52.524852,
	zoom: 16.97,
	renderLabels: true,
});

const svgPath = resolve(outDir, 'map.svg');
writeFileSync(svgPath, svg);
console.log(`  SVG saved: ${svgPath} (${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB)`);

// Rasterize with Inkscape
console.log('Rasterizing with Inkscape...');
const inkscapePng = resolve(outDir, 'inkscape.png');
execSync(
	`inkscape "${svgPath}" --export-type=png --export-filename="${inkscapePng}" --export-width=${WIDTH} --export-height=${HEIGHT}`,
	{
		stdio: 'pipe',
	},
);
console.log('  Inkscape done.');

// Rasterize with Chromium (Playwright)
console.log('Rasterizing with Chromium (Playwright)...');
const chromiumPng = resolve(outDir, 'chromium.png');
const browser = await chromium.launch({
	args: ['--use-gl=angle', '--use-angle=swiftshader'],
});

const svgPage = await browser.newPage({
	viewport: { width: WIDTH, height: HEIGHT },
	deviceScaleFactor: 1,
});
await svgPage.setContent(`<!DOCTYPE html>
<html><head><style>* { margin: 0; padding: 0; }</style></head>
<body>${svg}</body></html>`);
await svgPage.screenshot({ path: chromiumPng });
await svgPage.close();
console.log('  Chromium done.');

// Render MapLibre GL JS reference screenshot
console.log('Rendering MapLibre GL JS...');
const maplibrePng = resolve(outDir, 'maplibre.png');

ensureCacheDir();
async function installPageCache(page: Page): Promise<void> {
	await page.route('https://**', async (route) => {
		const url = route.request().url();
		const cached = readCache(url);
		if (cached) {
			await route.fulfill({
				status: cached.status,
				contentType: cached.contentType,
				body: Buffer.from(cached.body, 'base64'),
			});
			return;
		}
		const response = await route.fetch();
		const body = await response.body();
		writeCache(url, {
			status: response.status(),
			contentType: response.headers()['content-type'] ?? 'application/octet-stream',
			body: body.toString('base64'),
		});
		await route.fulfill({ response, body });
	});
}

const maplibreStyle = styles.colorful({});
for (const layer of maplibreStyle.layers) {
	if (layer.type === 'symbol' && 'layout' in layer && layer.layout) {
		delete (layer.layout as Record<string, unknown>)['text-field'];
	}
}

const mlPage = await browser.newPage({
	viewport: { width: WIDTH, height: HEIGHT },
	deviceScaleFactor: 1,
});
await installPageCache(mlPage);

await mlPage.setContent(`<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
<style>* { margin: 0; padding: 0; } #map { width: ${WIDTH}px; height: ${HEIGHT}px; }</style>
</head><body><div id="map"></div></body></html>`);

await mlPage.waitForFunction(() => typeof (window as any).maplibregl !== 'undefined', {
	timeout: 15000,
});

await mlPage.evaluate(
	({ styleJson, center, zoom }: { styleJson: any; center: [number, number]; zoom: number }) => {
		return new Promise<void>((resolve, reject) => {
			const map = new (window as any).maplibregl.Map({
				container: 'map',
				style: styleJson,
				center,
				zoom,
				interactive: false,
				fadeDuration: 0,
				attributionControl: false,
				pixelRatio: 1,
			});
			map.once('idle', () => resolve());
			setTimeout(() => reject(new Error('MapLibre idle timeout')), 30000);
		});
	},
	{
		styleJson: maplibreStyle,
		center: [13.415893, 52.524852] as [number, number],
		zoom: 16.97,
	},
);

await mlPage.screenshot({ path: maplibrePng });
await mlPage.close();
await browser.close();
console.log('  MapLibre done.');

// Generate comparison HTML
const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Icon Rendering Comparison</title>
<style>
	body { font-family: sans-serif; margin: 20px; background: #f5f5f5; }
	h1 { margin-bottom: 10px; }
	table { border-collapse: collapse; }
	th, td { border: 1px solid #ccc; padding: 8px; vertical-align: top; background: white; }
	th { background: #eee; }
	img { display: block; }
</style>
</head><body>
<h1>Icon Rendering Comparison</h1>
<p>Location: 52.524852, 13.415893 @ zoom 16.97</p>
<p>SVG size: ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB</p>
<table>
<tr><th>SVG (source)</th><th>Inkscape</th><th>Chromium (SVG)</th><th>MapLibre GL JS</th></tr>
<tr>
	<td><a href="map.svg"><img src="map.svg" width="${WIDTH / 2}" height="${HEIGHT / 2}"></a></td>
	<td><a href="inkscape.png"><img src="inkscape.png" width="${WIDTH / 2}" height="${HEIGHT / 2}"></a></td>
	<td><a href="chromium.png"><img src="chromium.png" width="${WIDTH / 2}" height="${HEIGHT / 2}"></a></td>
	<td><a href="maplibre.png"><img src="maplibre.png" width="${WIDTH / 2}" height="${HEIGHT / 2}"></a></td>
</tr>
</table>
</body></html>`;

const reportPath = resolve(outDir, 'report.html');
writeFileSync(reportPath, html);
console.log(`\nReport: ${reportPath}`);
