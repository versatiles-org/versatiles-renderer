// @ts-nocheck
/* eslint-disable */
// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts

import {StyleLayer} from '../style_layer.js';
import properties, {type LineLayoutPropsPossiblyEvaluated, type LinePaintPropsPossiblyEvaluated} from './line_style_layer_properties.g.js';
import {extend} from '../../util/util.js';
import {EvaluationParameters} from '../evaluation_parameters.js';
import {type Transitionable, type Transitioning, type Layout, type PossiblyEvaluated, DataDrivenProperty} from '../properties.js';

import {isZoomExpression, Step} from '@maplibre/maplibre-gl-style-spec';
import type {LayerSpecification} from '@maplibre/maplibre-gl-style-spec';
import type {LineLayoutProps, LinePaintProps} from './line_style_layer_properties.g.js';

export class LineFloorwidthProperty extends DataDrivenProperty<number> {
    useIntegerZoom: true;

    possiblyEvaluate(value, parameters) {
        parameters = new EvaluationParameters(Math.floor(parameters.zoom), {
            now: parameters.now,
            fadeDuration: parameters.fadeDuration,
            zoomHistory: parameters.zoomHistory,
            transition: parameters.transition
        });
        return super.possiblyEvaluate(value, parameters);
    }

    evaluate(value, globals, feature, featureState) {
        globals = extend({}, globals, {zoom: Math.floor(globals.zoom)});
        return super.evaluate(value, globals, feature, featureState);
    }
}

let lineFloorwidthProperty: LineFloorwidthProperty;

export const isLineStyleLayer = (layer: StyleLayer): layer is LineStyleLayer => layer.type === 'line';

export class LineStyleLayer extends StyleLayer {
    declare _unevaluatedLayout: Layout<LineLayoutProps>;
    declare layout: PossiblyEvaluated<LineLayoutProps, LineLayoutPropsPossiblyEvaluated>;

    gradientVersion: number;
    stepInterpolant: boolean;

    declare _transitionablePaint: Transitionable<LinePaintProps>;
    declare _transitioningPaint: Transitioning<LinePaintProps>;
    declare paint: PossiblyEvaluated<LinePaintProps, LinePaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification, globalState: Record<string, any>) {
        super(layer, properties, globalState);
        this.gradientVersion = 0;
        if (!lineFloorwidthProperty) {
            lineFloorwidthProperty =
                new LineFloorwidthProperty(properties.paint.properties['line-width'].specification);
            lineFloorwidthProperty.useIntegerZoom = true;
        }
    }

    _handleSpecialPaintPropertyUpdate(name: string) {
        if (name === 'line-gradient') {
            const expression = this.gradientExpression();
            if (isZoomExpression(expression)) {
                this.stepInterpolant = expression._styleExpression.expression instanceof Step;
            } else {
                this.stepInterpolant = false;
            }
            this.gradientVersion = (this.gradientVersion + 1) % Number.MAX_SAFE_INTEGER;
        }
    }

    gradientExpression() {
        return this._transitionablePaint._values['line-gradient'].value.expression;
    }

    recalculate(parameters: EvaluationParameters, availableImages: Array<string>) {
        super.recalculate(parameters, availableImages);
        (this.paint._values as any)['line-floorwidth'] =
            lineFloorwidthProperty.possiblyEvaluate(this._transitioningPaint._values['line-width'].value, parameters);
    }




    isTileClipped() {
        return true;
    }
}

