import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { styles } from '@versatiles/style';
import { renderToSVG } from '../src/index.js';
import { regions, type Region } from './regions.js';

const WIDTH = 800;
const HEIGHT = 600;

const outputDir = resolve(import.meta.dirname, 'output');
const maplibreDir = resolve(outputDir, 'maplibre');
const svgDir = resolve(outputDir, 'svg');
const diffDir = resolve(outputDir, 'diff');

for (const dir of [outputDir, maplibreDir, svgDir, diffDir]) {
	mkdirSync(dir, { recursive: true });
}

const style = styles.colorful({ hideLabels: true });

console.log('Launching browser...');
const browser = await chromium.launch({
	args: ['--use-gl=angle', '--use-angle=swiftshader'],
});

// Generate SVG screenshots
console.log('\n--- SVG Screenshots ---');
for (const region of regions) {
	console.log(`  Rendering SVG: ${region.name}...`);
	const svg = await renderToSVG({
		width: WIDTH,
		height: HEIGHT,
		style,
		lon: region.lon,
		lat: region.lat,
		zoom: region.zoom,
	});

	const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
	await page.setContent(`<!DOCTYPE html>
<html><head><style>* { margin: 0; padding: 0; }</style></head>
<body>${svg}</body></html>`);
	await page.screenshot({ path: resolve(svgDir, `${region.name}.png`) });
	await page.close();
}

// Generate MapLibre screenshots
console.log('\n--- MapLibre Screenshots ---');
for (const region of regions) {
	console.log(`  Rendering MapLibre: ${region.name}...`);
	const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

	await page.setContent(`<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
<style>* { margin: 0; padding: 0; } #map { width: ${WIDTH}px; height: ${HEIGHT}px; }</style>
</head><body><div id="map"></div></body></html>`);

	await page.waitForFunction(() => typeof (window as any).maplibregl !== 'undefined', { timeout: 15000 });

	await page.evaluate(({ styleJson, center, zoom }: { styleJson: any; center: [number, number]; zoom: number }) => {
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
	}, {
		styleJson: style,
		center: [region.lon, region.lat] as [number, number],
		zoom: region.zoom,
	});

	await page.screenshot({ path: resolve(maplibreDir, `${region.name}.png`) });
	await page.close();
}

await browser.close();

// Compare screenshots
console.log('\n--- Comparing ---');
interface Result {
	region: Region;
	diffPercent: number;
	maplibrePng: Buffer;
	svgPng: Buffer;
	diffPng: Buffer;
}

const results: Result[] = [];

for (const region of regions) {
	const maplibreData = PNG.sync.read(readFileSync(resolve(maplibreDir, `${region.name}.png`)));
	const svgData = PNG.sync.read(readFileSync(resolve(svgDir, `${region.name}.png`)));
	const diff = new PNG({ width: WIDTH, height: HEIGHT });

	const mismatch = pixelmatch(maplibreData.data, svgData.data, diff.data, WIDTH, HEIGHT, { threshold: 0.1 });
	const totalPixels = WIDTH * HEIGHT;
	const diffPercent = (mismatch / totalPixels) * 100;

	writeFileSync(resolve(diffDir, `${region.name}.png`), PNG.sync.write(diff));
	console.log(`  ${region.name}: ${diffPercent.toFixed(2)}% different`);

	results.push({
		region,
		diffPercent,
		maplibrePng: readFileSync(resolve(maplibreDir, `${region.name}.png`)),
		svgPng: readFileSync(resolve(svgDir, `${region.name}.png`)),
		diffPng: PNG.sync.write(diff),
	});
}

// Generate HTML report
console.log('\n--- Generating Report ---');
const rows = results.map(r => {
	const mlB64 = r.maplibrePng.toString('base64');
	const svgB64 = r.svgPng.toString('base64');
	const diffB64 = Buffer.from(r.diffPng).toString('base64');
	return `<tr>
	<td>
		<strong>${r.region.name}</strong><br>
		lon: ${r.region.lon}<br>
		lat: ${r.region.lat}<br>
		zoom: ${r.region.zoom}<br>
		<span style="color:${r.diffPercent > 50 ? 'red' : r.diffPercent > 20 ? 'orange' : 'green'}">
			diff: ${r.diffPercent.toFixed(2)}%
		</span>
	</td>
	<td><img src="data:image/png;base64,${mlB64}" width="${WIDTH}" height="${HEIGHT}"></td>
	<td><img src="data:image/png;base64,${svgB64}" width="${WIDTH}" height="${HEIGHT}"></td>
	<td><img src="data:image/png;base64,${diffB64}" width="${WIDTH}" height="${HEIGHT}"></td>
</tr>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>E2E Visual Comparison Report</title>
<style>
	body { font-family: sans-serif; margin: 20px; background: #f5f5f5; }
	h1 { margin-bottom: 20px; }
	table { border-collapse: collapse; }
	th, td { border: 1px solid #ccc; padding: 8px; vertical-align: top; background: white; }
	th { background: #eee; position: sticky; top: 0; }
	img { display: block; }
</style>
</head><body>
<h1>E2E Visual Comparison Report</h1>
<p>Generated: ${new Date().toISOString()}</p>
<table>
<tr><th>Region</th><th>MapLibre</th><th>SVG Renderer</th><th>Diff</th></tr>
${rows}
</table>
</body></html>`;

const reportPath = resolve(outputDir, 'report.html');
writeFileSync(reportPath, html);
console.log(`\nReport saved to: ${reportPath}`);
