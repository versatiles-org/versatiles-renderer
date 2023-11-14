/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/max-params */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { StyleLayer } from '../style_layer.js';

import { resolveTokens } from '../../util/resolve_tokens.js';
import properties from './symbol_style_layer_properties.g.js';

import type {
	Transitionable,
	Transitioning,
	Layout,
	PossiblyEvaluated,
	PropertyValue,
} from '../properties.js';
import {
	PossiblyEvaluatedPropertyValue,
} from '../properties.js';

import {
	isExpression,
	StyleExpression,
	ZoomConstantExpression,
	ZoomDependentExpression,
	FormattedType,
	typeOf,
	Formatted,
	FormatExpression,
	Literal,
} from '@maplibre/maplibre-gl-style-spec';

import type { SymbolLayoutProps, SymbolPaintProps, SymbolLayoutPropsPossiblyEvaluated, SymbolPaintPropsPossiblyEvaluated } from './symbol_style_layer_properties.g';
import type { EvaluationParameters } from '../evaluation_parameters.js';
import type { Expression, Feature, SourceExpression, LayerSpecification, FormattedSection, FormattedSectionExpression } from '@maplibre/maplibre-gl-style-spec';
import { FormatSectionOverride } from '../format_section_override.js';

export class SymbolStyleLayer extends StyleLayer {
	declare _unevaluatedLayout: Layout<SymbolLayoutProps>;

	declare layout: PossiblyEvaluated<SymbolLayoutProps, SymbolLayoutPropsPossiblyEvaluated>;

	declare _transitionablePaint: Transitionable<SymbolPaintProps>;

	declare _transitioningPaint: Transitioning<SymbolPaintProps>;

	declare paint: PossiblyEvaluated<SymbolPaintProps, SymbolPaintPropsPossiblyEvaluated>;

	constructor(layer: LayerSpecification) {
		super(layer, properties);
	}

	recalculate(parameters: EvaluationParameters, availableImages: string[]) {
		super.recalculate(parameters, availableImages);

		if (this.layout.get('icon-rotation-alignment') === 'auto') {
			if (this.layout.get('symbol-placement') !== 'point') {
				this.layout._values['icon-rotation-alignment'] = 'map';
			} else {
				this.layout._values['icon-rotation-alignment'] = 'viewport';
			}
		}

		if (this.layout.get('text-rotation-alignment') === 'auto') {
			if (this.layout.get('symbol-placement') !== 'point') {
				this.layout._values['text-rotation-alignment'] = 'map';
			} else {
				this.layout._values['text-rotation-alignment'] = 'viewport';
			}
		}

		// If unspecified, `*-pitch-alignment` inherits `*-rotation-alignment`
		if (this.layout.get('text-pitch-alignment') === 'auto') {
			this.layout._values['text-pitch-alignment'] = this.layout.get('text-rotation-alignment') === 'map' ? 'map' : 'viewport';
		}
		if (this.layout.get('icon-pitch-alignment') === 'auto') {
			this.layout._values['icon-pitch-alignment'] = this.layout.get('icon-rotation-alignment');
		}

		if (this.layout.get('symbol-placement') === 'point') {
			const writingModes = this.layout.get('text-writing-mode');
			if (writingModes) {
				// remove duplicates, preserving order
				const deduped = [];
				for (const m of writingModes) {
					if (!deduped.includes(m)) deduped.push(m);
				}
				this.layout._values['text-writing-mode'] = deduped;
			} else {
				this.layout._values['text-writing-mode'] = ['horizontal'];
			}
		}

		this._setPaintOverrides();
	}

	getValueAndResolveTokens(name: any, feature: Feature, canonical: CanonicalTileID, availableImages: string[]) {
		const value = this.layout.get(name).evaluate(feature, {}, canonical, availableImages);
		const unevaluated = this._unevaluatedLayout._values[name];
		if (!unevaluated.isDataDriven() && !isExpression(unevaluated.value) && value) {
			return resolveTokens(feature.properties, value);
		}

		return value;
	}

	_setPaintOverrides() {
		for (const overridable of properties.paint.overridableProperties) {
			if (!SymbolStyleLayer.hasPaintOverride(this.layout, overridable)) {
				continue;
			}
			const overriden = this.paint.get(overridable as keyof SymbolPaintPropsPossiblyEvaluated) as PossiblyEvaluatedPropertyValue<number>;
			const override = new FormatSectionOverride(overriden);
			const styleExpression = new StyleExpression(override, overriden.property.specification);
			let expression = null;
			if (overriden.value.kind === 'constant' || overriden.value.kind === 'source') {
				expression = new ZoomConstantExpression('source', styleExpression) as SourceExpression;
			} else {
				expression = new ZoomDependentExpression('composite',
					styleExpression,
					overriden.value.zoomStops);
			}
			this.paint._values[overridable] = new PossiblyEvaluatedPropertyValue(overriden.property,
				expression,
				overriden.parameters);
		}
	}

	_handleOverridablePaintPropertyUpdate<T, R>(name: string, oldValue: PropertyValue<T, R>, newValue: PropertyValue<T, R>): boolean {
		if (!this.layout || oldValue.isDataDriven() || newValue.isDataDriven()) {
			return false;
		}
		return SymbolStyleLayer.hasPaintOverride(this.layout, name);
	}

	static hasPaintOverride(layout: PossiblyEvaluated<SymbolLayoutProps, SymbolLayoutPropsPossiblyEvaluated>, propertyName: string): boolean {
		const textField = layout.get('text-field');
		const property = properties.paint.properties[propertyName];
		let hasOverrides = false;

		const checkSections = (sections: FormattedSection[] | FormattedSectionExpression[]) => {
			for (const section of sections) {
				if (property.overrides?.hasOverride(section)) {
					hasOverrides = true;
					return;
				}
			}
		};

		if (textField.value.kind === 'constant' && textField.value.value instanceof Formatted) {
			checkSections(textField.value.value.sections);
		} else if (textField.value.kind === 'source') {

			const checkExpression = (expression: Expression) => {
				if (hasOverrides) return;

				if (expression instanceof Literal && typeOf(expression.value) === FormattedType) {
					const formatted = expression.value as Formatted;
					checkSections(formatted.sections);
				} else if (expression instanceof FormatExpression) {
					checkSections(expression.sections);
				} else {
					expression.eachChild(checkExpression);
				}
			};

			const expr: ZoomConstantExpression<'source'> = textField.value;
			if (expr._styleExpression) {
				checkExpression(expr._styleExpression.expression);
			}
		}

		return hasOverrides;
	}
}

export type SymbolPadding = [number, number, number, number];

export function getIconPadding(layout: PossiblyEvaluated<SymbolLayoutProps, SymbolLayoutPropsPossiblyEvaluated>, feature: SymbolFeature, canonical: CanonicalTileID, pixelRatio = 1): SymbolPadding {
	// Support text-padding in addition to icon-padding? Unclear how to apply asymmetric text-padding to the radius for collision circles.
	const result = layout.get('icon-padding').evaluate(feature, {}, canonical);
	const values = result?.values;

	return [
		values[0] * pixelRatio,
		values[1] * pixelRatio,
		values[2] * pixelRatio,
		values[3] * pixelRatio,
	];
}
