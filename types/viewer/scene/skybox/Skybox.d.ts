import { Component } from '../Component';

export declare type SkyboxConfiguration = {
    /** Optional ID, unique among all components in the parent {Scene}, generated automatically when omitted. */
    id?: string;
    /** Path to skybox texture */
    src: string | string[];
    /** Texture encoding format.  See the {@link Texture#encoding} property for more info. */
    encoding?: number;
    /** Size of this Skybox, given as the distance from the center at ````[0,0,0]```` to each face. */
    size?: number;
    /** True when this Skybox is visible. */
    active?: boolean;
}

export declare class Skybox extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this PointLight as well.
     * @param {SkyboxConfiguration} [cfg]  Skybox configuration
     */
    constructor(owner: Component, cfg?: SkyboxConfiguration);

    /**
     * Sets the size of this Skybox, given as the distance from the center at [0,0,0] to each face.
     *
     * Default value is ````1000````.
     *
     * @param {Number} value The size.
     */
    set size(value: number);

    /**
     * Gets the size of this Skybox, given as the distance from the center at [0,0,0] to each face.
     *
     * Default value is ````1000````.
     *
     * @returns {Number} The size.
     */
    get size(): number;

    /**
     * Sets whether this Skybox is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} active Whether to make active or not.
     */
    set active(active: boolean);

    /**
     * Gets if this Skybox is visible or not.
     *
     * Default active is ````true````.
     *
     * @returns {Boolean} ````true```` if the Skybox is active.
     */
    get active(): boolean;
}