/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { StyleLayer } from '../style_layer.js';

import properties from './fill_style_layer_properties.g.js';
import type { Transitionable, Transitioning, Layout, PossiblyEvaluated } from '../properties.js';

import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { FillLayoutProps, FillPaintProps, FillLayoutPropsPossiblyEvaluated, FillPaintPropsPossiblyEvaluated } from './fill_style_layer_properties.g';
import type { EvaluationParameters } from '../evaluation_parameters.js';

export class FillStyleLayer extends StyleLayer {
	declare _unevaluatedLayout!: Layout<FillLayoutProps>;

	declare layout: PossiblyEvaluated<FillLayoutProps, FillLayoutPropsPossiblyEvaluated>;

	declare _transitionablePaint: Transitionable<FillPaintProps>;

	declare _transitioningPaint: Transitioning<FillPaintProps>;

	declare paint: PossiblyEvaluated<FillPaintProps, FillPaintPropsPossiblyEvaluated>;

	constructor(layer: LayerSpecification) {
		super(layer, properties);
	}

	recalculate(parameters: EvaluationParameters, availableImages: string[]) {
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
