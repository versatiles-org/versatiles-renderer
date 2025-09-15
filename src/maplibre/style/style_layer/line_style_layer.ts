/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/max-params */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */

import { StyleLayer } from '../style_layer';
import properties from './line_style_layer_properties.g';
import { extend } from '../../util/util';
import { EvaluationParameters } from '../evaluation_parameters';
import type { Transitionable, Transitioning, Layout, PossiblyEvaluated } from '../properties';
import { DataDrivenProperty } from '../properties';

import { isZoomExpression, Step } from '@maplibre/maplibre-gl-style-spec';
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LineLayoutProps, LinePaintProps, LineLayoutPropsPossiblyEvaluated, LinePaintPropsPossiblyEvaluated } from './line_style_layer_properties.g';

export class LineFloorwidthProperty extends DataDrivenProperty<number> {
	useIntegerZoom: true;

	possiblyEvaluate(value, parameters) {
		parameters = new EvaluationParameters(Math.floor(parameters.zoom), {
			now: parameters.now,
			fadeDuration: parameters.fadeDuration,
			zoomHistory: parameters.zoomHistory,
			transition: parameters.transition,
		});
		return super.possiblyEvaluate(value, parameters);
	}

	evaluate(value, globals, feature, featureState) {
		globals = extend({}, globals, { zoom: Math.floor(globals.zoom) });
		return super.evaluate(value, globals, feature, featureState);
	}
}

let lineFloorwidthProperty: LineFloorwidthProperty;

export class LineStyleLayer extends StyleLayer {
	declare _unevaluatedLayout: Layout<LineLayoutProps>;

	declare layout: PossiblyEvaluated<LineLayoutProps, LineLayoutPropsPossiblyEvaluated>;

	declare gradientVersion: number;

	declare stepInterpolant: boolean;

	declare _transitionablePaint: Transitionable<LinePaintProps>;

	declare _transitioningPaint: Transitioning<LinePaintProps>;

	declare paint: PossiblyEvaluated<LinePaintProps, LinePaintPropsPossiblyEvaluated>;

	constructor(layer: LayerSpecification) {
		super(layer, properties);
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

	recalculate(parameters: EvaluationParameters, availableImages: string[]) {
		super.recalculate(parameters, availableImages);
		(this.paint._values as any)['line-floorwidth'] =
			lineFloorwidthProperty.possiblyEvaluate(this._transitioningPaint._values['line-width'].value, parameters);
	}

	isTileClipped() {
		return true;
	}
}

function getLineWidth(lineWidth, lineGapWidth) {
	if (lineGapWidth > 0) {
		return lineGapWidth + 2 * lineWidth;
	} else {
		return lineWidth;
	}
}
