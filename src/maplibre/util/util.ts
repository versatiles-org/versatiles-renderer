/* eslint-disable */

/**
 * Minimal utility functions needed by the synced maplibre style code.
 * This is a manually maintained shim - not synced from the submodule.
 */

export interface Subscription {
	unsubscribe: () => void;
}

export function easeCubicInOut(t: number): number {
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	const t2 = t * t,
		t3 = t2 * t;
	return 4 * (t < 0.5 ? t3 : 3 * (t - t2) + t3 - 0.75);
}

export function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

export function wrap(n: number, min: number, max: number): number {
	const d = max - min;
	const w = ((n - min) % d + d) % d + min;
	return (w === min) ? max : w;
}

export function extend(dest: any, ...sources: any[]): any {
	for (const src of sources) {
		for (const k in src) {
			dest[k] = src[k];
		}
	}
	return dest;
}

export function filterObject(input: any, iterator: Function, context?: any): any {
	const output: any = {};
	for (const key in input) {
		if (iterator.call(context, input[key], key, input)) {
			output[key] = input[key];
		}
	}
	return output;
}

function mapObject(input: any, iterator: Function, context?: any): any {
	const output: any = {};
	for (const key in input) {
		output[key] = iterator.call(context, input[key], key, input);
	}
	return output;
}

export function clone<T>(input: T): T {
	if (Array.isArray(input)) {
		return input.map(clone) as any as T;
	} else if (typeof input === 'object' && input) {
		return mapObject(input, clone) as T;
	} else {
		return input;
	}
}

export function warnOnce(message: string): void {
	if (!warnOnceHistory[message]) {
		if (typeof console !== 'undefined') console.warn(message);
		warnOnceHistory[message] = true;
	}
}

const warnOnceHistory: Record<string, boolean> = {};
