import { Component } from '../Component';
import { Material } from './Material';
import { Texture } from './Texture';

export declare type MetallicMaterialConfiguration = {
    /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /** RGB diffuse color of this MetallicMaterial. Multiplies by the RGB components of {@link MetallicMaterial#baseColorMap}. */
    baseColor?: number[];
    /** Factor in the range ````[0..1]```` indicating how metallic this MetallicMaterial is.  ````1```` is metal, ````0```` is non-metal. Multiplies by the *R* component of {@link MetallicMaterial#metallicMap} and the *A* component of {@link MetallicMaterial#metallicRoughnessMap}. */
    metallic?: number;
    /** Factor in the range ````[0..1]```` indicating the roughness of this MetallicMaterial.  ````0```` is fully smooth, ````1```` is fully rough. Multiplies by the *R* component of {@link MetallicMaterial#roughnessMap}. */
    roughness?: number;
    /** Factor in the range ````[0..1]```` indicating specular Fresnel. */
    specularF0?: number;
    /** RGB emissive color of this MetallicMaterial. Multiplies by the RGB components of {@link MetallicMaterial#emissiveMap}. */
    emissive?: number;
    /** Factor in the range ````[0..1]```` indicating the alpha of this MetallicMaterial.  Multiplies by the *R* component of {@link MetallicMaterial#alphaMap} and the *A* component,  if present, of {@link MetallicMaterial#baseColorMap}. The value of  {@link MetallicMaterial#alphaMode} indicates how alpha is interpreted when rendering. */
    alpha?: number;
    /** RGBA {@link Texture} containing the diffuse color of this MetallicMaterial, with optional *A* component for alpha. The RGB components multiply by the {@link MetallicMaterial#baseColor} property, while the *A* component, if present, multiplies by the {@link MetallicMaterial#alpha} property. */
    baseColorMap?: Texture;
    /** RGB {@link Texture} containing this MetallicMaterial's alpha in its *R* component. The *R* component multiplies by the {@link MetallicMaterial#alpha} property. Must be within the same {@link Scene} as this MetallicMaterial. */
    alphaMap?: Texture;
    /** RGB {@link Texture} containing this MetallicMaterial's metallic factor in its *R* component. The *R* component multiplies by the {@link MetallicMaterial#metallic} property. Must be within the same {@link Scene} as this MetallicMaterial. */
    metallicMap?: Texture;
    /** RGB {@link Texture} containing this MetallicMaterial's roughness factor in its *R* component. The *R* component multiplies by the  {@link MetallicMaterial#roughness} property. Must be within the same {@link Scene} as this MetallicMaterial. */
    roughnessMap?: Texture;
    /** RGB {@link Texture} containing this MetallicMaterial's metalness in its *R* component and roughness in its *G* component. Its *R* component multiplies by the {@link MetallicMaterial#metallic} property, while its *G* component multiplies by the {@link MetallicMaterial#roughness} property. Must be within the same {@link Scene} as this MetallicMaterial. */
    metallicRoughnessMap?: Texture;
    /** RGB {@link Texture} containing the emissive color of this MetallicMaterial. Multiplies by the {@link MetallicMaterial#emissive} property. Must be within the same {@link Scene} as this MetallicMaterial. */
    emissiveMap?: Texture;
    /** RGB ambient occlusion {@link Texture}. Within shaders, multiplies by the specular and diffuse light reflected by surfaces. Must be within the same {@link Scene} as this MetallicMaterial. */
    occlusionMap?: Texture;
    /** RGB tangent-space normal {@link Texture}. Must be within the same {@link Scene} as this MetallicMaterial. */
    normalMap?: Texture;
    /** The alpha blend mode, which specifies how alpha is to be interpreted. Accepted values are "opaque", "blend" and "mask". See the {@link MetallicMaterial#alphaMode} property for more info. */
    alphaMode?: string;
    /** The alpha cutoff value. See the {@link MetallicMaterial#alphaCutoff} property for more info. */
    alphaCutoff?: number;
    /** Whether to render {@link ReadableGeometry} backfaces. */
    backfaces?: boolean;
    /** The winding order for {@link ReadableGeometry} front faces - ````"cw"```` for clockwise, or ````"ccw"```` for counter-clockwise. */
    frontface?: "cw" | "ccw";
    /** Scalar that controls the width of lines for {@link ReadableGeometry} with {@link ReadableGeometry#primitive} set to "lines". */
    lineWidth?: number;
    /** Scalar that controls the size of points for {@link ReadableGeometry} with {@link ReadableGeometry#primitive} set to "points". */
    pointSize?: number; 
}

export declare class MetallicMaterial extends Material {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this MetallicMaterial as well.
     * @param {MetallicMaterialConfiguration} [cfg] The MetallicMaterial configuration.
     */
    constructor(owner: Component, cfg?: MetallicMaterialConfiguration);

    /**
     * Sets the RGB diffuse color.
     *
     * Multiplies by the RGB components of {@link MetallicMaterial#baseColorMap}.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     * @type {Number[]}
     */
    set baseColor(value: number[]);

    /**
     * Gets the RGB diffuse color.
     *
     * Multiplies by the RGB components of {@link MetallicMaterial#baseColorMap}.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     * @type {Number[]}
     */
    get baseColor(): number[];

    /**
     * Gets the RGB {@link Texture} containing the diffuse color of this MetallicMaterial, with optional *A* component for alpha.
     *
     * The RGB components multiply by {@link MetallicMaterial#baseColor}, while the *A* component, if present, multiplies by {@link MetallicMaterial#alpha}.
     *
     * @type {Texture}
     */
    get baseColorMap(): Texture;

