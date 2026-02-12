// @ts-nocheck
/* eslint-disable */
// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts

import {StyleLayer} from '../style_layer.js';

import {resolveTokens} from '../../util/resolve_tokens.js';
import properties, {type SymbolLayoutPropsPossiblyEvaluated, type SymbolPaintPropsPossiblyEvaluated} from './symbol_style_layer_properties.g.js';

import {
    type Transitionable,
    type Transitioning,
    type Layout,
    type PossiblyEvaluated,
    PossiblyEvaluatedPropertyValue,
    type PropertyValue
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
    Literal} from '@maplibre/maplibre-gl-style-spec';

import type {SymbolLayoutProps, SymbolPaintProps} from './symbol_style_layer_properties.g.js';
import type {EvaluationParameters} from '../evaluation_parameters.js';
import type {Expression, Feature, SourceExpression, LayerSpecification} from '@maplibre/maplibre-gl-style-spec';
type CanonicalTileID = { z: number; x: number; y: number };
import {FormatSectionOverride} from '../format_section_override.js';

export const isSymbolStyleLayer = (layer: StyleLayer): layer is SymbolStyleLayer => layer.type === 'symbol';

export class SymbolStyleLayer extends StyleLayer {
    declare _unevaluatedLayout: Layout<SymbolLayoutProps>;
    declare layout: PossiblyEvaluated<SymbolLayoutProps, SymbolLayoutPropsPossiblyEvaluated>;

    declare _transitionablePaint: Transitionable<SymbolPaintProps>;
    declare _transitioningPaint: Transitioning<SymbolPaintProps>;
    declare paint: PossiblyEvaluated<SymbolPaintProps, SymbolPaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification, globalState: Record<string, any>) {
        super(layer, properties, globalState);
    }

    recalculate(parameters: EvaluationParameters, availableImages: Array<string>) {
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
                    if (deduped.indexOf(m) < 0) deduped.push(m);
                }
                this.layout._values['text-writing-mode'] = deduped;
            } else {
                this.layout._values['text-writing-mode'] = ['horizontal'];
            }
        }

        this._setPaintOverrides();
    }

    getValueAndResolveTokens(name: any, feature: Feature, canonical: CanonicalTileID, availableImages: Array<string>) {
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
            const overridden = this.paint.get(overridable as keyof SymbolPaintPropsPossiblyEvaluated) as PossiblyEvaluatedPropertyValue<number>;
            const override = new FormatSectionOverride(overridden);
            const styleExpression = new StyleExpression(override, overridden.property.specification);
            let expression = null;
            if (overridden.value.kind === 'constant' || overridden.value.kind === 'source') {
                expression = new ZoomConstantExpression('source', styleExpression) as SourceExpression;
            } else {
                expression = new ZoomDependentExpression('composite',
                    styleExpression,
                    overridden.value.zoomStops);
            }
            this.paint._values[overridable] = new PossiblyEvaluatedPropertyValue(overridden.property,
                expression,
                overridden.parameters);
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

        const checkSections = (sections) => {
            for (const section of sections) {
                if (property.overrides && property.overrides.hasOverride(section)) {
                    hasOverrides = true;
                    return;
                }
            }
        };

        if (textField.value.kind === 'constant' && textField.value.value instanceof Formatted) {
            checkSections(textField.value.value.sections);
        } else if (textField.value.kind === 'source' || textField.value.kind === 'composite') {

            const checkExpression = (expression: Expression) => {
                if (hasOverrides) return;

                if (expression instanceof Literal && typeOf(expression.value) === FormattedType) {
                    const formatted: Formatted = (expression.value as any);
                    checkSections(formatted.sections);
                } else if (expression instanceof FormatExpression) {
                    checkSections(expression.sections);
                } else {
                    expression.eachChild(checkExpression);
                }
            };

            const expr: ZoomConstantExpression<'source'> = (textField.value as any);
            if (expr._styleExpression) {
                checkExpression(expr._styleExpression.expression);
            }
        }

        return hasOverrides;
    }
}


