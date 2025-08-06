import { Material } from "./Material";
import { Component } from "../Component";

export declare type LambertMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Metadata to attach to this LambertMaterial. */
  meta?: any;
  /** LambertMaterial ambient color. */
  ambient?: number[];
  /** LambertMaterial diffuse color. */
  color?: number[];
  /** LambertMaterial emissive color. */
  emissive?: number[];
  /** Scalar in range 0-1 that controls alpha, where 0 is completely transparent and 1 is completely opaque. */
  alpha?: number;
  /** Scalar in range 0-1 that controls how much {@link ReflectionMap} is reflected. */
  reflectivity?: number;
  /** Scalar that controls the width of {@link Geometry} lines. */
  lineWidth: number;
  /** Scalar that controls the size of points for {@link Geometry} with {@link Geometry#primitive} set to "points". */
  pointSize: number;
  /** Whether to render {@link Geometry} backfaces. */
  backfaces: boolean;
  /** The winding order for {@link Geometry} front faces - "cw" for clockwise, or "ccw" for counter-clockwise. */
  frontface: "cw" | "ccw"; 
};

/**
 * Configures the shape of "lines" geometry primitives.
 */
export declare class LambertMaterial extends Material {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {LambertMaterialConfiguration} [cfg] The LambertMaterial configuration
     */
    constructor(owner: Component, cfg?: LambertMaterialConfiguration);
  
    /**
    * LambertMaterial's ambient color.
    *
    * Default value is ````[0.3, 0.3, 0.3]````.
    *
    * @type {Number[]}
    */
    ambient: number[];

    /**
    * LambertMaterial's diffuse color.
    *
    * Default value is ````[1.0, 1.0, 1.0]````.
    *
    * @type {Number[]}
    */
    color: number[];
   
    /**
    * LambertMaterial's emissive color.
    *
    * Default value is ````[0.0, 0.0, 0.0]````.
    *
    * @type {Number[]}
    */
    emissive: number[];

    /**
    * Factor in the range ````[0..1]```` indicating how transparent the LambertMaterial is.
    *
    * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
    *
    * Default value is ````1.0````
    *
    * @type {Number}
    */
    alpha: number;

    /**
    * LambertMaterial's line width.
    *
    * This is not supported by WebGL implementations based on DirectX [2019].
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    lineWidth: number;

    /**
    * LambertMaterial's point size.
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    pointSize: number;

    /**
    * Whether backfaces are visible on attached {@link Mesh}es.
    *
    * @type {Boolean}
    */
    backfaces: boolean;

    /**
    * Winding direction of front faces of {@link Geometry} of attached {@link Mesh}es.
    *
    * Default value is ````"ccw"````.
    *
    * @type {String}
    */
    frontface: "cw" | "ccw";

    /**
    * Destroys this LambertMaterial.
    */
    destroy(): void;
}
