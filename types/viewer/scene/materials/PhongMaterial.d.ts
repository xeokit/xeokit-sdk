import { Material } from "./Material";
import { Component } from "../Component";
import { Texture } from "./Texture";
import { Fresnel } from "./Fresnel";

export declare type PhongMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** PhongMaterial ambient color. */
  ambient?: number[];
  /** PhongMaterial diffuse color. */
  diffuse?: number[];
  /** PhongMaterial specular color. */
  specular?: number[];
  /** PhongMaterial emissive color. */
  emissive?: number[];
  /** Scalar in range 0-1 that controls alpha, where 0 is completely transparent and 1 is completely opaque. */
  alpha?: number;
  /** Scalar in range 0-128 that determines the size and sharpness of specular highlights. */
  shininess?: number;
  /** Scalar in range 0-1 that controls how much {@link ReflectionMap} is reflected. */
  reflectivity?: number;
  /** Scalar that controls the width of lines. */
  lineWidth?: number;
  /** Scalar that controls the size of points. */
  pointSize?: number;
  /** A ambient map {@link Texture}, which will multiply by the diffuse property. Must be within the same {@link Scene} as this PhongMaterial. */
  ambientMap?: Texture;
  /** A diffuse map {@link Texture}, which will override the effect of the diffuse property. Must be within the same {@link Scene} as this PhongMaterial. */
  diffuseMap?: Texture;
  /** A specular map {@link Texture}, which will override the effect of the specular property. Must be within the same {@link Scene} as this PhongMaterial. */
  specularMap?: Texture;
  /** An emissive map {@link Texture}, which will override the effect of the emissive property. Must be within the same {@link Scene} as this PhongMaterial. */
  emissiveMap?: Texture;
  /** A normal map {@link Texture}. Must be within the same {@link Scene} as this PhongMaterial. */
  normalMap?: Texture;
  /** An alpha map {@link Texture}, which will override the effect of the alpha property. Must be within the same {@link Scene} as this PhongMaterial. */
  alphaMap?: Texture;
  /** A reflectivity control map {@link Texture}, which will override the effect of the reflectivity property. Must be within the same {@link Scene} as this PhongMaterial. */
  reflectivityMap?: Texture;
  /** An occlusion map {@link Texture}. Must be within the same {@link Scene} as this PhongMaterial.*/
  occlusionMap?: Texture;
  /** A diffuse {@link Fresnel"}}Fresnel{{/crossLink}}. Must be within the same {@link Scene} as this PhongMaterial. */
  diffuseFresnel?: Fresnel;
  /** A specular {@link Fresnel"}}Fresnel{{/crossLink}}. Must be within the same {@link Scene} as this PhongMaterial. */
  specularFresnel?: Fresnel;
  /** An emissive {@link Fresnel"}}Fresnel{{/crossLink}}. Must be within the same {@link Scene} as this PhongMaterial. */
  emissiveFresnel?: Fresnel;
  /** An alpha {@link Fresnel"}}Fresnel{{/crossLink}}. Must be within the same {@link Scene} as this PhongMaterial. */
  alphaFresnel?: Fresnel;
  /** A reflectivity {@link Fresnel"}}Fresnel{{/crossLink}}. Must be within the same {@link Scene} as this PhongMaterial. */
  reflectivityFresnel?: Fresnel;
  /** The alpha blend mode - accepted values are "opaque", "blend" and "mask". See the {@link PhongMaterial.alphaMode} property for more info. */
  alphaMode?: "opaque"| "blend" | "mask";
  /** The alpha cutoff value. See the {@link PhongMaterial.alphaCutoff} property for more info. */
  alphaCutoff?: number;
  /** Whether to render geometry backfaces. */
  backfaces?: boolean;
  /** The winding order for geometry front faces - "cw" for clockwise, or "ccw" for counter-clockwise. */
  frontface?: "cw" | "ccw";
};

/**
 * Configures the normal rendered appearance of {@link Mesh}es using the non-physically-correct Blinn-Phong shading model.
 */
export declare class PhongMaterial extends Material {
  /**
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {PhongMaterialConfiguration} cfg The PhongMaterial configuration
   */
  constructor(owner: Component, cfg?: any);

  /**
   * Sets the PhongMaterial's ambient color.
   *
   * Default value is ````[0.3, 0.3, 0.3]````.
   *
   * @type {Number[]}
   */
  set ambient(arg: number[]);

  /**
   * Gets the PhongMaterial's ambient color.
   *
   * Default value is ````[0.3, 0.3, 0.3]````.
   *
   * @type {Number[]}
   */
  get ambient(): number[];

  /**
   * Sets the PhongMaterial's diffuse color.
   *
   * Multiplies by {@link PhongMaterial.diffuseMap}.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @type {Number[]}
   */
  set diffuse(arg: number[]);

