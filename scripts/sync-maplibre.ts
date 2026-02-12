#!/usr/bin/env tsx

/**
 * Syncs specific source files from the maplibre-gl-js submodule into src/maplibre/,
 * applying patches to remove browser/WebGL dependencies and make them Node.js compatible.
 *
 * Usage: npx tsx scripts/sync-maplibre.ts
 *
 * Files NOT synced (manually maintained):
 *   - src/maplibre/util/util.ts       (our minimal shim)
 *   - src/maplibre/style/style.ts     (type-only shim)
 *   - src/maplibre/style/create_style_layer.ts  (our factory)
 *   - src/maplibre/index.ts           (our exports)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBMODULE_SRC = join(__dirname, '..', 'lib', 'maplibre-gl-js', 'src');
const TARGET_SRC = join(__dirname, '..', 'src', 'maplibre');

function read(relPath: string): string {
	return readFileSync(join(SUBMODULE_SRC, relPath), 'utf-8');
}

function write(relPath: string, content: string): void {
	// Add @ts-nocheck and eslint-disable to suppress strict checking on synced files
	const header =
		'// @ts-nocheck\n/* eslint-disable */\n// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts\n\n';
	if (!content.startsWith('// @ts-nocheck')) {
		// Remove existing eslint-disable and codegen comments at top
		content = content.replace(
			/^(?:\/\/\s*@ts-nocheck\n|\/\*\s*eslint-disable\s*\*\/\n|\/\/.*?do not edit.*?\n|\/\/.*?generated.*?codegen.*?\n)*/i,
			'',
		);
		content = header + content;
	}
	const fullPath = join(TARGET_SRC, relPath);
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, content, 'utf-8');
	console.log(`  synced: src/maplibre/${relPath}`);
}

/** Add .js extension to relative imports/exports that lack one */
function fixExtensions(content: string): string {
	return content.replace(/((?:from|import)\s+['"])(\.[^'"]+?)(?<!\.js)(['"])/g, '$1$2.js$3');
}

/** Remove lines matching any of the given patterns */
function removeLines(content: string, patterns: (string | RegExp)[]): string {
	return content
		.split('\n')
		.filter((line) => !patterns.some((p) => (typeof p === 'string' ? line.includes(p) : p.test(line))))
		.join('\n');
}

/** Remove a block from startPattern to endPattern (inclusive), first match only */
function removeBlock(content: string, startPattern: string | RegExp, endPattern: string | RegExp): string {
	const lines = content.split('\n');
	const result: string[] = [];
	let removing = false;

	for (const line of lines) {
		const isStart = typeof startPattern === 'string' ? line.includes(startPattern) : startPattern.test(line);
		if (isStart && !removing) {
			removing = true;
		}
		if (!removing) {
			result.push(line);
		}
		if (removing) {
			const isEnd = typeof endPattern === 'string' ? line.includes(endPattern) : endPattern.test(line);
			if (isEnd) {
				removing = false;
			}
		}
	}

	return result.join('\n');
}

/**
 * Add 'declare' to class field declarations that override parent fields.
 * Without 'declare', ES2022+ useDefineForClassFields overwrites parent assignments with undefined.
 */
function declareClassFields(content: string): string {
	const fieldPatterns = [
		'_transitionablePaint:',
		'_transitioningPaint:',
		'_unevaluatedLayout:',
		/^\s+paint:/,
		/^\s+layout:/,
	];
	return content
		.split('\n')
		.map((line) => {
			const matches = fieldPatterns.some((p) => (typeof p === 'string' ? line.includes(p) : p.test(line)));
			if (matches && !line.includes('declare') && !line.includes('=')) {
				return line.replace(/^(\s+)/, '$1declare ');
			}
			return line;
		})
		.join('\n');
}

/** Remove a method block from a class (handles destructured params and nested braces) */
function removeMethod(content: string, methodSignature: string | RegExp): string {
	const lines = content.split('\n');
	const result: string[] = [];
	let removing = false;
	let braceDepth = 0;
	let parenDepth = 0;
	let bodyEntered = false;

	for (const line of lines) {
		if (!removing) {
			const isMatch = typeof methodSignature === 'string' ? line.includes(methodSignature) : methodSignature.test(line);
			if (isMatch) {
				removing = true;
				braceDepth = 0;
				parenDepth = 0;
				bodyEntered = false;
			}
		}

		if (removing) {
			for (const ch of line) {
				if (ch === '(') parenDepth++;
				if (ch === ')') parenDepth--;
				if (ch === '{' && parenDepth <= 0) {
					braceDepth++;
					bodyEntered = true;
				}
				if (ch === '}' && parenDepth <= 0) {
					braceDepth--;
				}
			}
			if (bodyEntered && braceDepth <= 0) {
				removing = false;
			}
			continue;
		}

		result.push(line);
	}

	return result.join('\n');
}

