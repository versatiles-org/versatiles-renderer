import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

const maplibreOnly = process.env.BUILD_TARGET === 'maplibre';

const allConfigs = [
	{
		input: 'src/index.ts',
		output: [
			{ file: 'dist/index.js', format: 'es', sourcemap: true },
			{ file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
		],
		plugins: [
			resolve(),
			typescript({ tsconfig: './tsconfig.build.json' }),
			visualizer({ filename: 'bundle-stats.html', template: 'treemap' }),
		],
	},
	{
		input: 'dist/types/index.d.ts',
		output: { file: 'dist/index.d.ts', format: 'es' },
		plugins: [dts()],
	},
	{
		input: 'src/maplibre/index.ts',
		output: [
			{ file: 'dist/maplibre.js', format: 'es', sourcemap: true },
			{ file: 'dist/maplibre.cjs', format: 'cjs', sourcemap: true },
			{ file: 'dist/maplibre.umd.js', format: 'umd', name: 'VersaTilesSVG', sourcemap: true, globals: { 'maplibre-gl': 'maplibregl' } },
		],
		external: ['maplibre-gl'],
		plugins: [resolve(), typescript({ tsconfig: './tsconfig.build.json' })],
	},
	{
		input: 'dist/types/maplibre/index.d.ts',
		output: { file: 'dist/maplibre.d.ts', format: 'es' },
		plugins: [dts()],
	},
];

const maplibreConfig = [
	{
		input: 'src/maplibre/index.ts',
		output: [{ file: 'dist/maplibre.js', format: 'es', sourcemap: true }],
		external: ['maplibre-gl'],
		plugins: [resolve(), typescript({ tsconfig: './tsconfig.build.json' })],
	},
];

export default defineConfig(maplibreOnly ? maplibreConfig : allConfigs);
