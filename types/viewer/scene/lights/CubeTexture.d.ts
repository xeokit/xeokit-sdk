import { Component } from '../Component';

export declare type CubeTextureConfiguration = {
    /**Optional ID for this CubeTexture, unique among all components in the parent scene, generated automatically when omitted. */
    id?: string;
    /**Paths to six image files to load into this CubeTexture. */
    src: string[];
    /**Flips this CubeTexture's source data along its vertical axis when true. */
    flipY?: boolean;
    /**Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}. */
    encoding?: number;
}

export declare class CubeTexture extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {CubeTextureConfiguration} [cfg] Configs
     */
    constructor(owner: Component, cfg?: CubeTextureConfiguration);

    /**
     * Destroys this CubeTexture
     *
     */
    destroy(): void;
}