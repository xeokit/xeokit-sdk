import { Component } from '../Component';
import { CubeTexture } from './CubeTexture';

export declare type CubeTextureConfiguraton = {
    /**Optional ID for this ReflectionMap, unique among all components in the parent scene, generated automatically when omitted. */
    id?: string;
    /** Paths to six image files to load into this ReflectionMap. */
    src: string[];
    /** Flips this ReflectionMap's source data along its vertical axis when true. */
    flipY: boolean;
    /** Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}. */
    encoding?: number;
}

export declare class ReflectionMap extends CubeTexture {
    /**
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {CubeTextureConfiguraton} [cfg] Configs
     */
    constructor(owner: Component, cfg?: CubeTextureConfiguraton);

    /**
     * Destroys this ReflectionMap.
     */
    destroy(): void;
}