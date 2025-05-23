import { Component } from "../Component";
import { Curve } from "./Curve";

export declare type QuadraticBezierCurveConfiguration = {
    /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /** The starting point. */
    v0: number[];
    /** The middle control point. */
    v1: number[];
    /** The end point. */
    v2: number[];
    /** Current position on this QuadraticBezierCurve, in range between ````0..1````. */
    t: number;
}

export declare type QuadraticBezierCurveJson = {
    v0: number[];
    v1: number[];
    v2: number[];
    t: number;
}

export declare class QuadraticBezierCurve extends Curve {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this MetallicMaterial as well.
     * @param {QuadraticBezierCurveConfiguration} [cfg] Configuration
     */
    constructor(owner: Component, cfg?: QuadraticBezierCurveConfiguration);

    /**
     * Sets the starting point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @param {Number[]} value New starting point.
     */
    set v0(value: number[]);

    /**
     * Gets the starting point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @returns {Number[]} The starting point.
     */
    get v0(): number[];

    /**
     * Sets the middle control point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @param {Number[]} value New middle control point.
     */
    set v1(value: number[]);

    /**
     * Gets the middle control point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @returns {Number[]} The middle control point.
     */
    get v1(): number[];

    /**
     * Sets the end point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @param {Number[]} value The new end point.
     */
    set v2(value: number[]);

    /**
     * Gets the end point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @returns {Number[]} The end point.
     */
    get v2(): number[];

    /**
     * Sets the progress along this QuadraticBezierCurve.
     *
     * Automatically clamps to range [0..1].
     *
     * Default value is ````0````.
     *
     * @param {Number} value The new progress location.
     */
    set t(value: number);

    /**
     * Gets the progress along this QuadraticBezierCurve.
     *
     * Default value is ````0````.
     *
     * @returns {Number} The current progress location.
     */
    get t(): number;

    /**
     Point on this QuadraticBezierCurve at position {@link QuadraticBezierCurve/t}.

     @property point
     @type {Number[]}
     */
    get point(): number[];

    /**
     * Returns the point on this QuadraticBezierCurve at the given position.
     *
     * @param {Number} t Position to get point at.
     * @returns {Number[]} The point.
     */
    getPoint(t: number): number[];

    getJSON(): QuadraticBezierCurveJson;
}