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
     * The starting point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     */
    v0: number[];

    /**
     * The first control point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     */
    v1: number[];

    /**
     * The second control point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     */
    v2: number[];

    /**
     * The end point on this CubicBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````
     */
    v3: number[];

    /**
     * The current position of progress along this CubicBezierCurve.
     *
     * Automatically clamps to range ````[0..1]````.
     */
    t: number;

    /**
     * Point on this CubicBezierCurve at the given position.
     */
    readonly point: number[];

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