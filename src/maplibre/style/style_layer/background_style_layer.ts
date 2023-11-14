/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { StyleLayer } from '../style_layer.js';

import properties from './background_style_layer_properties.g.js';
import type { Transitionable, Transitioning, PossiblyEvaluated } from '../properties.js';

import type { BackgroundPaintProps, BackgroundPaintPropsPossiblyEvaluated } from './background_style_layer_properties.g.js';
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

export class BackgroundStyleLayer extends StyleLayer {
	declare _transitionablePaint: Transitionable<BackgroundPaintProps>;

	declare _transitioningPaint: Transitioning<BackgroundPaintProps>;

	declare paint: PossiblyEvaluated<BackgroundPaintProps, BackgroundPaintPropsPossiblyEvaluated>;

	constructor(layer: LayerSpecification) {
		super(layer, properties);
	}
}
