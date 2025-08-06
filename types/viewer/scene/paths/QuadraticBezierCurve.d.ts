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
     * The starting point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     */
    v0: number[];

    /**
     * The middle control point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     */
    v1: number[];

    /**
     * The end point on this QuadraticBezierCurve.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     */
    v2: number[];

    /**
     * The progress along this QuadraticBezierCurve.
     *
     * Automatically clamps to range [0..1].
     *
     * Default value is ````0````.
     */
    t: number;

    /**
     * Point on this QuadraticBezierCurve at position {@link QuadraticBezierCurve/t}.
     */
    readonly point: number[];

    /**
     * Returns the point on this QuadraticBezierCurve at the given position.
     *
     * @param {Number} t Position to get point at.
     * @returns {Number[]} The point.
     */
    getPoint(t: number): number[];

    getJSON(): QuadraticBezierCurveJson;
}