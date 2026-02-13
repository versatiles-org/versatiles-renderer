import { describe, expect, test } from 'vitest';
import { Color } from './color.js';

describe('Color', () => {
	describe('constructor', () => {
		test('from #RRGGBB hex string', () => {
			const c = new Color('#FF8040');
			expect(c.values).toEqual([255, 128, 64, 255]);
		});

		test('from #RRGGBBAA hex string', () => {
			const c = new Color('#FF804080');
			expect(c.values).toEqual([255, 128, 64, 128]);
		});

		test('from RGB numbers', () => {
			const c = new Color(10, 20, 30);
			expect(c.values).toEqual([10, 20, 30, 255]);
		});

		test('from RGBA numbers', () => {
			const c = new Color(10, 20, 30, 40);
			expect(c.values).toEqual([10, 20, 30, 40]);
		});

		test('throws on invalid string', () => {
			expect(() => new Color('#FFF')).toThrow('Unsupported Color arguments');
		});

		test('throws on non-hex string', () => {
			expect(() => new Color('red')).toThrow('Unsupported Color arguments');
		});
	});

	describe('hex getter', () => {
		test('returns #RRGGBB when alpha is 255', () => {
			const c = new Color(255, 128, 0);
			expect(c.hex).toBe('#FF8000');
		});

		test('returns #RRGGBBAA when alpha is not 255', () => {
			const c = new Color(255, 128, 0, 128);
			expect(c.hex).toBe('#FF800080');
		});

		test('pads single-digit hex values with zero', () => {
			const c = new Color(0, 1, 15);
			expect(c.hex).toBe('#00010F');
		});
	});

	describe('alpha getter/setter', () => {
		test('returns alpha value', () => {
			const c = new Color(0, 0, 0, 100);
			expect(c.alpha).toBe(100);
		});

		test('sets alpha value', () => {
			const c = new Color(0, 0, 0, 100);
			c.alpha = 200;
			expect(c.alpha).toBe(200);
		});

		test('clamps alpha to 0', () => {
			const c = new Color(0, 0, 0);
			c.alpha = -10;
			expect(c.alpha).toBe(0);
		});

		test('clamps alpha to 255', () => {
			const c = new Color(0, 0, 0);
			c.alpha = 300;
			expect(c.alpha).toBe(255);
		});

		test('rounds alpha to nearest integer', () => {
			const c = new Color(0, 0, 0);
			c.alpha = 100.7;
			expect(c.alpha).toBe(101);
		});
	});

	describe('clone', () => {
		test('returns an independent copy', () => {
			const c = new Color(10, 20, 30, 40);
			const copy = c.clone();
			expect(copy.values).toEqual(c.values);
			copy.alpha = 200;
			expect(c.alpha).toBe(40);
		});
	});

	describe('transparent', () => {
		test('returns a fully transparent color', () => {
			const c = Color.transparent;
			expect(c.values).toEqual([0, 0, 0, 0]);
		});
	});
});
