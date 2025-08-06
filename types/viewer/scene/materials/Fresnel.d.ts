import { Component } from "../Component";

export declare type FresnelMaterialConfiguration = {
    /** Optional ID, unique among all components in the parent scene, generated automatically when omitted. */
    id?: string;
    /** Color used on edges. */
    edgeColor?: number[];
    /** Color used on center. */
    centerColor?: number[];
    /** Bias at the edge. */
    edgeBias?: number;
    /** Bias at the center. */
    centerBias?: number;
    /** The power. */
    power?: number;
}

export declare class Fresnel extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this Fresnel as well.
     * @param {FresnelMaterialConfiguration} [cfg] Configs
     */
    constructor(owner: Component, cfg?: FresnelMaterialConfiguration);

    /**
     * Fresnel's edge color.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    edgeColor: number[];
    /**
     * Fresnel's center color.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    centerColor: number[];
    /**
     * Fresnel's edge bias.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    edgeBias: number;
    /**
     * Fresnel's center bias.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    centerBias: number;
    /**
     * Fresnel's power.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    power: number;

    /**
     * Destroys this Fresnel.
     */
    destroy(): void;
}
