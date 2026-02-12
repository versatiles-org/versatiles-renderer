// @ts-nocheck
/* eslint-disable */
// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts

import {StyleLayer} from '../style_layer.js';
import properties, {type FillLayoutPropsPossiblyEvaluated, type FillPaintPropsPossiblyEvaluated} from './fill_style_layer_properties.g.js';

import type {Transitionable, Transitioning, Layout, PossiblyEvaluated} from '../properties.js';
import type {LayerSpecification} from '@maplibre/maplibre-gl-style-spec';
import type {FillLayoutProps, FillPaintProps} from './fill_style_layer_properties.g.js';
import type {EvaluationParameters} from '../evaluation_parameters.js';

export const isFillStyleLayer = (layer: StyleLayer): layer is FillStyleLayer => layer.type === 'fill';

export class FillStyleLayer extends StyleLayer {
    declare _unevaluatedLayout: Layout<FillLayoutProps>;
    declare layout: PossiblyEvaluated<FillLayoutProps, FillLayoutPropsPossiblyEvaluated>;

    declare _transitionablePaint: Transitionable<FillPaintProps>;
    declare _transitioningPaint: Transitioning<FillPaintProps>;
    declare paint: PossiblyEvaluated<FillPaintProps, FillPaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification, globalState: Record<string, any>) {
        super(layer, properties, globalState);
    }

    recalculate(parameters: EvaluationParameters, availableImages: Array<string>) {
        super.recalculate(parameters, availableImages);

        const outlineColor = this.paint._values['fill-outline-color'];
        if (outlineColor.value.kind === 'constant' && outlineColor.value.value === undefined) {
            this.paint._values['fill-outline-color'] = this.paint._values['fill-color'];
        }
    }




    isTileClipped() {
        return true;
    }
}
