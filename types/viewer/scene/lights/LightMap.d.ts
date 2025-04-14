import { Component } from '../Component';
import { CubeTexture } from './CubeTexture';

export declare type LightMapConfiguration = {
    /**Optional ID for this LightMap, unique among all components in the parent scene, generated automatically when omitted. */
    id?: string;
    /**Optional map of user-defined metadata to attach to this LightMap. */
    /**Don't know where this property is being used */
    meta?: any;
    /**Paths to six image files to load into this LightMap. */
    src: string[];
    /**Flips this LightMap's source data along its vertical axis when true. */
    flipY?: boolean;
    /**Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}. */
    encoding?: number;
}

export declare class LightMap extends CubeTexture {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {LightMapConfiguration} [cfg] Configs
     */
    constructor(owner: Component, cfg?: LightMapConfiguration);

    destroy(): void;
}