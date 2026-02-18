#!/usr/bin/env node

/**
 * Analyzes bundle size by source file using the source map.
 * First expands pre-bundled dependency source maps, then computes
 * per-source byte attribution.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { decode, encode } from '@jridgewell/sourcemap-codec';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

const bundleFile = process.argv[2] || 'dist/index.js';
const mapFile = bundleFile + '.map';

if (!existsSync(mapFile)) {
	console.error(`Source map not found: ${mapFile}`);
	process.exit(1);
}

// ─── Step 1: Expand dependency source maps ───

const outputMap = JSON.parse(readFileSync(mapFile, 'utf8'));
const outputDir = dirname(resolve(mapFile));

const depTracers = new Map();
for (let i = 0; i < outputMap.sources.length; i++) {
	const source = outputMap.sources[i];
	const absSource = resolve(outputDir, source);
	if (!absSource.includes('node_modules')) continue;

	let code;
	try {
		code = readFileSync(absSource, 'utf8');
	} catch {
		continue;
	}
	const match = /\/\/[#@]\s*sourceMappingURL=(\S+)\s*$/.exec(code);
	if (!match || match[1].startsWith('data:')) continue;

	const depMapFile = resolve(dirname(absSource), match[1]);
	if (!existsSync(depMapFile)) continue;

	try {
		const depMap = JSON.parse(readFileSync(depMapFile, 'utf8'));
		if (!depMap.sources || depMap.sources.length <= 1) continue;

		let pkgDir = dirname(absSource);
		while (pkgDir.length > 1 && !existsSync(resolve(pkgDir, 'package.json'))) {
			pkgDir = dirname(pkgDir);
		}

		const depMapDir = dirname(depMapFile);
		const resolvedSources = depMap.sources.map((s: string) => {
			const fromMap = resolve(depMapDir, s);
			if (existsSync(fromMap)) return relative(outputDir, fromMap);
			const stripped = s.replace(/^(\.\.\/?)+/, '');
			const fromPkg = resolve(pkgDir, stripped);
			if (existsSync(fromPkg)) return relative(outputDir, fromPkg);
			return relative(outputDir, fromMap);
		});

		depTracers.set(i, { tracer: new TraceMap(depMap), resolvedSources, depMap });
	} catch {
		// skip
	}
}

// Expand mappings in-place
if (depTracers.size > 0) {
	const decoded = decode(outputMap.mappings);
	const newSources = [...outputMap.sources];
	const newSourcesContent = outputMap.sourcesContent ? [...outputMap.sourcesContent] : [];
	const sourceIndexMap = new Map();

	function getNewSourceIndex(depIdx: number, origSourceIdx: number) {
		const key = `${depIdx}:${origSourceIdx}`;
		let idx = sourceIndexMap.get(key);
		if (idx !== undefined) return idx;
		idx = newSources.length;
		const dep = depTracers.get(depIdx);
		newSources.push(dep.resolvedSources[origSourceIdx]);
		newSourcesContent[idx] = dep.depMap.sourcesContent?.[origSourceIdx] ?? null;
		sourceIndexMap.set(key, idx);
		return idx;
	}

	for (const line of decoded) {
		for (const seg of line as number[][]) {
			if (seg.length < 4) continue;
			const dep = depTracers.get(seg[1]);
			if (!dep) continue;

			const result = originalPositionFor(dep.tracer, { line: seg[2] + 1, column: seg[3] });
			if (result.source != null) {
				const origIdx = dep.depMap.sources.indexOf(result.source);
				if (origIdx >= 0) {
					seg[1] = getNewSourceIndex(seg[1], origIdx);
					seg[2] = result.line - 1;
					seg[3] = result.column;
				}
			}
		}
	}

	outputMap.sources = newSources;
	outputMap.sourcesContent = newSourcesContent;
	outputMap.mappings = encode(decoded);
}

// ─── Step 2: Compute byte attribution ───

const tracer = new TraceMap(outputMap);
const js = readFileSync(bundleFile, 'utf8');
const lines = js.split('\n');

const bytesPerSource = new Map<string, number>();
let totalBytes = 0;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
	const line = lines[lineIdx];
	const lineLen = line.length;

	// Get all segments for this line by probing key positions
	// Simple approach: attribute each line to its first mapping
	const pos = originalPositionFor(tracer, { line: lineIdx + 1, column: 0 });
	const src = pos.source ?? '[unmapped]';
	bytesPerSource.set(src, (bytesPerSource.get(src) ?? 0) + lineLen + 1);
	totalBytes += lineLen + 1;
}

// ─── Step 3: Display results ───

// Group by package/directory
const byPackage = new Map<string, number>();
for (const [source, bytes] of bytesPerSource) {
	let pkg;
	if (source === '[unmapped]') {
		pkg = '[unmapped]';
	} else if (source.includes('node_modules/')) {
		// Extract package name (handles scoped packages)
		const parts = source.split('node_modules/')[1].split('/');
		pkg = parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0];
	} else {
		pkg = '[project]';
	}
	byPackage.set(pkg, (byPackage.get(pkg) ?? 0) + bytes);
}

const sortedPackages = [...byPackage.entries()].sort((a, b) => b[1] - a[1]);
const sortedFiles = [...bytesPerSource.entries()].sort((a, b) => b[1] - a[1]);

console.log('\n=== Bundle Size by Package ===\n');
for (const [pkg, bytes] of sortedPackages) {
	const kb = (bytes / 1024).toFixed(1);
	const pct = ((bytes / totalBytes) * 100).toFixed(1);
	console.log(`  ${kb.padStart(8)} KB  ${pct.padStart(5)}%  ${pkg}`);
}
console.log(`  ${(totalBytes / 1024).toFixed(1).padStart(8)} KB  total`);

console.log('\n=== Bundle Size by File (top 30) ===\n');
for (const [source, bytes] of sortedFiles.slice(0, 30)) {
	const kb = (bytes / 1024).toFixed(1);
	const pct = ((bytes / totalBytes) * 100).toFixed(1);
	console.log(`  ${kb.padStart(8)} KB  ${pct.padStart(5)}%  ${source}`);
}
if (sortedFiles.length > 30) {
	const rest = sortedFiles.slice(30).reduce((sum, [, b]) => sum + b, 0);
	console.log(
		`  ${(rest / 1024).toFixed(1).padStart(8)} KB         ... and ${sortedFiles.length - 30} more files`,
	);
}
