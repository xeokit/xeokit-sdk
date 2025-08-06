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
     * The control points on this SplineCurve.
     *
     * Default value is ````[]````.
     */
    points: number[];

    /**
     * The progress along this SplineCurve.
     *
     * Automatically clamps to range ````[0..1]````.
     *
     * Default value is ````0````.
     */
    t: number;

    /**
     * The point on this SplineCurve at position {@link SplineCurve#t}.
     */
    readonly point: number[];

    /**
     * Returns point on this SplineCurve at the given position.
     *
     * @param {Number} t Position to get point at.
     * @returns {Number[]} Point at the given position.
     */
    getPoint(t: number): number[];

    getJSON(): SpliceCurveJSON;

}