// ============================================================================
// Sync: style/properties.ts
// ============================================================================
function syncProperties(): void {
	let c = read('style/properties.ts');

	// Remove web_worker_transfer import and register() calls
	c = removeLines(c, ["import {register} from '../util/web_worker_transfer'", /^register\(/]);

	// Replace tile_id import with inline type
	c = c.replace(
		/import \{type CanonicalTileID\} from '\.\.\/tile\/tile_id';/,
		'export type CanonicalTileID = { z: number; x: number; y: number };',
	);

	c = fixExtensions(c);
	write('style/properties.ts', c);
}

// ============================================================================
// Sync: style/style_layer.ts
// ============================================================================
function syncStyleLayer(): void {
	let c = read('style/style_layer.ts');

	// Remove browser-specific imports
	c = removeLines(c, [
		'import type {Bucket',
		"import type Point from '@mapbox/point-geometry'",
		'import type {IReadonlyTransform}',
		'import type {CustomLayerInterface}',
		'import type {Map}',
		'import {type mat4}',
		'import type {VectorTileFeature}',
		'import type {UnwrappedTileID}',
	]);

	// Remove QueryIntersectsFeatureParams type block
	c = removeBlock(c, 'export type QueryIntersectsFeatureParams', /^\};$/);

	// Remove abstract method declarations
	c = removeLines(c, ['queryRadius?(', 'queryIntersectsFeature?(', 'createBucket?(']);

	// Remove CustomLayerInterface from type union
	c = c.replace(
		"type: LayerSpecification['type'] | CustomLayerInterface['type'];",
		"type: LayerSpecification['type'];",
	);

	// Remove onAdd/onRemove
	c = removeLines(c, ['readonly onAdd:', 'readonly onRemove:']);

	// Remove custom layer early return
	c = removeLines(c, ["if (layer.type === 'custom') return;", 'layer = (layer as any as LayerSpecification);']);

	// Fix constructor signature: remove CustomLayerInterface from union
	c = c.replace(
		'layer: LayerSpecification | CustomLayerInterface, properties',
		'layer: LayerSpecification, properties',
	);

	c = fixExtensions(c);
	write('style/style_layer.ts', c);
}

// ============================================================================
// Sync: style/evaluation_parameters.ts
// ============================================================================
function syncEvaluationParameters(): void {
	let c = read('style/evaluation_parameters.ts');

	// Remove script_detection and rtl_text_plugin imports
	c = removeLines(c, ['import {isStringInSupportedScript}', 'import {rtlWorkerPlugin}']);

	// Remove the standalone isSupportedScript function at the end
	c = removeBlock(c, /^function isSupportedScript/, /^\}/);

	// Replace the isSupportedScript assignment to use a simple stub
	c = c.replace(
		/isSupportedScript: \(_: string\) => boolean = isSupportedScript;/,
		'isSupportedScript: (_: string) => boolean = () => true;',
	);

	c = fixExtensions(c);
	write('style/evaluation_parameters.ts', c);
}

// ============================================================================
// Sync: style/validate_style.ts
// ============================================================================
function syncValidateStyle(): void {
	let c = read('style/validate_style.ts');
	c = fixExtensions(c);
	write('style/validate_style.ts', c);
}

// ============================================================================
// Sync: style/zoom_history.ts
// ============================================================================
function syncZoomHistory(): void {
	let c = read('style/zoom_history.ts');
	c = fixExtensions(c);
	write('style/zoom_history.ts', c);
}

