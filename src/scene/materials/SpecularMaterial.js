/**
 A **SpecularMaterial** is a physically-based {@link Material} that defines the surface appearance of
 {@link Mesh"}}Meshes{{/crossLink}} using the *specular-glossiness* workflow.

 ## Examples

 | <a href="../../examples/#importing_gltf_pbr_specular_telephone"><img src="../../assets/images/screenshots/SpecularMaterial/telephone.png"></img></a> | <a href="../../examples/#materials_specular_samples"><img src="../../assets/images/screenshots/SpecularMaterial/materials.png"></img></a> | <a href="../../examples/#materials_specular_textures"><img src="../../assets/images/screenshots/SpecularMaterial/textures.png"></img></a> | <a href="../../examples/#materials_specular_specularVsGlossiness"><img src="../../assets/images/screenshots/SpecularMaterial/specVsGloss.png"></img></a> |
 |:------:|:----:|:-----:|:-----:|
 |[glTF models with PBR materials](../../examples/#importing_gltf_pbr_specular_telephone)|[Sample materials ](../../examples/#materials_specular_samples) | [Texturing spec/gloss channels](../../examples/#materials_specular_textures) | [Specular Vs. glossiness](../../examples/#materials_specular_specularVsGlossiness) |

 ## Overview

 * SpecularMaterial is usually used for insulators, such as ceramic, wood and plastic.
 * {@link MetallicMaterial} is usually used for conductive materials, such as metal.
 * {@link PhongMaterial} is usually used for non-realistic objects.

 For an introduction to PBR concepts, try these articles:

 * Joe Wilson's [Basic Theory of Physically-Based Rendering](https://www.marmoset.co/posts/basic-theory-of-physically-based-rendering/)
 * Jeff Russel's [Physically-based Rendering, and you can too!](https://www.marmoset.co/posts/physically-based-rendering-and-you-can-too/)
 * Sebastien Legarde's [Adapting a physically-based shading model](http://seblagarde.wordpress.com/tag/physically-based-rendering/)

 The following table summarizes SpecularMaterial properties:

 | Property | Type | Range | Default Value | Space | Description |
 |:--------:|:----:|:-----:|:-------------:|:-----:|:-----------:|
 | {@link SpecularMaterial/diffuse} | Array | [0, 1] for all components | [1,1,1,1] | linear | The RGB components of the diffuse color of the material. |
 | {@link SpecularMaterial/specular} | Array | [0, 1] for all components | [1,1,1,1] | linear | The RGB components of the specular color of the material. |
 | {@link SpecularMaterial/glossiness} | Number | [0, 1] | 1 | linear | The glossiness the material. |
 | {@link SpecularMaterial/specularF0} | Number | [0, 1] | 1 | linear | The specularF0 of the material surface. |
 | {@link SpecularMaterial/emissive} | Array | [0, 1] for all components | [0,0,0] | linear | The RGB components of the emissive color of the material. |
 | {@link SpecularMaterial/alpha} | Number | [0, 1] | 1 | linear | The transparency of the material surface (0 fully transparent, 1 fully opaque). |
 | {@link SpecularMaterial/diffuseMap} | {@link Texture} |  | null | sRGB | Texture RGB components multiplying by {@link SpecularMaterial/diffuse}. If the fourth component (A) is present, it multiplies by {@link SpecularMaterial/alpha}. |
 | {@link SpecularMaterial/specularMap} | {@link Texture} |  | null | sRGB | Texture RGB components multiplying by {@link SpecularMaterial/specular}. If the fourth component (A) is present, it multiplies by {@link SpecularMaterial/alpha}. |
 | {@link SpecularMaterial/glossinessMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link SpecularMaterial/glossiness}. |
 | {@link SpecularMaterial/specularGlossinessMap} | {@link Texture} |  | null | linear | Texture with first three components multiplying by {@link SpecularMaterial/specular} and fourth component multiplying by {@link SpecularMaterial/glossiness}. |
 | {@link SpecularMaterial/emissiveMap} | {@link Texture} |  | null | linear | Texture with RGB components multiplying by {@link SpecularMaterial/emissive}. |
 | {@link SpecularMaterial/alphaMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link SpecularMaterial/alpha}. |
 | {@link SpecularMaterial/occlusionMap} | {@link Texture} |  | null | linear | Ambient occlusion texture multiplying by surface's reflected diffuse and specular light. |
 | {@link SpecularMaterial/normalMap} | {@link Texture} |  | null | linear | Tangent-space normal map. |
 | {@link SpecularMaterial/alphaMode} | String | "opaque", "blend", "mask" | "blend" |  | Alpha blend mode. |
 | {@link SpecularMaterial/alphaCutoff} | Number | [0..1] | 0.5 |  | Alpha cutoff value. |
 | {@link SpecularMaterial/backfaces} | Boolean |  | false |  | Whether to render {@link Geometry"}}Geometry{{/crossLink}} backfaces. |
 | {@link SpecularMaterial/frontface} | String | "ccw", "cw" | "ccw" |  | The winding order for {@link Geometry"}}Geometry{{/crossLink}} frontfaces - "cw" for clockwise, or "ccw" for counter-clockwise. |

 ## Usage

 In the example below we'll create the plastered sphere shown in the [Sample Materials](../../examples/#materials_specular_textures) example (see screenshots above).

 Here's a closeup of the sphere we'll create:

 <a href="../../examples/#materials_specular_samples"><img src="../../assets/images/screenshots/SpecularMaterial/plaster.png"></img></a>

 Our plastered sphere {@link Mesh} has:

 * a {@link SphereGeometry},
 * a SpecularMaterial with {@link Texture"}}Textures{{/crossLink}} providing diffuse, glossiness, specular and normal maps.

 We'll also provide its {@link Scene}'s {@link Lights} with
 {@link DirLight"}}DirLights{{/crossLink}}, plus {@link CubeTexture"}}CubeTextures{{/crossLink}} for light
 and reflection maps.

 Note that in this example we're providing separate {@link Texture"}}Textures{{/crossLink}} for the {@link SpecularMaterial/specular} and {@link SpecularMaterial/glossiness}
 channels, which allows us a little creative flexibility. Then, in the next example further down, we'll combine those channels
 within the same {@link Texture} for efficiency.

 ````javascript
 var plasteredSphere = new xeokit.Mesh({

    geometry: new xeokit.SphereGeometry({
        center: [0,0,0],
        radius: 1.5,
        heightSegments: 60,
        widthSegments: 60
    }),

    material: new xeokit.SpecularMaterial({

        // Channels with default values, just to show them

        diffuse: [1.0, 1.0, 1.0],
        specular: [1.0, 1.0, 1.0],
        glossiness: 1.0,
        emissive: [0.0, 0.0, 0.0]
        alpha: 1.0,

        // Textures to multiply some of the channels

        diffuseMap: {       // RGB components multiply by diffuse
            src: "textures/materials/poligon/Plaster07_1k/Plaster07_COL_VAR1_1K.jpg"
        },
        specularMap: {      // RGB component multiplies by specular
            src: "textures/materials/poligon/Plaster07_1k/Plaster07_REFL_1K.jpg"
        },
        glossinessMap: {    // R component multiplies by glossiness
            src: "textures/materials/poligon/Plaster07_1k/Plaster07_GLOSS_1K.jpg"
        },
        normalMap: {
            src: "textures/materials/poligon/Plaster07_1k/Plaster07_NRM_1K.jpg"
        }
    })
 });

 var scene = plasteredSphere.scene;

 scene.lights.lights = [
 new xeokit.DirLight({
         dir: [0.8, -0.6, -0.8],
         color: [0.8, 0.8, 0.8],
         space: "view"
     }),
 new xeokit.DirLight({
         dir: [-0.8, -0.4, -0.4],
         color: [0.4, 0.4, 0.5],
         space: "view"
     }),
 new xeokit.DirLight({
         dir: [0.2, -0.8, 0.8],
         color: [0.8, 0.8, 0.8],
         space: "view"
     }
 ];

 scene.lights.lightMap = new xeokit.CubeTexture({
     src: [
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PX.png",
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NX.png",
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PY.png",
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NY.png",
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_PZ.png",
         "textures/light/Uffizi_Gallery/Uffizi_Gallery_Irradiance_NZ.png"
     ]
 });

 scene.lights.reflectionMap = new xeokit.CubeTexture({
     src: [
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PX.png",
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NX.png",
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PY.png",
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NY.png",
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PZ.png",
         "textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NZ.png"
     ]
 });
 ````

 ### Combining channels within the same textures

 In the previous example we provided separate {@link Texture"}}Textures{{/crossLink}} for the {@link SpecularMaterial/specular} and
 {@link SpecularMaterial/glossiness} channels, but we can combine those channels into the same {@link Texture} to reduce download time, memory footprint and rendering time (and also for glTF compatibility).

 Here's our SpecularMaterial again with those channels combined in the
 {@link SpecularMaterial/specularGlossinessMap} {@link Texture"}}Texture{{/crossLink}}, where the
 *RGB* component multiplies by {@link SpecularMaterial/specular} and *A* multiplies by {@link SpecularMaterial/glossiness}.

 ````javascript
 plasteredSphere.material = new xeokit.SpecularMaterial({

    // Default values
    diffuse: [1.0, 1.0, 1.0],
    specular: [1.0, 1.0, 1.0],
    glossiness: 1.0,
    emissive: [0.0, 0.0, 0.0]
    alpha: 1.0,

    diffuseMap: {
        src: "textures/materials/poligon/Plaster07_1k/Plaster07_COL_VAR1_1K.jpg"
    },
    specularGlossinessMap: { // RGB multiplies by specular, A by glossiness
        src: "textures/materials/poligon/Plaster07_1k/Plaster07_REFL_GLOSS_1K.jpg"
    },
    normalMap: {
        src: "textures/materials/poligon/Plaster07_1k/Plaster07_NRM_1K.jpg"
    }
 });
 ````

 Although not shown in this example, we can also texture {@link SpecularMaterial/alpha} with
 the *A* component of {@link SpecularMaterial/diffuseMap}'s {@link Texture},
 if required.

 ## Transparency

 ### Alpha Blending

 Let's make our plastered sphere transparent. We'll update its SpecularMaterial's {@link SpecularMaterial/alpha}
 and {@link SpecularMaterial/alphaMode}, causing it to blend 50% with the background:

 ````javascript
 plasteredSphere.material.alpha = 0.5;
 plasteredSphere.material.alphaMode = "blend";
 ````

 *TODO: Screenshot*

 ### Alpha Masking

 Now let's make holes in our plastered sphere. We'll give its SpecularMaterial an {@link SpecularMaterial/alphaMap}
 and configure {@link SpecularMaterial/alpha}, {@link SpecularMaterial/alphaMode},
 and {@link SpecularMaterial/alphaCutoff} to treat it as an alpha mask:

 ````javascript
 plasteredSphere.material.alphaMap = new xeokit.Texture({
     src: "textures/diffuse/crossGridColorMap.jpg"
 });

 plasteredSphere.material.alpha = 1.0;
 plasteredSphere.material.alphaMode = "mask";
 plasteredSphere.material.alphaCutoff = 0.2;
 ````

 *TODO: Screenshot*

 @class SpecularMaterial
 @module xeokit
 @submodule materials
 @constructor
 @extends Material

 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.

 @param [cfg] {*} The SpecularMaterial configuration

 @param [cfg.id] {String} Optional ID, unique among all components in the parent {@link Scene"}}Scene{{/crossLink}}, generated automatically when omitted.

 @param [cfg.meta=null] {String:Object} Metadata to attach to this SpecularMaterial.

 @param [cfg.diffuse=[1,1,1]] {Float32Array}  RGB diffuse color of this SpecularMaterial. Multiplies by the RGB
 components of {@link SpecularMaterial/diffuseMap}.

 @param [cfg.diffuseMap=undefined] {Texture} RGBA {@link Texture} containing the diffuse color
 of this SpecularMaterial, with optional *A* component for alpha. The RGB components multiply by the
 {@link SpecularMaterial/diffuse} property,
 while the *A* component, if present, multiplies by the {@link SpecularMaterial/alpha} property.

 @param [cfg.specular=[1,1,1]] {Number} RGB specular color of this SpecularMaterial. Multiplies by the
 {@link SpecularMaterial/specularMap} and the *RGB* components of
 {@link SpecularMaterial/specularGlossinessMap}.

 @param [cfg.specularMap=undefined] {Texture} RGB texture containing the specular color of this SpecularMaterial. Multiplies
 by the {@link SpecularMaterial/specular} property. Must be within the same {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

 @param [cfg.glossiness=1.0] {Number} Factor in the range [0..1] indicating how glossy this SpecularMaterial is. 0 is
 no glossiness, 1 is full glossiness. Multiplies by the *R* component of {@link SpecularMaterial/glossinessMap}
 and the *A* component of {@link SpecularMaterial/specularGlossinessMap}.

 @param [cfg.specularGlossinessMap=undefined] {Texture} RGBA {@link Texture} containing this
 SpecularMaterial's specular color in its *RGB* component and glossiness in its *A* component. Its *RGB* components multiply by the
 {@link SpecularMaterial/specular} property, while its *A* component multiplies by the
 {@link SpecularMaterial/glossiness} property. Must be within the same
 {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

 @param [cfg.specularF0=0.0] {Number} Factor in the range 0..1 indicating how reflective this SpecularMaterial is.

 @param [cfg.emissive=[0,0,0]] {Float32Array}  RGB emissive color of this SpecularMaterial. Multiplies by the RGB
 components of {@link SpecularMaterial/emissiveMap}.

 @param [cfg.emissiveMap=undefined] {Texture} RGB {@link Texture} containing the emissive color of this
 SpecularMaterial. Multiplies by the {@link SpecularMaterial/emissive} property.
 Must be within the same {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

 @param [cfg.occlusionMap=undefined] {Texture} RGB ambient occlusion {@link Texture}. Within shaders,
 multiplies by the specular and diffuse light reflected by surfaces. Must be within the same {@link Scene}
 as this SpecularMaterial.

 @param [cfg.normalMap=undefined] {Texture} RGB tangent-space normal {@link Texture}. Must be
 within the same {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

 @param [cfg.alpha=1.0] {Number} Factor in the range 0..1 indicating how transparent this SpecularMaterial is.
 A value of 0.0 indicates fully transparent, 1.0 is fully opaque. Multiplies by the *R* component of
 {@link SpecularMaterial/alphaMap} and the *A* component, if present, of
 {@link SpecularMaterial/diffuseMap}.

 @param [cfg.alphaMap=undefined] {Texture} RGB {@link Texture} containing this SpecularMaterial's
 alpha in its *R* component. The *R* component multiplies by the {@link SpecularMaterial/alpha} property. Must
 be within the same {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

 @param [cfg.alphaMode="opaque"] {String} The alpha blend mode - accepted values are "opaque", "blend" and "mask".
 See the {@link SpecularMaterial/alphaMode} property for more info.

 @param [cfg.alphaCutoff=0.5] {Number} The alpha cutoff value.
 See the {@link SpecularMaterial/alphaCutoff} property for more info.

 @param [cfg.backfaces=false] {Boolean} Whether to render {@link Geometry"}}Geometry{{/crossLink}} backfaces.

 @param [cfg.frontface="ccw"] {Boolean} The winding order for {@link Geometry"}}Geometry{{/crossLink}} front faces - "cw" for clockwise, or "ccw" for counter-clockwise.

 @param [cfg.lineWidth=1] {Number} Scalar that controls the width of lines for {@link Geometry} with {@link Geometry/primitive} set to "lines".
 @param [cfg.pointSize=1] {Number} Scalar that controls the size of points for {@link Geometry} with {@link Geometry/primitive} set to "points".

 */
