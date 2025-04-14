import { Component } from '../Component';
import { Curve } from './Curve';

export declare type SplineCurveConfiguration = {
    /**Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /**Control points on this SplineCurve. */
    points?: number[];
    /**Current position on this SplineCurve, in range between 0..1. */
    t?: number;
}

export declare type SpliceCurveJSON = {
    points: number[];
    t: number;
}

export declare class SplineCurve extends Curve {

    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this SplineCurve as well.
     * @param {SplineCurveConfiguration} [cfg] Configs
     */
    constructor(owner?: Component, cfg?: SplineCurveConfiguration);

    /**
     * Sets the control points on this SplineCurve.
     *
     * Default value is ````[]````.
     *
     * @param {Number[]} value New control points.
     */
    set points(value: number);

    /**
     * Gets the control points on this SplineCurve.
     *
     * Default value is ````[]````.
     *
     * @returns {Number[]} The control points.
     */
    get points(): number[];

    /**
     * Sets the progress along this SplineCurve.
     *
     * Automatically clamps to range ````[0..1]````.
     *
     * Default value is ````0````.
     *
     * @param {Number} value The new progress.
     */
    set t(value: number);

    /**
     * Gets the progress along this SplineCurve.
     *
     * Automatically clamps to range ````[0..1]````.
     *
     * Default value is ````0````.
     *
     * @returns {Number} The new progress.
     */
    get t(): number;

    /**
     * Gets the point on this SplineCurve at position {@link SplineCurve#t}.
     *
     * @returns {Number[]} The point at {@link SplineCurve#t}.
     */
    get point(): number;

    /**
     * Returns point on this SplineCurve at the given position.
     *
     * @param {Number} t Position to get point at.
     * @returns {Number[]} Point at the given position.
     */
    getPoint(t: number): number[];

    getJSON(): SpliceCurveJSON;

}