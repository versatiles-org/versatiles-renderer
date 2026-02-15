import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['lib/**', 'node_modules/**', 'dist/**'],
		passWithNoTests: true,
		coverage: {
			include: ['src/**/*.ts'],
			exclude: ['src/demo.ts'],
		},
	},
});
