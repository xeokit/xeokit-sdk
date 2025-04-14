import { Component } from "../Component";

export declare type CurveConfiguration = {
    /**Optional ID, unique among all components in the parent {@link Curve}, generated automatically when omitted. */
    id?: string 
    /**Current position on this Curve, in range between ````0..1```` */
    t?: number
}

export declare class Curve extends Component {
    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this Curve as well.
     * @param {CurveConfiguration} [cfg] Configs
     */
    constructor(owner?: Component, cfg?: CurveConfiguration);

    /**
     * Sets the progress along this Curve.
     *
     * Automatically clamps to range ````[0..1]````.
     *
     * Default value is ````0````.
     *
     * @param {Number} value The progress value.
     */
    set t(value: number);

    /**
     * Gets the progress along this Curve.
     *
     * @returns {Number} The progress value.
     */
    get t(): number;

    /**
     * Gets the tangent on this Curve at position {@link Curve#t}.
     *
     * @returns {Number[]} The tangent.
     */
    get tangent(): number[];

    /**
     * Gets the length of this Curve.
     *
     * @returns {Number} The Curve length.
     */
    get length(): number;

    /**
     * Returns a normalized tangent vector on this Curve at the given position.
     *
     * @param {Number} t Position to get tangent at.
     * @returns {Number[]} Normalized tangent vector
     */
    getTangent(t: number): number[];

    getPointAt(u: number): number[];

    /**
     * Samples points on this Curve, at the given number of equally-spaced divisions.
     *
     * @param {Number} divisions The number of divisions.
     * @returns {{Array of Array}} Array of sampled 3D points.
     */
    getPoints(divisions: number): number[][];

    /**
     * 
     * @param {Number} u
     * @param {Number} distance 
     * @returns {Number}
     */
    getUToTMapping(u: number, distance: number): number;
}