// ============================================================================
// Sync: style/format_section_override.ts
// ============================================================================
function syncFormatSectionOverride(): void {
	let c = read('style/format_section_override.ts');

	// Remove register import and call
	c = removeLines(c, ["import {register} from '../util/web_worker_transfer'", /^register\(/]);

	c = fixExtensions(c);
	write('style/format_section_override.ts', c);
}

// ============================================================================
// Sync: style/style_layer/background_style_layer.ts
// ============================================================================
function syncBackgroundStyleLayer(): void {
	let c = read('style/style_layer/background_style_layer.ts');
	c = declareClassFields(c);
	c = fixExtensions(c);
	write('style/style_layer/background_style_layer.ts', c);
}

// ============================================================================
// Sync: style/style_layer/fill_style_layer.ts
// ============================================================================
function syncFillStyleLayer(): void {
	let c = read('style/style_layer/fill_style_layer.ts');

	// Fix StyleLayer import FIRST (before removeLines would delete it)
	c = c.replace(
		/import \{type QueryIntersectsFeatureParams, StyleLayer\} from '\.\.\/style_layer';/,
		"import {StyleLayer} from '../style_layer';",
	);

	// Remove browser-specific imports
	c = removeLines(c, [
		'import {FillBucket}',
		'import {polygonIntersectsMultiPolygon}',
		'import {translateDistance, translate}',
		'import type {BucketParameters}',
	]);

	// Remove methods: createBucket, queryRadius, queryIntersectsFeature
	c = removeMethod(c, 'createBucket(');
	c = removeMethod(c, 'queryRadius(');
	c = removeMethod(c, 'queryIntersectsFeature(');

	c = declareClassFields(c);
	c = fixExtensions(c);
	write('style/style_layer/fill_style_layer.ts', c);
}

// ============================================================================
// Sync: style/style_layer/line_style_layer.ts
// ============================================================================
function syncLineStyleLayer(): void {
	let c = read('style/style_layer/line_style_layer.ts');

	// Fix StyleLayer import FIRST (before removeLines would delete it)
	c = c.replace(
		/import \{type QueryIntersectsFeatureParams, StyleLayer\} from '\.\.\/style_layer';/,
		"import {StyleLayer} from '../style_layer';",
	);

	// Remove browser-specific imports
	c = removeLines(c, [
		'import {LineBucket}',
		'import {polygonIntersectsBufferedMultiLine}',
		'import {getMaximumPaintValue, translateDistance, translate, offsetLine}',
		'import type {Bucket, BucketParameters}',
	]);

	// Remove methods: createBucket, queryRadius, queryIntersectsFeature
	c = removeMethod(c, 'createBucket(');
	c = removeMethod(c, 'queryRadius(');
	c = removeMethod(c, 'queryIntersectsFeature(');

	// Remove getLineWidth helper function
	c = removeBlock(c, 'function getLineWidth(', /^\}/);

	c = declareClassFields(c);
	c = fixExtensions(c);
	write('style/style_layer/line_style_layer.ts', c);
}

// ============================================================================
// Sync: style/style_layer/symbol_style_layer.ts
// ============================================================================
function syncSymbolStyleLayer(): void {
	let c = read('style/style_layer/symbol_style_layer.ts');

	// Remove browser-specific imports
	c = removeLines(c, ['import {SymbolBucket', 'import type {BucketParameters}']);

	// Replace CanonicalTileID import with inline type
	c = c.replace(
		/import type \{CanonicalTileID\} from '\.\.\/\.\.\/tile\/tile_id';/,
		'type CanonicalTileID = { z: number; x: number; y: number };',
	);

	// Remove methods: createBucket, queryRadius, queryIntersectsFeature
	c = removeMethod(c, 'createBucket(');
	c = removeMethod(c, 'queryRadius(');
	c = removeMethod(c, 'queryIntersectsFeature(');

	// Remove getIconPadding export function at the end
	c = removeBlock(c, 'export function getIconPadding(', /^\}/);
	// Also remove SymbolPadding type
	c = removeLines(c, ['export type SymbolPadding']);

	// Remove SymbolFeature from imports (was in SymbolBucket import, already removed)
	// Remove unused type import for SymbolFeature
	c = removeLines(c, [', type SymbolFeature']);

	c = declareClassFields(c);
	c = fixExtensions(c);
	write('style/style_layer/symbol_style_layer.ts', c);
}

// ============================================================================
// Sync: style/style_layer/*_properties.g.ts (4 generated files)
// ============================================================================
function syncGeneratedProperties(): void {
	const layers = ['background', 'fill', 'line', 'symbol'];
	for (const layer of layers) {
		const filename = `style/style_layer/${layer}_style_layer_properties.g.ts`;
		let c = read(filename);
		c = fixExtensions(c);
		write(filename, c);
	}
}

// ============================================================================
// Sync: util/evented.ts
// ============================================================================
function syncEvented(): void {
	let c = read('util/evented.ts');
	c = fixExtensions(c);
	write('util/evented.ts', c);
}

// ============================================================================
// Sync: util/resolve_tokens.ts
// ============================================================================
function syncResolveTokens(): void {
	let c = read('util/resolve_tokens.ts');
	c = fixExtensions(c);
	write('util/resolve_tokens.ts', c);
}

// ============================================================================
// Main
// ============================================================================
console.log('Syncing maplibre-gl-js files...');
console.log(`  Source: ${SUBMODULE_SRC}`);
console.log(`  Target: ${TARGET_SRC}`);
console.log('');

syncProperties();
syncStyleLayer();
syncEvaluationParameters();
syncValidateStyle();
syncZoomHistory();
syncFormatSectionOverride();
syncBackgroundStyleLayer();
syncFillStyleLayer();
syncLineStyleLayer();
syncSymbolStyleLayer();
syncGeneratedProperties();
syncEvented();
syncResolveTokens();

console.log('\nDone! Synced all files.');