    /**
     * Sets the metallic factor.
     *
     * This is in the range ````[0..1]```` and indicates how metallic this MetallicMaterial is.
     *
     * ````1```` is metal, ````0```` is non-metal.
     *
     * Multiplies by the *R* component of {@link MetallicMaterial#metallicMap} and the *A* component of {@link MetallicMaterial#metallicRoughnessMap}.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set metallic(value: number);

    /**
     * Gets the metallic factor.
     *
     * @type {Number}
     */
    get metallic(): number;

    /**
     * Gets the RGB {@link Texture} containing this MetallicMaterial's metallic factor in its *R* component.
     *
     * The *R* component multiplies by {@link MetallicMaterial#metallic}.
     *
     * @type {Texture}
     */
    get metallicMap(): Texture;

    /**
     *  Sets the roughness factor.
     *
     *  This factor is in the range ````[0..1]````, where ````0```` is fully smooth,````1```` is fully rough.
     *
     * Multiplies by the *R* component of {@link MetallicMaterial#roughnessMap}.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set roughness(value: number);

    /**
     * Gets the roughness factor.
     *
     * @type {Number}
     */
    get roughness(): number;

    /**
     * Gets the RGB {@link Texture} containing this MetallicMaterial's roughness factor in its *R* component.
     *
     * The *R* component multiplies by {@link MetallicMaterial#roughness}.
     *
     * @type {Texture}
     */
    get roughnessMap(): Texture;

    /**
     * Gets the RGB {@link Texture} containing this MetallicMaterial's metalness in its *R* component and roughness in its *G* component.
     *
     * Its *B* component multiplies by the {@link MetallicMaterial#metallic} property, while its *G* component multiplies by the {@link MetallicMaterial#roughness} property.
     *
     * @type {Texture}
     */
    get metallicRoughnessMap(): Texture;

    /**
     * Sets the factor in the range [0..1] indicating specular Fresnel value.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set specularF0(value: number);

    /**
     * Gets the factor in the range [0..1] indicating specular Fresnel value.
     *
     * @type {Number}
     */
    get specularF0(): number;

    /**
     * Sets the RGB emissive color.
     *
     * Multiplies by {@link MetallicMaterial#emissiveMap}.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    set emissive(value: number[]);

    /**
     * Gets the RGB emissive color.
     *
     * @type {Number[]}
     */
    get emissive(): number[];

    /**
     * Gets the RGB emissive map.
     *
     * Multiplies by {@link MetallicMaterial#emissive}.
     *
     * @type {Texture}
     */
    get emissiveMap(): Texture;

    /**
     * Gets the RGB ambient occlusion map.
     *
     * Multiplies by the specular and diffuse light reflected by surfaces.
     *
     * @type {Texture}
     */
    get occlusionMap(): Texture;

    /**
     * Sets factor in the range ````[0..1]```` that indicates the alpha value.
     *
     * Multiplies by the *R* component of {@link MetallicMaterial#alphaMap} and the *A* component, if present, of {@link MetallicMaterial#baseColorMap}.
     *
     * The value of {@link MetallicMaterial#alphaMode} indicates how alpha is interpreted when rendering.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set alpha(value: number);

    /**
     * Gets factor in the range ````[0..1]```` that indicates the alpha value.
     *
     * @type {Number}
     */
    get alpha(): number;

    /**
     * Gets the RGB {@link Texture} containing this MetallicMaterial's alpha in its *R* component.
     *
     * The *R* component multiplies by the {@link MetallicMaterial#alpha} property.
     *
     * @type {Texture}
     */
    get alphaMap(): Texture;

    /**
     * Gets the RGB tangent-space normal map {@link Texture}.
     *
     * @type {Texture}
     */
    get normalMap(): Texture;

    /**
     * Sets the alpha rendering mode.
     *
     * This specifies how alpha is interpreted. Alpha is the combined result of the {@link MetallicMaterial#alpha} and {@link MetallicMaterial#alphaMap} properties.
     *
     * Accepted values are:
     *
     * * "opaque" - The alpha value is ignored and the rendered output is fully opaque (default).
     * * "mask" - The rendered output is either fully opaque or fully transparent depending on the alpha and {@link MetallicMaterial#alphaCutoff}.
     * * "blend" - The alpha value is used to composite the source and destination areas. The rendered output is combined with the background using the normal painting operation (i.e. the Porter and Duff over operator).
     *
     * @type {String}
     */
    set alphaMode(alphaMode: string);

    /**
     * Gets the alpha rendering mode.
     *
     * @type {String}
     */
    get alphaMode(): string;

    /**
     * Sets the alpha cutoff value.
     *
     * Specifies the cutoff threshold when {@link MetallicMaterial#alphaMode} equals "mask". If the alpha is greater than or equal to this value then it is rendered as fully opaque, otherwise, it is rendered as fully transparent. A value greater than 1.0 will render the entire
     * material as fully transparent. This value is ignored for other modes.
     *
     * Alpha is the combined result of the {@link MetallicMaterial#alpha} and {@link MetallicMaterial#alphaMap} properties.
     *
     * Default value is ````0.5````.
     *
     * @type {Number}
     */
    set alphaCutoff(alphaCutoff: number);

    /**
     * Gets the alpha cutoff value.
     *
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
    get frontface(): string;

    /**
     * Sets the MetallicMaterial's line width.
     *
     * This is not supported by WebGL implementations based on DirectX [2019].
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set lineWidth(value: number);

    /**
     * Gets the MetallicMaterial's line width.
     *
     * @type {Number}
     */
    get lineWidth(): number;

    /**
     * Sets the MetallicMaterial's point size.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set pointSize(value: number);

    /**
     * Gets the MetallicMaterial's point size.
     *
     * @type {Number}
     */
    get pointSize(): number;

    /**
     * Destroys this MetallicMaterial.
     */
    destroy(): void;
}