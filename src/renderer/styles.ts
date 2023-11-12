import type { BackgroundLayer, Expression, FillLayer, LineLayer, StyleFunction, SymbolLayer } from 'mapbox-gl';
import { Color } from './color.js';
import { Point } from '../lib/geometry.js';

interface StyleOptions {
	zoom: number;
}

export interface BackgroundStyle {
	color: Color;
	opacity: number;
	visible: boolean;
}

export function makeBackgroundStyle(l: BackgroundLayer, o: StyleOptions): BackgroundStyle {
	return {
		color: new Color(exp(l.paint?.['background-color'], o) ?? '#000'),
		opacity: exp(l.paint?.['background-opacity'], o) ?? 1,
		visible: (exp(l.layout?.visibility, o) ?? 'visible') == 'visible',
	};
}


export interface FillStyle {
	color: Color;
	opacity: number;
	translate: Point;
	visible: boolean;
}

export function makeFillStyle(l: FillLayer, o: StyleOptions): FillStyle {
	return {
		color: new Color(exp(l.paint?.['fill-color'], o) ?? '#000'),
		opacity: exp(l.paint?.['fill-opacity'], o) ?? 1,
		translate: new Point(...l.paint?.['fill-translate'] ?? [0, 0]),
		visible: (exp(l.layout?.visibility, o) ?? 'visible') == 'visible',
	};
}


export interface LineStyle {
	blur: number;
	cap: 'butt' | 'round' | 'square';
	color: Color;
	dasharray: number[];
	gapWidth: number;
	join: 'bevel' | 'miter' | 'round';
	miterLimit: number;
	offset: number;
	opacity: number;
	roundLimit: number;
	translate: Point;
	visible: boolean;
	width: number;
}

export function makeLineStyle(l: LineLayer, o: StyleOptions): LineStyle {
	return {
		blur: exp(l.paint?.['line-blur'], o) ?? 0,
		cap: exp(l.layout?.['line-cap'], o) ?? 'butt',
		color: new Color(exp(l.paint?.['line-color'], o) ?? '#000'),
		dasharray: exp(l.paint?.['line-dasharray'], o) ?? [1],
		gapWidth: exp(l.paint?.['line-gap-width'], o) ?? 0,
		join: exp(l.layout?.['line-join'], o) ?? 'miter',
		miterLimit: exp(l.layout?.['line-miter-limit'], o) ?? 2,
		offset: exp(l.paint?.['line-offset'], o) ?? 0,
		opacity: exp(l.paint?.['line-opacity'] ?? 1, o),
		roundLimit: exp(l.layout?.['line-round-limit'], o) ?? 1.05,
		translate: new Point(...l.paint?.['line-translate'] ?? [0, 0]),
		visible: (exp(l.layout?.visibility, o) ?? 'visible') == 'visible',
		width: exp(l.paint?.['line-width'], o) ?? 1,
	};

}


export interface TextStyle {
	color: Color;
	visible: boolean;
}

export function makeTextStyle(l: SymbolLayer, o: StyleOptions): TextStyle {
	const color = new Color(exp(l.paint?.['text-color'] ?? '#000', o));
	color.alpha *= exp(l.paint?.['text-opacity'] ?? 1, o);
	return {
		color,
		visible: (exp(l.layout?.visibility, o) ?? 'visible') == 'visible',
	};

}


export interface SymbolStyle {
	color: Color;
	visible: boolean;
}

export function makeSymbolStyle(l: SymbolLayer, o: StyleOptions): SymbolStyle {
	const color = new Color(exp(l.paint?.['icon-color'] ?? '#000', o));
	color.alpha *= exp(l.paint?.['icon-opacity'] ?? 1, o);
	return {
		color,
		visible: (exp(l.layout?.visibility, o) ?? 'visible') == 'visible',
	};

}


function exp<I = number | string | undefined>(value: Expression | I | StyleFunction, o: StyleOptions): I {
	if (typeof value === 'object') {
		console.log(o);
		if (Array.isArray(value)) {
			throw Error('implement me');
		} else {
			throw Error('implement me');
		}
	}
	return value;
}