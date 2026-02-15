import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ['dist/**', 'coverage/**', 'lib/**'],
	},
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
				tsconfigRootDir: new URL('./', import.meta.url).pathname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {},
	},
];
