import { Component } from '../Component';
import { Curve } from './Curve';

export declare type CubicBezierCurveConfiguration = {
    /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /** The starting point. */
    v0: number[];
    /** The first control point. */
    v1: number[];
    /** The middle control point. */
    v2: number[];
    /** The ending point. */
    v3: number[];
    /** Current position on this CubicBezierCurve, in range between 0..1. */
    t: number;
}

export declare type CubicBezierCurveJson = {
    v0: number[],
    v1: number[],
    v2: number[],
    v3: number[],
    t: number
}

export declare class CubicBezierCurve extends Curve {
    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this CubicBezierCurve as well.
     * @param {CubicBezierCurveConfiguration} [cfg] Configs
     */
    constructor(owner: Component, cfg?: CubicBezierCurveConfiguration);

    /**
     * Sets the starting point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @param {Number[]} value The starting point.
     */
    set v0(value: number[]);

    /**
     * Gets the starting point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @returns {Number[]} The starting point.
     */
    get v0(): number[];

    /**
     * Sets the first control point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @param {Number[]} value The first control point.
     */
    set v1(value: number[]);

    /**
     * Gets the first control point on this CubicBezierCurve.
     *
     * Fires a {@link CubicBezierCurve#v1:event} event on change.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @returns {Number[]} The first control point.
     */
    get v1(): number[];

    /**
     * Sets the second control point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @param {Number[]} value The second control point.
     */
    set v2(value: number[]);

    /**
     * Gets the second control point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @returns {Number[]} The second control point.
     */
    get v2(): number[];

    /**
     * Sets the end point on this CubicBezierCurve.
     *
     * Fires a {@link CubicBezierCurve#v3:event} event on change.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @param {Number[]} value The end point.
     */
    set v3(value: number[]);

    /**
     * Gets the end point on this CubicBezierCurve.
     *
     * Fires a {@link CubicBezierCurve#v3:event} event on change.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     *
     * @returns {Number[]} The end point.
     */
    get v3(): number[];

    /**
     * Sets the current position of progress along this CubicBezierCurve.
     *
     * Automatically clamps to range ````[0..1]````.
     *
     * @param {Number} value New progress time value.
     */
    set t(value: number);

    /**
     * Gets the current position of progress along this CubicBezierCurve.
     *
     * @returns {Number} Current progress time value.
     */
    get t(): number;

    /**
     * Returns point on this CubicBezierCurve at the given position.
     *
     * @returns {Number[]} The point at the given position.
     */
    get point(): number[];

    /**
     * Returns point on this CubicBezierCurve at the given position.
     *
     * @param {Number} t Position to get point at.
     *
     * @returns {Number[]} The point at the given position.
     */
    getPoint(t: number): number[];

    getJSON(): CubicBezierCurveJson;
}