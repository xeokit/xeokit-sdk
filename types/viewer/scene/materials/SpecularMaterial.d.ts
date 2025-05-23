import { Component } from '../Component';
import { Material } from './Material';
import { Texture } from './Texture';

export declare type SpecularMaterialConfiguration = {
    /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /** RGB diffuse color of this SpecularMaterial. Multiplies by the RGB components of {@link SpecularMaterial#diffuseMap}. */
    diffuse?: number[];
    /** RGBA {@link Texture} containing the diffuse color of this SpecularMaterial, with optional *A* component for alpha. The RGB components multiply by {@link SpecularMaterial#diffuse}, while the *A* component, if present, multiplies by {@link SpecularMaterial#alpha}. */
    diffuseMap?: Texture;
    /** RGB specular color of this SpecularMaterial. Multiplies by the {@link SpecularMaterial#specularMap} and the *RGB* components of {@link SpecularMaterial#specularGlossinessMap}. */
    specular?: number[];
    /** RGB texture containing the specular color of this SpecularMaterial. Multiplies by the {@link SpecularMaterial#specular} property. Must be within the same {@link Scene} as this SpecularMaterial. */
    specularMap?: Texture;
    /** Factor in the range [0..1] indicating how glossy this SpecularMaterial is. 0 is no glossiness, 1 is full glossiness. Multiplies by the *R* component of {@link SpecularMaterial#glossinessMap} and the *A* component of {@link SpecularMaterial#specularGlossinessMap}. */
    glossines?: number;
    /** RGBA {@link Texture} containing this SpecularMaterial's specular color in its *RGB* component and glossiness in its *A* component. Its *RGB* components multiply by {@link SpecularMaterial#specular}, while its *A* component multiplies by {@link SpecularMaterial#glossiness}. Must be within the same {@link Scene} as this SpecularMaterial. */
    specularGlossinessMap?: Texture;
    /** Factor in the range 0..1 indicating how reflective this SpecularMaterial is. */
    specularF0?: number;
    /** RGB emissive color of this SpecularMaterial. Multiplies by the RGB components of {@link SpecularMaterial#emissiveMap}. */
    emissive?: number[];
    /** RGB {@link Texture} containing the emissive color of this SpecularMaterial. Multiplies by the {@link SpecularMaterial#emissive} property. Must be within the same {@link Scene} as this SpecularMaterial. */
    emissiveMap?: Texture;
    /** RGB ambient occlusion {@link Texture}. Within shaders, multiplies by the specular and diffuse light reflected by surfaces. Must be within the same {@link Scene} as this SpecularMaterial. */
    occlusionMap?: Texture;
    /** {Texture} RGB tangent-space normal {@link Texture}. Must be within the same {@link Scene} as this SpecularMaterial. */
    normalMap?: Texture;
    /** Factor in the range 0..1 indicating how transparent this SpecularMaterial is. A value of 0.0 indicates fully transparent, 1.0 is fully opaque. Multiplies by the *R* component of {@link SpecularMaterial#alphaMap} and the *A* component, if present, of {@link SpecularMaterial#diffuseMap}. */
    alpha?: number;
    /** RGB {@link Texture} containing this SpecularMaterial's alpha in its *R* component. The *R* component multiplies by the {@link SpecularMaterial#alpha} property. Must be within the same {@link Scene} as this SpecularMaterial. */
    alphaMap?: Texture;
    /** The alpha blend mode - accepted values are "opaque", "blend" and "mask". See the {@link SpecularMaterial#alphaMode} property for more info. */
    alphaMode?: "opaque" | "blend" | "mask";
    /** The alpha cutoff value. See the {@link SpecularMaterial#alphaCutoff} property for more info. */
    alphaCutoff?: number;
    /** Whether to render {@link Geometry} backfaces. */
    backfaces?: boolean;
    /** The winding order for {@link Geometry} front faces - "cw" for clockwise, or "ccw" for counter-clockwise. */
    frontface?: "cw" | "ccw";
    /** Scalar that controls the width of {@link Geometry} lines. */
    lineWidth?: number;
    /** Scalar that controls the size of {@link Geometry} points. */
    pointSize?: number;
}

export declare class SpecularMaterial extends Material {
    /**
     *
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {SpecularMaterialConfiguration} [cfg] The SpecularMaterial configuration
     */
    constructor(owner: Component, cfg?: SpecularMaterialConfiguration)

    /**
     * Sets the RGB diffuse color of this SpecularMaterial.
     *
     * Multiplies by the *RGB* components of {@link SpecularMaterial#diffuseMap}.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     * @type {Number[]}
     */
    set diffuse(value: number[]);

    /**
     * Gets the RGB diffuse color of this SpecularMaterial.
     *
     * @type {Number[]}
     */
    get diffuse(): number[];

    /**
     * Gets the RGB {@link Texture} containing the diffuse color of this SpecularMaterial, with optional *A* component for alpha.
     *
     * The *RGB* components multipliues by the {@link SpecularMaterial#diffuse} property, while the *A* component, if present, multiplies by the {@link SpecularMaterial#alpha} property.
     *
     * @type {Texture}
     */
    get diffuseMap(): Texture;

    /**
     * Sets the RGB specular color of this SpecularMaterial.
     *
     * Multiplies by {@link SpecularMaterial#specularMap} and the *A* component of {@link SpecularMaterial#specularGlossinessMap}.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    set specular(value: number[]);

    /**
     * Gets the RGB specular color of this SpecularMaterial.
     *
     * @type {Number[]}
     */
    get specular(): number[];

    /**
     * Gets the RGB texture containing the specular color of this SpecularMaterial.
     *
     * Multiplies by {@link SpecularMaterial#specular}.
     *
     * @type {Texture}
     */
    get specularMap(): Texture;

