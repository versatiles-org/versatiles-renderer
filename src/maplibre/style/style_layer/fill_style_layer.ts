/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { StyleLayer } from '../style_layer';

import properties from './fill_style_layer_properties.g';
import type { Transitionable, Transitioning, Layout, PossiblyEvaluated } from '../properties';

import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { FillLayoutProps, FillPaintProps, FillLayoutPropsPossiblyEvaluated, FillPaintPropsPossiblyEvaluated } from './fill_style_layer_properties.g';
import type { EvaluationParameters } from '../evaluation_parameters';

export class FillStyleLayer extends StyleLayer {
	_unevaluatedLayout: Layout<FillLayoutProps>;

	layout: PossiblyEvaluated<FillLayoutProps, FillLayoutPropsPossiblyEvaluated>;

	_transitionablePaint: Transitionable<FillPaintProps>;

	_transitioningPaint: Transitioning<FillPaintProps>;

	paint: PossiblyEvaluated<FillPaintProps, FillPaintPropsPossiblyEvaluated>;

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
