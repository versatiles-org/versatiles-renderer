import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import type { Page } from 'playwright';

// MapLibre GL is served straight from node_modules rather than a CDN, so comparisons
// always run against the version this repo depends on. Since v6 the published package
// is ESM-only — there is no `dist/maplibre-gl.js` UMD bundle to drop in via a plain
// <script> tag anymore.
const maplibreDistDir = resolve(import.meta.dirname, '..', 'node_modules', 'maplibre-gl', 'dist');

const CONTENT_TYPES: Record<string, string> = {
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.map': 'application/json',
};

export const MAPLIBRE_PAGE_URL = 'http://localhost/index.html';

// Serve the host page and the MapLibre dist files from one local origin, and expose the
// module as `window.maplibregl`. Same-origin matters: MapLibre resolves its worker
// relative to `import.meta.url` and starts it as a module worker, which only works when
// the whole bundle comes from a single http(s) origin.
//
// Register this *after* any catch-all `**/*` route — Playwright uses the last matching one.
export async function installMapLibrePage(
	page: Page,
	{ width, height }: { width: number; height: number },
): Promise<void> {
	await page.route('http://localhost/maplibre/*', async (route) => {
		const name = basename(new URL(route.request().url()).pathname);
		const file = resolve(maplibreDistDir, name);
		if (!existsSync(file)) {
			await route.fulfill({ status: 404, contentType: 'text/plain', body: `not found: ${name}` });
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: CONTENT_TYPES[extname(name)] ?? 'application/octet-stream',
			body: readFileSync(file),
		});
	});

	await page.route(MAPLIBRE_PAGE_URL, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'text/html',
			body: `<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="/maplibre/maplibre-gl.css">
<script type="module">
import * as maplibregl from '/maplibre/maplibre-gl.mjs';
window.maplibregl = maplibregl;
</script>
<style>* { margin: 0; padding: 0; } #map { width: ${width}px; height: ${height}px; }</style>
</head><body><div id="map"></div></body></html>`,
		});
	});

	await page.goto(MAPLIBRE_PAGE_URL);
	await page.waitForFunction(
		() => typeof (window as unknown as Record<string, unknown>).maplibregl !== 'undefined',
		{
			timeout: 15000,
		},
	);
}
