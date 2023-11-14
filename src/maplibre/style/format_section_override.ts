/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import type { Expression, EvaluationContext, Type, ZoomConstantExpression } from '@maplibre/maplibre-gl-style-spec';
import { NullType } from '@maplibre/maplibre-gl-style-spec';
import type { PossiblyEvaluatedPropertyValue } from './properties';

// This is an internal expression class. It is only used in GL JS and
// has GL JS dependencies which can break the standalone style-spec module
export class FormatSectionOverride<T> implements Expression {
	type: Type;

	defaultValue: PossiblyEvaluatedPropertyValue<T>;

	constructor(defaultValue: PossiblyEvaluatedPropertyValue<T>) {
		if (defaultValue.property.overrides === undefined) throw new Error('overrides must be provided to instantiate FormatSectionOverride class');
		this.type = defaultValue.property.overrides ? defaultValue.property.overrides.runtimeType : NullType;
		this.defaultValue = defaultValue;
	}

	evaluate(ctx: EvaluationContext) {
		if (ctx.formattedSection) {
			const { overrides } = this.defaultValue.property;
			if (overrides?.hasOverride(ctx.formattedSection)) {
				return overrides.getOverride(ctx.formattedSection);
			}
		}

		if (ctx.feature && ctx.featureState) {
			return this.defaultValue.evaluate(ctx.feature, ctx.featureState);
		}

		return this.defaultValue.property.specification.default;
	}

	eachChild(fn: (_: Expression) => void) {
		if (!this.defaultValue.isConstant()) {
			const expr: ZoomConstantExpression<'source'> = (this.defaultValue.value as any);
			fn(expr._styleExpression.expression);
		}
	}

	// Cannot be statically evaluated, as the output depends on the evaluation context.
	outputDefined() {
		return false;
	}

	serialize() {
		return null;
	}
}