    /**
     * Gets the RGBA texture containing this SpecularMaterial's specular color in its *RGB* components and glossiness in its *A* component.
     *
     * The *RGB* components multiplies {@link SpecularMaterial#specular}, while the *A* component multiplies by {@link SpecularMaterial#glossiness}.
     *
     * @type {Texture}
     */
    get specularGlossinessMap(): Texture;

    /**
     * Sets the Factor in the range [0..1] indicating how glossy this SpecularMaterial is.
     *
     * ````0```` is no glossiness, ````1```` is full glossiness.
     *
     * Multiplies by the *R* component of {@link SpecularMaterial#glossinessMap} and the *A* component of {@link SpecularMaterial#specularGlossinessMap}.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set glossiness(value: number);

    /**
     * Gets the Factor in the range ````[0..1]```` indicating how glossy this SpecularMaterial is.
     * @type {Number}
     */
    get glossiness(): number;

    /**
     * Gets the RGB texture containing this SpecularMaterial's glossiness in its *R* component.
     *
     * The *R* component multiplies by {@link SpecularMaterial#glossiness}.
     ** @type {Texture}
     */
    get glossinessMap(): Texture;

    /**
     * Sets the factor in the range ````[0..1]```` indicating amount of specular Fresnel.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set specularF0(value: number);

    /**
     * Gets the factor in the range ````[0..1]```` indicating amount of specular Fresnel.
     *
     * @type {Number}
     */
    get specularF0(): number;

    /**
     * Sets the RGB emissive color of this SpecularMaterial.
     *
     * Multiplies by {@link SpecularMaterial#emissiveMap}.

     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    set emissive(value: number[]);

    /**
     * Gets the RGB emissive color of this SpecularMaterial.
     *
     * @type {Number[]}
     */
    get emissive(): number[];

    /**
     * Gets the RGB texture containing the emissive color of this SpecularMaterial.
     *
     * Multiplies by {@link SpecularMaterial#emissive}.
     *
     * @type {Texture}
     */
    get emissiveMap(): Texture;

    /**
     * Sets the factor in the range [0..1] indicating how transparent this SpecularMaterial is.
     *
     * A value of ````0.0```` is fully transparent, while ````1.0```` is fully opaque.
     *
     * Multiplies by the *R* component of {@link SpecularMaterial#alphaMap} and the *A* component, if present, of {@link SpecularMaterial#diffuseMap}.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set alpha(value: number);

    /**
     * Gets the factor in the range [0..1] indicating how transparent this SpecularMaterial is.
     *
     * @type {Number}
     */
    get alpha(): number;

    /**
     * Gets the RGB {@link Texture} with alpha in its *R* component.
     *
     * The *R* component multiplies by the {@link SpecularMaterial#alpha} property.
     *
     * @type {Texture}
     */
    get alphaMap(): Texture;

    /**
     * Gets the RGB tangent-space normal {@link Texture} attached to this SpecularMaterial.
     *
     * @type {Texture}
     */
    get normalMap(): Texture;

    /**
     * Gets the RGB ambient occlusion {@link Texture} attached to this SpecularMaterial.
     *
     * Multiplies by the specular and diffuse light reflected by surfaces.
     *
     * @type {Texture}
     */
    get occlusionMap(): Texture;

    /**
     * Sets the alpha rendering mode.
     *
     * This governs how alpha is treated. Alpha is the combined result of the {@link SpecularMaterial#alpha} and {@link SpecularMaterial#alphaMap} properties.
     *
     * Accepted values are:
     *
     * * "opaque" - The alpha value is ignored and the rendered output is fully opaque (default).
     * * "mask" - The rendered output is either fully opaque or fully transparent depending on the alpha value and the specified alpha cutoff value.
     * * "blend" - The alpha value is used to composite the source and destination areas. The rendered output is combined with the background using the normal painting operation (i.e. the Porter and Duff over operator)
     *
     * @type {String}
     */
    set alphaMode(alphaMode: "opaque" | "blend" | "mask");

    /**
     * Sets the alpha cutoff value.
     *
     * Specifies the cutoff threshold when {@link SpecularMaterial#alphaMode} equals "mask". If the alpha is greater than or equal to this value then it is rendered as fully opaque, otherwise, it is rendered as fully transparent. A value greater than 1.0 will render the entire material as fully transparent. This value is ignored for other modes.
     *
     * Alpha is the combined result of the {@link SpecularMaterial#alpha} and {@link SpecularMaterial#alphaMap} properties.
     *
     * Default value is ````0.5````.
     *
     * @type {Number}
     */
    set alphaCutoff(alphaCutoff: number);

    /**
     * Gets the alpha cutoff value.

     * @type {Number}
     */
    get alphaCutoff(): number;

    /**
     * Sets whether backfaces are visible on attached {@link Mesh}es.
     *
     * The backfaces will belong to {@link ReadableGeometry} compoents that are also attached to the {@link Mesh}es.
     *
     * Default is ````false````.
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
     * @type {String}
     */
    get frontface(): "cw" | "ccw";

    /**
     * Sets the SpecularMaterial's line width.
     *
     * This is not supported by WebGL implementations based on DirectX [2019].
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set lineWidth(value: number);

    /**
     * Gets the SpecularMaterial's line width.
     *
     * @type {Number}
     */
    get lineWidth(): number;

    /**
     * Sets the SpecularMaterial's point size.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set pointSize(value: number);

    /**
     * Sets the SpecularMaterial's point size.
     *
     * @type {Number}
     */
    get pointSize(): number;

    /**
     * Destroys this SpecularMaterial.
     */
    destroy(): void;
    
}