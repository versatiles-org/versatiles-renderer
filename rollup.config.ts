import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
	{
		input: 'src/index.ts',
		output: [
			{ file: 'dist/index.js', format: 'es' },
			{ file: 'dist/index.cjs', format: 'cjs' },
		],
		external: [
			'@maplibre/maplibre-gl-style-spec',
			'@mapbox/vector-tile',
			'pbf',
			'@turf/union',
		],
		plugins: [
			resolve(),
			typescript({ tsconfig: './tsconfig.build.json' }),
		],
	},
	{
		input: 'dist/types/index.d.ts',
		output: { file: 'dist/index.d.ts', format: 'es' },
		plugins: [dts()],
	},
]);