  /**
   * Sets the PhongMaterial's diffuse color.
   *
   * Multiplies by {@link PhongMaterial.diffuseMap}.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @type {Number[]}
   */
  get diffuse(): number[];

  /**
   * Sets the PhongMaterial's specular color.
   *
   * Multiplies by {@link PhongMaterial.specularMap}.
   * Default value is ````[1.0, 1.0, 1.0]````.
   * @type {Number[]}
   */
  set specular(arg: number[]);

  /**
   * Gets the PhongMaterial's specular color.
   *
   * Multiplies by {@link PhongMaterial.specularMap}.
   * Default value is ````[1.0, 1.0, 1.0]````.
   * @type {Number[]}
   */
  get specular(): number[];

  /**
   * Sets the PhongMaterial's emissive color.
   *
   * Multiplies by {@link PhongMaterial.emissiveMap}.
   *
   * Default value is ````[0.0, 0.0, 0.0]````.
   * @type {Number[]}
   */
  set emissive(arg: number[]);

  /**
   * Gets the PhongMaterial's emissive color.
   *
   * Multiplies by {@link PhongMaterial.emissiveMap}.
   *
   * Default value is ````[0.0, 0.0, 0.0]````.
   * @type {Number[]}
   */
  get emissive(): number[];

  /**
   * Sets the PhongMaterial alpha.
   *
   * This is a factor in the range [0..1] indicating how transparent the PhongMaterial is.
   *
   * A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
   *
   * Multiplies by {@link PhongMaterial.alphaMap}.
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  set alpha(arg: number);

  /**
   * Gets the PhongMaterial alpha.
   *
   * This is a factor in the range [0..1] indicating how transparent the PhongMaterial is.
   *
   * A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
   *
   * Multiplies by {@link PhongMaterial.alphaMap}.
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  get alpha(): number;

  /**
   * Sets the PhongMaterial shininess.
   *
   * This is a factor in range [0..128] that determines the size and sharpness of the specular highlights create by this PhongMaterial.
   *
   * Larger values produce smaller, sharper highlights. A value of 0.0 gives very large highlights that are almost never
   * desirable. Try values close to 10 for a larger, fuzzier highlight and values of 100 or more for a small, sharp
   * highlight.
   *
   * Default value is ```` 80.0````.
   *
   * @type {Number}
   */
  set shininess(arg: number);

  /**
   * Gets the PhongMaterial shininess.
   *
   * This is a factor in range [0..128] that determines the size and sharpness of the specular highlights create by this PhongMaterial.
   *
   * Larger values produce smaller, sharper highlights. A value of 0.0 gives very large highlights that are almost never
   * desirable. Try values close to 10 for a larger, fuzzier highlight and values of 100 or more for a small, sharp
   * highlight.
   *
   * Default value is ```` 80.0````.
   *
   * @type {Number}
   */
  get shininess(): number;

  /**
   * Sets how much {@link ReflectionMap} is reflected by this PhongMaterial.
   *
   * This is a scalar in range ````[0-1]````. Default value is ````1.0````.
   *
   * The surface will be non-reflective when this is ````0````, and completely mirror-like when it is ````1.0````.
   *
   * Multiplies by {@link PhongMaterial.reflectivityMap}.
   *
   * @type {Number}
   */
  set reflectivity(arg: number);

  /**
   * Gets how much {@link ReflectionMap} is reflected by this PhongMaterial.
   *
   * This is a scalar in range ````[0-1]````. Default value is ````1.0````.
   *
   * The surface will be non-reflective when this is ````0````, and completely mirror-like when it is ````1.0````.
   *
   * Multiplies by {@link PhongMaterial.reflectivityMap}.
   *
   * @type {Number}
   */
  get reflectivity(): number;

  /**
   * Sets the PhongMaterial's line width.
   *
   * This is not supported by WebGL implementations based on DirectX [2019].
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  set lineWidth(arg: number);

  /**
   * Gets the PhongMaterial's line width.
   *
   * This is not supported by WebGL implementations based on DirectX [2019].
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  get lineWidth(): number;

  /**
   * Sets the PhongMaterial's point size.
   *
   * Default value is 1.0.
   *
   * @type {Number}
   */
  set pointSize(arg: number);

  /**
   * Gets the PhongMaterial's point size.
   *
   * Default value is 1.0.
   *
   * @type {Number}
   */
  get pointSize(): number;

