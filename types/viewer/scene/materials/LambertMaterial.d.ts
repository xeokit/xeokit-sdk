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
    * Sets the LambertMaterial's ambient color.
    *
    * Default value is ````[0.3, 0.3, 0.3]````.
    *
    * @type {Number[]}
    */
    set ambient(value: number[]);

    /**
    * Gets the LambertMaterial's ambient color.
    *
    * Default value is ````[0.3, 0.3, 0.3]````.
    *
    * @type {Number[]}
    */
    get ambient(): number[];

    /**
    * Sets the LambertMaterial's diffuse color.
    *
    * Default value is ````[1.0, 1.0, 1.0]````.
    *
    * @type {Number[]}
    */
    set color(value: number[]);

    /**
    * Gets the LambertMaterial's diffuse color.
    *
    * Default value is ````[1.0, 1.0, 1.0]````.
    *
    * @type {Number[]}
    */
    get color(): number[];
   
    /**
    * Sets the LambertMaterial's emissive color.
    *
    * Default value is ````[0.0, 0.0, 0.0]````.
    *
    * @type {Number[]}
    */
    set emissive(value: number[]);

    /**
    * Gets the LambertMaterial's emissive color.
    *
    * Default value is ````[0.0, 0.0, 0.0]````.
    *
    * @type {Number[]}
    */
    get emissive(): number[];

    /**
    * Sets factor in the range ````[0..1]```` indicating how transparent the LambertMaterial is.
    *
    * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
    *
    * Default value is ````1.0````
    *
    * @type {Number}
    */
    set alpha(value: number);

    /**
    * Gets factor in the range ````[0..1]```` indicating how transparent the LambertMaterial is.
    *
    * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
    *
    * Default value is ````1.0````
    *
    * @type {Number}
    */
    get alpha(): number;

    /**
    * Sets the LambertMaterial's line width.
    *
    * This is not supported by WebGL implementations based on DirectX [2019].
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    set lineWidth(value: number);

    /**
    * Gets the LambertMaterial's line width.
    *
    * This is not supported by WebGL implementations based on DirectX [2019].
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    get lineWidth(): number;

    /**
    * Sets the LambertMaterial's point size.
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    set pointSize(value: number);

    /**
    * Gets the LambertMaterial's point size.
    *
    * Default value is ````1.0````.
    *
    * @type {Number}
    */
    get pointSize(): number;

    /**
    * Sets whether backfaces are visible on attached {@link Mesh}es.
    *
    * @type {Boolean}
    */
    set backfaces(value: boolean);

    /**
    * Gets whether backfaces are visible on attached {@link Mesh}es.
    *
    * @type {Boolean}
    */
    get backfaces(): boolean;

    /**
    * Sets the winding direction of front faces of {@link Geometry} of attached {@link Mesh}es.
    *
    * Default value is ````"ccw"````.
    *
    * @type {String}
    */
    set frontface(value: "cw" | "ccw");

    /**
    * Gets the winding direction of front faces of {@link Geometry} of attached {@link Mesh}es.
    *
    * Default value is ````"ccw"````.
    *
    * @type {String}
    */
    get frontface(): "cw" | "ccw";

    /**
    * Destroys this LambertMaterial.
    */
    destroy(): void;
}
