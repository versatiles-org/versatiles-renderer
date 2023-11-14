/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { ErrorEvent } from '../util/evented';

import type { Evented } from '../util/evented';

interface ValidationError {
	message: string;
	line: number;
	identifier?: string;
}

export type Validator = (a: any) => readonly ValidationError[];

interface ValidateStyle {
	source: Validator;
	sprite: Validator;
	glyphs: Validator;
	layer: Validator;
	light: Validator;
	terrain: Validator;
	filter: Validator;
	paintProperty: Validator;
	layoutProperty: Validator;
	(b: any, a?: any | null): readonly ValidationError[];
}

export const validateStyle = (validateStyleMin as unknown as ValidateStyle);

export const validateSource = validateStyle.source;
export const validateLight = validateStyle.light;
export const validateTerrain = validateStyle.terrain;
export const validateFilter = validateStyle.filter;
export const validatePaintProperty = validateStyle.paintProperty;
export const validateLayoutProperty = validateStyle.layoutProperty;

export function emitValidationErrors(
	emitter: Evented,
	errors?: readonly {
		message: string;
		identifier?: string;
	}[] | null,
): boolean {
	let hasErrors = false;
	if (errors?.length) {
		for (const error of errors) {
			emitter.fire(new ErrorEvent(new Error(error.message)));
			hasErrors = true;
		}
	}
	return hasErrors;
}