  /**
   * Sets the PhongMaterial's alpha rendering mode.
   *
   * This governs how alpha is treated. Alpha is the combined result of {@link PhongMaterial.alpha} and {@link PhongMaterial.alphaMap}.
   *
   * Supported values are:
   *
   * * "opaque" - The alpha value is ignored and the rendered output is fully opaque (default).
   * * "mask" - The rendered output is either fully opaque or fully transparent depending on the alpha value and the specified alpha cutoff value.
   * * "blend" - The alpha value is used to composite the source and destination areas. The rendered output is combined with the background using the normal painting operation (i.e. the Porter and Duff over operator).
   *
   *@type {String}
    */
  set alphaMode(arg: "opaque"| "blend" | "mask");

  /**
   * Gets the PhongMaterial's alpha rendering mode.
   *
   *@type {String}
    */
  get alphaMode(): "opaque"| "blend" | "mask";

  /**
   * Sets the PhongMaterial's alpha cutoff value.
   *
   * This specifies the cutoff threshold when {@link PhongMaterial.alphaMode} equals "mask". If the alpha is greater than or equal to this value then it is rendered as fully
   * opaque, otherwise, it is rendered as fully transparent. A value greater than 1.0 will render the entire material as fully transparent. This value is ignored for other modes.
   *
   * Alpha is the combined result of {@link PhongMaterial.alpha} and {@link PhongMaterial.alphaMap}.
   *
   * Default value is ````0.5````.
   *
   * @type {Number}
   */
  set alphaCutoff(arg: number);

  /**
   * Gets the PhongMaterial's alpha cutoff value.
   *
   * @type {Number}
   */
  get alphaCutoff(): number;

  /**
   * Sets whether backfaces are visible on attached {@link Mesh}es.
   *
   * The backfaces will belong to {@link Geometry} compoents that are also attached to the {@link Mesh}es.
   *
   * Default is ````false````.
   *
   * @type {Boolean}
   */
  set backfaces(arg: boolean);

  /**
   * Gets whether backfaces are visible on attached {@link Mesh}es.
   *
   * Default is ````false````.
   *
   * @type {Boolean}
   */
  get backfaces(): boolean;

  /**
   * Sets the winding direction of geometry front faces.
   *
   * Default is ````"ccw"````.
   * @type {String}
   */
  set frontface(arg: "cw" | "ccw");

  /**
   * Gets the winding direction of front faces on attached {@link Mesh}es.
   *
   * Default is ````"ccw"````.
   * @type {String}
   */
  get frontface(): "cw" | "ccw";

  /**
   * Gets the PhongMaterials's normal map {@link Texture}.
   *
   * @type {Texture}
   */
  get normalMap(): Texture;

  /**
   * Gets the PhongMaterials's ambient {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.ambient}.
   *
   * @type {Texture}
   */
  get ambientMap(): Texture;

  /**
   * Gets the PhongMaterials's diffuse {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.diffuse}.
   *
   * @type {Texture}
   */
  get diffuseMap(): Texture;

  /**
   * Gets the PhongMaterials's specular {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.specular}.
   *
   * @type {Texture}
   */
  get specularMap(): Texture;

  /**
   * Gets the PhongMaterials's emissive {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.emissive}.
   *
   * @type {Texture}
   */
  get emissiveMap(): Texture;

  /**
   * Gets the PhongMaterials's alpha {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.alpha}.
   *
   * @type {Texture}
   */
  get alphaMap(): Texture;

  /**
   * Gets the PhongMaterials's reflectivity {@link Texture}.
   *
   * Multiplies by {@link PhongMaterial.reflectivity}.
   *
   * @type {Texture}
   */
  get reflectivityMap(): Texture;

  /**
   * Gets the PhongMaterials's ambient occlusion {@link Texture}.
   *
   * @type {Texture}
   */
  get occlusionMap(): Texture;

  /**
   * Gets the PhongMaterials's diffuse {@link Fresnel}.
   *
   * Applies to {@link PhongMaterial.diffuse}.
   *
   * @type {Fresnel}
   */
  get diffuseFresnel(): Fresnel;

  /**
   * Gets the PhongMaterials's specular {@link Fresnel}.
   *
   * Applies to {@link PhongMaterial.specular}.
   *
   * @type {Fresnel}
   */
  get specularFresnel(): Fresnel;

  /**
   * Gets the PhongMaterials's emissive {@link Fresnel}.
   *
   * Applies to {@link PhongMaterial.emissive}.
   *
   * @type {Fresnel}
   */
  get emissiveFresnel(): Fresnel;

  /**
   * Gets the PhongMaterials's alpha {@link Fresnel}.
   *
   * Applies to {@link PhongMaterial.alpha}.
   *
   * @type {Fresnel}
   */
  get alphaFresnel(): Fresnel;

  /**
   * Gets the PhongMaterials's reflectivity {@link Fresnel}.
   *
   * Applies to {@link PhongMaterial.reflectivity}.
   *
   * @type {Fresnel}
   */
  get reflectivityFresnel(): Fresnel;

  /**
   * Destroys this PhongMaterial.
   */
  destroy(): void;
}