import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

const alphaModes = {"opaque": 0, "mask": 1, "blend": 2};
const alphaModeNames = ["opaque", "mask", "blend"];

class SpecularMaterial extends Material {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "SpecularMaterial";
    }

    init(cfg) {

        super.init(cfg);

        this._state = new RenderState({
            type: "SpecularMaterial",
            diffuse: math.vec3([1.0, 1.0, 1.0]),
            emissive: math.vec3([0.0, 0.0, 0.0]),
            specular: math.vec3([1.0, 1.0, 1.0]),
            glossiness: null,
            specularF0: null,
            alpha: null,
            alphaMode: null,
            alphaCutoff: null,
            lineWidth: null,
            pointSize: null,
            backfaces: null,
            frontface: null, // Boolean for speed; true == "ccw", false == "cw"
            hash: null
        });

        this.diffuse = cfg.diffuse;
        this.specular = cfg.specular;
        this.glossiness = cfg.glossiness;
        this.specularF0 = cfg.specularF0;
        this.emissive = cfg.emissive;
        this.alpha = cfg.alpha;

        if (cfg.diffuseMap) {
            this._diffuseMap = this._checkComponent("Texture", cfg.diffuseMap);
        }
        if (cfg.emissiveMap) {
            this._emissiveMap = this._checkComponent("Texture", cfg.emissiveMap);
        }
        if (cfg.specularMap) {
            this._specularMap = this._checkComponent("Texture", cfg.specularMap);
        }
        if (cfg.glossinessMap) {
            this._glossinessMap = this._checkComponent("Texture", cfg.glossinessMap);
        }
        if (cfg.specularGlossinessMap) {
            this._specularGlossinessMap = this._checkComponent("Texture", cfg.specularGlossinessMap);
        }
        if (cfg.occlusionMap) {
            this._occlusionMap = this._checkComponent("Texture", cfg.occlusionMap);
        }
        if (cfg.alphaMap) {
            this._alphaMap = this._checkComponent("Texture", cfg.alphaMap);
        }
        if (cfg.normalMap) {
            this._normalMap = this._checkComponent("Texture", cfg.normalMap);
        }

        this.alphaMode = cfg.alphaMode;
        this.alphaCutoff = cfg.alphaCutoff;
        this.backfaces = cfg.backfaces;
        this.frontface = cfg.frontface;

        this.lineWidth = cfg.lineWidth;
        this.pointSize = cfg.pointSize;

        this._makeHash();
    }

    _makeHash() {
        const state = this._state;
        const hash = ["/spe"];
        if (this._diffuseMap) {
            hash.push("/dm");
            if (this._diffuseMap.hasMatrix) {
                hash.push("/mat");
            }
            hash.push("/" + this._diffuseMap.encoding);
        }
        if (this._emissiveMap) {
            hash.push("/em");
            if (this._emissiveMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._glossinessMap) {
            hash.push("/gm");
            if (this._glossinessMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._specularMap) {
            hash.push("/sm");
            if (this._specularMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._specularGlossinessMap) {
            hash.push("/sgm");
            if (this._specularGlossinessMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._occlusionMap) {
            hash.push("/ocm");
            if (this._occlusionMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._normalMap) {
            hash.push("/nm");
            if (this._normalMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._alphaMap) {
            hash.push("/opm");
            if (this._alphaMap.hasMatrix) {
                hash.push("/mat");
            }
        }
        hash.push(";");
        state.hash = hash.join("");
    }

    /**
     RGB diffuse color of this SpecularMaterial.

     Multiplies by the *RGB* components of {@link SpecularMaterial/diffuseMap}.

     @property diffuse
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set diffuse(value) {
        let diffuse = this._state.diffuse;
        if (!diffuse) {
            diffuse = this._state.diffuse = new Float32Array(3);
        } else if (value && diffuse[0] === value[0] && diffuse[1] === value[1] && diffuse[2] === value[2]) {
            return;
        }
        if (value) {
            diffuse[0] = value[0];
            diffuse[1] = value[1];
            diffuse[2] = value[2];
        } else {
            diffuse[0] = 1;
            diffuse[1] = 1;
            diffuse[2] = 1;
        }
        this.glRedraw();
    }

    get diffuse() {
        return this._state.diffuse;
    }

    /**
     RGB {@link Texture} containing the diffuse color of this SpecularMaterial, with optional *A* component for alpha.

     The *RGB* components multiply by the {@link SpecularMaterial/diffuse} property,
     while the *A* component, if present, multiplies by the {@link SpecularMaterial/alpha} property.

     @property diffuseMap
     @default undefined
     @type {Texture}
     @final
     */
    get diffuseMap() {
        return this._diffuseMap;
    }

    /**
     RGB specular color of this SpecularMaterial.

     Multiplies by the {@link SpecularMaterial/specularMap}
     and the *A* component of {@link SpecularMaterial/specularGlossinessMap}.

     @property specular
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set specular(value) {
        let specular = this._state.specular;
        if (!specular) {
            specular = this._state.specular = new Float32Array(3);
        } else if (value && specular[0] === value[0] && specular[1] === value[1] && specular[2] === value[2]) {
            return;
        }
        if (value) {
            specular[0] = value[0];
            specular[1] = value[1];
            specular[2] = value[2];
        } else {
            specular[0] = 1;
            specular[1] = 1;
            specular[2] = 1;
        }
        this.glRedraw();
    }

    get specular() {
        return this._state.specular;
    }

    /**
     RGB texture containing the specular color of this SpecularMaterial.

     Multiplies by the {@link SpecularMaterial/specular} property.

     @property specularMap
     @default undefined
     @type {Texture}
     @final
     */
    get specularMap() {
        return this._specularMap;
    }

    /**
     RGBA texture containing this SpecularMaterial's specular color in its *RGB* components and glossiness in its *A* component.

     The *RGB* components multiply by the {@link SpecularMaterial/specular} property, while
     the *A* component multiplies by the {@link SpecularMaterial/glossiness} property.

     @property specularGlossinessMap
     @default undefined
     @type {Texture}
     @final
     */
    get specularGlossinessMap() {
        return this._specularGlossinessMap;
    }

    /**
     Factor in the range [0..1] indicating how glossy this SpecularMaterial is.

     0 is no glossiness, 1 is full glossiness.

     Multiplies by the *R* component of {@link SpecularMaterial/glossinessMap}
     and the *A* component of {@link SpecularMaterial/specularGlossinessMap}.

     @property glossiness
     @default 1.0
     @type Number
     */
    set glossiness(value) {
        value = (value !== undefined && value !== null) ? value : 1.0;
        if (this._state.glossiness === value) {
            return;
        }
        this._state.glossiness = value;
        this.glRedraw();
    }

    get glossiness() {
        return this._state.glossiness;
    }

    /**
     RGB texture containing this SpecularMaterial's glossiness in its *R* component.

     The *R* component multiplies by the {@link SpecularMaterial/glossiness} property.

     Must be within the same {@link Scene"}}Scene{{/crossLink}} as this SpecularMaterial.

     @property glossinessMap
     @default undefined
     @type {Texture}
     @final
     */
    get glossinessMap() {
        return this._glossinessMap;
    }

    /**
     Factor in the range [0..1] indicating amount of specular Fresnel.

     @property specularF0
     @default 0.0
     @type Number
     */
    set specularF0(value) {
        value = (value !== undefined && value !== null) ? value : 0.0;
        if (this._state.specularF0 === value) {
            return;
        }
        this._state.specularF0 = value;
        this.glRedraw();
    }

    get specularF0() {
        return this._state.specularF0;
    }

    /**
     RGB emissive color of this SpecularMaterial.

     Multiplies by {@link SpecularMaterial/emissiveMap}.

     @property emissive
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set emissive(value) {
        let emissive = this._state.emissive;
        if (!emissive) {
            emissive = this._state.emissive = new Float32Array(3);
        } else if (value && emissive[0] === value[0] && emissive[1] === value[1] && emissive[2] === value[2]) {
            return;
        }
        if (value) {
            emissive[0] = value[0];
            emissive[1] = value[1];
            emissive[2] = value[2];
        } else {
            emissive[0] = 0;
            emissive[1] = 0;
            emissive[2] = 0;
        }
        this.glRedraw();
    }

    get emissive() {
        return this._state.emissive;
    }

    /**
     RGB texture containing the emissive color of this SpecularMaterial.

     Multiplies by the {@link SpecularMaterial/emissive} property.

     @property emissiveMap
     @default undefined
     @type {Texture}
     @final
     */
    get emissiveMap() {
        return this._emissiveMap;
    }

    /**
     Factor in the range [0..1] indicating how transparent this SpecularMaterial is.

     A value of 0.0 is fully transparent, while 1.0 is fully opaque.

     Multiplies by the *R* component of {@link SpecularMaterial/alphaMap} and
     the *A* component, if present, of {@link SpecularMaterial/diffuseMap}.

     @property alpha
     @default 1.0
     @type Number
     */
    set alpha(value) {
        value = (value !== undefined && value !== null) ? value : 1.0;
        if (this._state.alpha === value) {
            return;
        }
        this._state.alpha = value;
        this.glRedraw();
    }

    get alpha() {
        return this._state.alpha;
    }

    /**
     RGB {@link Texture} with alpha in its *R* component.

     The *R* component multiplies by the {@link SpecularMaterial/alpha} property.

     @property alphaMap
     @default undefined
     @type {Texture}
     @final
     */
    get alphaMap() {
        return this._alphaMap;
    }

    /**
     RGB tangent-space normal {@link Texture} attached to this SpecularMaterial.

     @property normalMap
     @default undefined
     @type {Texture}
     @final
     */
    get normalMap() {
        return this._normalMap;
    }

    /**
     RGB ambient occlusion {@link Texture} attached to this SpecularMaterial.

     Within objectRenderers, multiplies by the specular and diffuse light reflected by surfaces.

     @property occlusionMap
     @default undefined
     @type {Texture}
     @final
     */
    get occlusionMap() {
        return this._occlusionMap;
    }

    /**
     The alpha rendering mode.

     This governs how alpha is treated. Alpha is the combined result of the
     {@link SpecularMaterial/alpha} and
     {@link SpecularMaterial/alphaMap} properties.

     * "opaque" - The alpha value is ignored and the rendered output is fully opaque.
     * "mask" - The rendered output is either fully opaque or fully transparent depending on the alpha value and the specified alpha cutoff value.
     * "blend" - The alpha value is used to composite the source and destination areas. The rendered output is combined with the background using the normal painting operation (i.e. the Porter and Duff over operator)

     @property alphaMode
     @default "opaque"
     @type {String}
     */
    set alphaMode(alphaMode) {
        alphaMode = alphaMode || "opaque";
        let value = alphaModes[alphaMode];
        if (value === undefined) {
            this.error("Unsupported value for 'alphaMode': " + alphaMode + " defaulting to 'opaque'");
            value = "opaque";
        }
        if (this._state.alphaMode === value) {
            return;
        }
        this._state.alphaMode = value;
        this.glRedraw();
    }

    get alphaMode() {
        return alphaModeNames[this._state.alphaMode];
    }

    /**
     The alpha cutoff value.

     Specifies the cutoff threshold when {@link SpecularMaterial/alphaMode}
     equals "mask". If the alpha is greater than or equal to this value then it is rendered as fully
     opaque, otherwise, it is rendered as fully transparent. A value greater than 1.0 will render the entire
     material as fully transparent. This value is ignored for other modes.

     Alpha is the combined result of the
     {@link SpecularMaterial/alpha} and
     {@link SpecularMaterial/alphaMap} properties.

     @property alphaCutoff
     @default 0.5
     @type {Number}
     */
    set alphaCutoff(alphaCutoff) {
        if (alphaCutoff === null || alphaCutoff === undefined) {
            alphaCutoff = 0.5;
        }
        if (this._state.alphaCutoff === alphaCutoff) {
            return;
        }
        this._state.alphaCutoff = alphaCutoff;
    }

    get alphaCutoff() {
        return this._state.alphaCutoff;
    }

    /**
     Whether backfaces are visible on attached {@link Mesh"}}Meshes{{/crossLink}}.

     The backfaces will belong to {@link Geometry} compoents that are also attached to
     the {@link Mesh"}}Meshes{{/crossLink}}.

     @property backfaces
     @default false
     @type Boolean
     */
    set backfaces(value) {
        value = !!value;
        if (this._state.backfaces === value) {
            return;
        }
        this._state.backfaces = value;
        this.glRedraw();
    }

    get backfaces() {
        return this._state.backfaces;
    }

    /**
     Indicates the winding direction of front faces on attached {@link Mesh"}}Meshes{{/crossLink}}.

     The faces will belong to {@link Geometry} components that are also attached to
     the {@link Mesh"}}Meshes{{/crossLink}}.

     @property frontface
     @default "ccw"
     @type String
     */
    set frontface(value) {
        value = value !== "cw";
        if (this._state.frontface === value) {
            return;
        }
        this._state.frontface = value;
        this.glRedraw();
    }

    get frontface() {
        return this._state.frontface ? "ccw" : "cw";
    }

    /**
     The SpecularMaterial's line width.

     @property lineWidth
     @default 1.0
     @type Number
     */
    set lineWidth(value) {
        this._state.lineWidth = value || 1.0;
        this.glRedraw();
    }

    get lineWidth() {
        return this._state.lineWidth;
    }

    /**
     The SpecularMaterial's point size.

     @property pointSize
     @default 1
     @type Number
     */
    set pointSize(value) {
        this._state.pointSize = value || 1;
        this.glRedraw();
    }

    get pointSize() {
        return this._state.pointSize;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {SpecularMaterial};