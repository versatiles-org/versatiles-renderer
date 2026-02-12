// @ts-nocheck
/* eslint-disable */
// Synced from lib/maplibre-gl-js — do not edit manually. Run: npx tsx scripts/sync-maplibre.ts


import {latest as styleSpec} from '@maplibre/maplibre-gl-style-spec';

import {
    Properties,
    DataConstantProperty,
    DataDrivenProperty,
    CrossFadedDataDrivenProperty,
    CrossFadedProperty,
    ColorRampProperty,
    PossiblyEvaluatedPropertyValue,
    CrossFaded
} from '../properties.js';

import type {Color, Formatted, Padding, NumberArray, ColorArray, ResolvedImage, VariableAnchorOffsetCollection} from '@maplibre/maplibre-gl-style-spec';
import {StylePropertySpecification} from '@maplibre/maplibre-gl-style-spec';


export type BackgroundPaintProps = {
    "background-color": DataConstantProperty<Color>,
    "background-pattern": CrossFadedProperty<ResolvedImage>,
    "background-opacity": DataConstantProperty<number>,
};

export type BackgroundPaintPropsPossiblyEvaluated = {
    "background-color": Color,
    "background-pattern": CrossFaded<ResolvedImage>,
    "background-opacity": number,
};

let paint: Properties<BackgroundPaintProps>;
const getPaint = () => paint = paint || new Properties({
    "background-color": new DataConstantProperty(styleSpec["paint_background"]["background-color"] as any as StylePropertySpecification),
    "background-pattern": new CrossFadedProperty(styleSpec["paint_background"]["background-pattern"] as any as StylePropertySpecification),
    "background-opacity": new DataConstantProperty(styleSpec["paint_background"]["background-opacity"] as any as StylePropertySpecification),
});

export default ({ get paint() { return getPaint() } });