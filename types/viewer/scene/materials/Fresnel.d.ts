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
     * Sets the Fresnel's edge color.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    set edgeColor(arg: number[]);
    /**
     * Gets the Fresnel's edge color.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    get edgeColor(): number[];
    /**
     * Sets the Fresnel's center color.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    set centerColor(arg: number[]);
    /**
     * Gets the Fresnel's center color.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    get centerColor(): number[];
    /**
     * Sets the Fresnel's edge bias.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    set edgeBias(arg: number);
    /**
     * Gets the Fresnel's edge bias.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    get edgeBias(): number;
    /**
     * Sets the Fresnel's center bias.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    set centerBias(arg: number);
    /**
     * Gets the Fresnel's center bias.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get centerBias(): number;
    /**
     * Sets the Fresnel's power.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    set power(arg: number);
    /**
     * Gets the Fresnel's power.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get power(): number;

    /**
     * Destroys this Fresnel.
     */
    destroy(): void;
}
