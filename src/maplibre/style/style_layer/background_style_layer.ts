// @ts-nocheck
/* eslint-disable */
// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts

import {StyleLayer} from '../style_layer.js';

import properties, {type BackgroundPaintPropsPossiblyEvaluated} from './background_style_layer_properties.g.js';
import {type Transitionable, type Transitioning, type PossiblyEvaluated} from '../properties.js';

import type {BackgroundPaintProps} from './background_style_layer_properties.g.js';
import type {LayerSpecification} from '@maplibre/maplibre-gl-style-spec';

export const isBackgroundStyleLayer = (layer: StyleLayer): layer is BackgroundStyleLayer => layer.type === 'background';

export class BackgroundStyleLayer extends StyleLayer {
    _transitionablePaint: Transitionable<BackgroundPaintProps>;
    _transitioningPaint: Transitioning<BackgroundPaintProps>;
    paint: PossiblyEvaluated<BackgroundPaintProps, BackgroundPaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification, globalState: Record<string, any>) {
        super(layer, properties, globalState);
    }
}
