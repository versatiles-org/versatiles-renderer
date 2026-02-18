import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	globalIgnores([
		'coverage/**',
		'dev/**',
		'dist/**',
		'doc-typescript/**',
		'e2e/**',
		'lib/**',
		'scripts/**',
	]),
	{
		files: ['src/**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.strictTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {},
	},
);
