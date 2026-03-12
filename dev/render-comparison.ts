import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';
import { styles } from '@versatiles/style';
import { renderToSVG } from '../src/index.js';
import { ensureCacheDir, readCache, writeCache } from '../e2e/fetch-cache.js';
import type { BrowserType, Page } from 'playwright';

const WIDTH = 800;
const HEIGHT = 600;
const outDir = resolve(import.meta.dirname, 'render-comparison-output');

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
		//delete (layer.layout as Record<string, unknown>)['text-field'];
	}
}

const location = {
	lon: 12.4914,
	lat: 41.8912,
	zoom: 17,
};

const svg = await renderToSVG({
	width: WIDTH,
	height: HEIGHT,
	style,
	...location,
	renderLabels: true,
});

const svgPath = resolve(outDir, 'map.svg');
writeFileSync(svgPath, svg);
console.log(`  SVG saved: ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB`);

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

// Rasterize SVG with all Playwright browsers
const browsers: { name: string; type: BrowserType; args?: string[] }[] = [
	{ name: 'chromium', type: chromium, args: ['--use-gl=angle', '--use-angle=swiftshader'] },
	{ name: 'firefox', type: firefox },
	{ name: 'webkit', type: webkit },
];

for (const { name, type, args } of browsers) {
	console.log(`Rasterizing with ${name}...`);
	const png = resolve(outDir, `${name}.png`);
	const browser = await type.launch({ args });
	const page = await browser.newPage({
		viewport: { width: WIDTH, height: HEIGHT },
		deviceScaleFactor: 1,
	});
	await page.setContent(`<!DOCTYPE html>
<html><head><style>* { margin: 0; padding: 0; }</style></head>
<body>${svg}</body></html>`);
	await page.screenshot({ path: png });
	await page.close();
	await browser.close();
	console.log(`  ${name} done.`);
}

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

const mlBrowser = await chromium.launch({
	args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const mlPage = await mlBrowser.newPage({
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
	(options: any) => {
		return new Promise<void>((resolve, reject) => {
			const map = new (window as any).maplibregl.Map(options);
			map.once('idle', () => resolve());
			setTimeout(() => reject(new Error('MapLibre idle timeout')), 30000);
		});
	},
	{
		container: 'map',
		style: maplibreStyle,
		center: [location.lon, location.lat] as [number, number],
		zoom: location.zoom,
		interactive: false,
		fadeDuration: 0,
		attributionControl: false,
		pixelRatio: 1,
	},
);

await mlPage.screenshot({ path: maplibrePng });
await mlPage.close();
await mlBrowser.close();
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
<p>Location: ${location.lat}, ${location.lon} @ zoom ${location.zoom}</p>
<p>SVG size: ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB</p>
<table>
<tr><th>Renderer</th><th>Result</th></tr>
<tr><td>Screenshot of MapLibre GL JS<br>(Original)</td><td><a href="maplibre.png"><img src="maplibre.png" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
<tr><td>SVG export (rendered in this browser)</td><td><a href="map.svg"><img src="map.svg" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
<tr><td>SVG rendered with Inkscape</td><td><a href="inkscape.png"><img src="inkscape.png" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
<tr><td>SVG rendered with Chromium</td><td><a href="chromium.png"><img src="chromium.png" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
<tr><td>SVG rendered with Firefox</td><td><a href="firefox.png"><img src="firefox.png" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
<tr><td>SVG rendered with WebKit</td><td><a href="webkit.png"><img src="webkit.png" width="${WIDTH}" height="${HEIGHT}"></a></td></tr>
</table>
</body></html>`;

const reportPath = resolve(outDir, 'report.html');
writeFileSync(reportPath, html);
console.log(`\nReport: ${reportPath}`);
