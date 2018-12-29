import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

const modes = {"opaque": 0, "mask": 1, "blend": 2};
const modeNames = ["opaque", "mask", "blend"];

/**
 * @desc Configures the normal rendered appearance of {@link Mesh}es using the physically-accurate *metallic-roughness* shading model.
 *
 * * Useful for conductive materials, such as metal, but also appropriate for insulators.
 * * {@link SpecularMaterial} is best for insulators, such as wood, ceramics and plastic.
 * * {@link PhongMaterial} is appropriate for non-realistic objects.
 * * {@link LambertMaterial} is appropriate for high-detail models that need to render as efficiently as possible.
 *
 * ## Background Theory
 *
 * For an introduction to physically-based rendering (PBR) concepts, try these articles:
 *
 * * Joe Wilson's [Basic Theory of Physically-Based Rendering](https://www.marmoset.co/posts/basic-theory-of-physically-based-rendering/)
 * * Jeff Russel's [Physically-based Rendering, and you can too!](https://www.marmoset.co/posts/physically-based-rendering-and-you-can-too/)
 * * Sebastien Legarde's [Adapting a physically-based shading model](http://seblagarde.wordpress.com/tag/physically-based-rendering/)
 *
 * ## MetallicMaterial Properties
 *
 * The following table summarizes MetallicMaterial properties:
 *
 * | Property | Type | Range | Default Value | Space | Description |
 * |:--------:|:----:|:-----:|:-------------:|:-----:|:-----------:|
 * | {@link MetallicMaterial#baseColor} | Array | [0, 1] for all components | [1,1,1,1] | linear | The RGB components of the base color of the material. |
 * | {@link MetallicMaterial#metallic} | Number | [0, 1] | 1 | linear | The metallic-ness the material (1 for metals, 0 for non-metals). |
 * | {@link MetallicMaterial#roughness} | Number | [0, 1] | 1 | linear | The roughness of the material surface. |
 * | {@link MetallicMaterial#specularF0} | Number | [0, 1] | 1 | linear | The specular Fresnel of the material surface. |
 * | {@link MetallicMaterial#emissive} | Array | [0, 1] for all components | [0,0,0] | linear | The RGB components of the emissive color of the material. |
 * | {@link MetallicMaterial#alpha} | Number | [0, 1] | 1 | linear | The transparency of the material surface (0 fully transparent, 1 fully opaque). |
 * | {@link MetallicMaterial#baseColorMap} | {@link Texture} |  | null | sRGB | Texture RGB components multiplying by {@link MetallicMaterial#baseColor}. If the fourth component (A) is present, it multiplies by {@link MetallicMaterial#alpha}. |
 * | {@link MetallicMaterial#metallicMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link MetallicMaterial#metallic}. |
 * | {@link MetallicMaterial#roughnessMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link MetallicMaterial#roughness}. |
 * | {@link MetallicMaterial#metallicRoughnessMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link MetallicMaterial#metallic} and second component multiplying by {@link MetallicMaterial#roughness}. |
 * | {@link MetallicMaterial#emissiveMap} | {@link Texture} |  | null | linear | Texture with RGB components multiplying by {@link MetallicMaterial#emissive}. |
 * | {@link MetallicMaterial#alphaMap} | {@link Texture} |  | null | linear | Texture with first component multiplying by {@link MetallicMaterial#alpha}. |
 * | {@link MetallicMaterial#occlusionMap} | {@link Texture} |  | null | linear | Ambient occlusion texture multiplying by surface's reflected diffuse and specular light. |
 * | {@link MetallicMaterial#normalMap} | {@link Texture} |  | null | linear | Tangent-space normal map. |
 * | {@link MetallicMaterial#alphaMode} | String | "opaque", "blend", "mask" | "blend" |  | Alpha blend mode. |
 * | {@link MetallicMaterial#alphaCutoff} | Number | [0..1] | 0.5 |  | Alpha cutoff value. |
 * | {@link MetallicMaterial#backfaces} | Boolean |  | false |  | Whether to render {@link Geometry} backfaces. |
 * | {@link MetallicMaterial#frontface} | String | "ccw", "cw" | "ccw" |  | The winding order for {@link Geometry} frontfaces - "cw" for clockwise, or "ccw" for counter-clockwise. |
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a {@link TorusGeometry} and a MetallicMaterial.
 *
 * Note that in this example we're providing separate {@link Texture} for the {@link MetallicMaterial#metallic} and {@link MetallicMaterial#roughness}
 * channels, which allows us a little creative flexibility. Then, in the next example further down, we'll combine those channels
 * within the same {@link Texture} for efficiency.
 *
 * ````javascript
 * const myMesh = new Mesh(myViewer.scene, {
 *
 *     geometry: new TorusGeometry(myViewer.scene),
 *
 *     material: new MetallicMaterial(myViewer.scene, {
 *
 *         // Channels with default values, just to show them
 *
 *         baseColor: [1.0, 1.0, 1.0],
 *         metallic: 1.0,
 *         roughness: 1.0,
 *         emissive: [0.0, 0.0, 0.0],
 *         alpha: 1.0,
 *
 *         // Textures to multiply by some of the channels
 *         baseColorMap : new Texture(myViewer.scene, {  // Multiplies by baseColor
 *             src: "textures/baseColor.png"
 *         }),
 *         metallicMap : new Texture(myViewer.scene, {   // R component multiplies by metallic
 *             src: "textures/metallic.png"
 *         }),
 *         roughnessMap : new Texture(myViewer.scene, {  // R component multiplies by roughness
 *             src: "textures/roughness.png"
 *         }),
 *         occlusionMap : new Texture(myViewer.scene, {  // Multiplies by fragment alpha
 *             src: "textures/occlusion.png"
 *         }),
 *         normalMap : new Texture(myViewer.scene, {
 *             src: "textures/normalMap.png"
 *         })
 *     })
 * });
 * ````
 *
 * ## Combining Channels Within the Same Textures
 *
 * In the previous example we provided separate {@link Texture} for the {@link MetallicMaterial#metallic} and
 * {@link MetallicMaterial#roughness} channels, but we can combine those channels into the same {@link Texture} to
 * reduce download time, memory footprint and rendering time (and also for glTF compatibility).
 *
 * Here's our MetallicMaterial again with those channels combined in the {@link MetallicMaterial#metallicRoughnessMap}
 * {@link Texture}, where the *R* component multiplies by {@link MetallicMaterial#metallic} and *G* multiplies
 * by {@link MetallicMaterial#roughness}.
 *
 * ````javascript
 * const myMesh = new Mesh(myViewer.scene, {
 *
 *     geometry: new TorusGeometry(myViewer.scene),
 *
 *     material: new MetallicMaterial(myViewer.scene, {
 *
 *         // Channels with default values, just to show them
 *
 *         baseColor: [1.0, 1.0, 1.0],
 *         metallic: 1.0,
 *         roughness: 1.0,
 *         emissive: [0.0, 0.0, 0.0],
 *         alpha: 1.0,
 *
 *         // Textures to multiply by some of the channels
 *
 *         baseColorMap : new Texture(myViewer.scene, {  // Multiplies by baseColor
 *             src: "textures/baseColor.png"
 *         }),
 *         metallicRoughnessMap : new Texture(myViewer.scene, {   // <<----------- Added
 *             src: "textures/metallicRoughness.png"              // R component multiplies by metallic
 *         }),                                                    // G component multiplies by roughness
 *         occlusionMap : new Texture(myViewer.scene, {  // Multiplies by fragment alpha
 *             src: "textures/occlusion.png"
 *         }),
 *         normalMap : new Texture(myViewer.scene, {
 *             src: "textures/normalMap.png"
 *         })
 *     })
 * });
 * ````
 *
 * Although not shown in this example, we can also texture {@link MetallicMaterial#alpha} with the *A* component of
 * {@link MetallicMaterial#baseColorMap}'s {@link Texture}, if required.
 *
 * ## Alpha Blending
 *
 * Let's make our {@link Mesh} transparent.
 *
 * We'll update the {@link MetallicMaterial#alpha} and {@link MetallicMaterial#alphaMode}, causing it to blend 50%
 * with the background:
 *
 * ````javascript
 * hydrant.material.alpha = 0.5;
 * hydrant.material.alphaMode = "blend";
 * ````
 *
 * ## Alpha Masking
 *
 * Let's apply an alpha mask to our {@link Mesh}.
 *
 * We'll configure an {@link MetallicMaterial#alphaMap} to multiply by {@link MetallicMaterial#alpha},
 * with {@link MetallicMaterial#alphaMode} and {@link MetallicMaterial#alphaCutoff} to treat it as an alpha mask:
 *
 * ````javascript
 * const myMesh = new Mesh(myViewer.scene, {
 *
 *     geometry: new TorusGeometry(myViewer.scene),
 *
 *     material: new MetallicMaterial(myViewer.scene, {
 *
 *         // Channels with default values, just to show them
 *
 *         baseColor: [1.0, 1.0, 1.0],
 *         metallic: 1.0,
 *         roughness: 1.0,
 *         emissive: [0.0, 0.0, 0.0],
 *         alpha: 1.0,
 *         alphaMode : "mask",  // <<---------------- Added
 *         alphaCutoff : 0.2,   // <<---------------- Added
 *
 *         // Textures to multiply by some of the channels
 *
 *         alphaMap : new Texture(myViewer.scene{ // <<---------------- Added
 *              src: "textures/alphaMap.jpg"
 *         }),
 *         baseColorMap : new Texture(myViewer.scene, {  // Multiplies by baseColor
 *             src: "textures/baseColor.png"
 *         }),
 *         metallicRoughnessMap : new Texture(myViewer.scene, {   // R component multiplies by metallic
 *             src: "textures/metallicRoughness.png"              // G component multiplies by roughness
 *         }),
 *         occlusionMap : new Texture(myViewer.scene, {  // Multiplies by fragment alpha
 *             src: "textures/occlusion.png"
 *         }),
 *         normalMap : new Texture(myViewer.scene, {
 *             src: "textures/normalMap.png"
 *         })
 *      })
 * });
 * ````
 */
class MetallicMaterial extends Material {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "MetallicMaterial";
    }

    /**
     @constructor
     @extends Material

     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.

     @param {*} [cfg] The MetallicMaterial configuration.

     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.

     @param [cfg.meta=null] {String:Object} Metadata to attach to this material.

     @param [cfg.baseColor=[1,1,1]] {Float32Array}  RGB diffuse color of this MetallicMaterial. Multiplies by the RGB
     components of {@link MetallicMaterial#baseColorMap}.

     @param [cfg.metallic=1.0] {Number} Factor in the range 0..1 indicating how metallic this MetallicMaterial is.
     1 is metal, 0 is non-metal. Multiplies by the *R* component of {@link MetallicMaterial#metallicMap} and the *A* component of
     {@link MetallicMaterial#metalRoughnessMap}.

     @param [cfg.roughness=1.0] {Number} Factor in the range 0..1 indicating the roughness of this MetallicMaterial.
     0 is fully smooth, 1 is fully rough. Multiplies by the *R* component of {@link MetallicMaterial#roughnessMap}.

     @param [cfg.specularF0=0.0] {Number} Factor in the range 0..1 indicating specular Fresnel.

     @param [cfg.emissive=[0,0,0]] {Float32Array}  RGB emissive color of this MetallicMaterial. Multiplies by the RGB
     components of {@link MetallicMaterial#emissiveMap}.

     @param [cfg.alpha=1.0] {Number} Factor in the range 0..1 indicating the alpha of this MetallicMaterial.
     Multiplies by the *R* component of {@link MetallicMaterial#alphaMap} and the *A* component,
     if present, of {@link MetallicMaterial#baseColorMap}. The value of
     {@link MetallicMaterial#alphaMode} indicates how alpha is interpreted when rendering.

     @param [cfg.baseColorMap=undefined] {Texture} RGBA {@link Texture} containing the diffuse color
     of this MetallicMaterial, with optional *A* component for alpha. The RGB components multiply by the
     {@link MetallicMaterial#baseColor} property,
     while the *A* component, if present, multiplies by the {@link MetallicMaterial#alpha} property.

     @param [cfg.alphaMap=undefined] {Texture} RGB {@link Texture} containing this MetallicMaterial's
     alpha in its *R* component. The *R* component multiplies by the {@link MetallicMaterial#alpha} property. Must
     be within the same {@link Scene} as this MetallicMaterial.

     @param [cfg.metallicMap=undefined] {Texture} RGB {@link Texture} containing this MetallicMaterial's
     metallic factor in its *R* component. The *R* component multiplies by the
     {@link MetallicMaterial#metallic} property. Must be within the same
     {@link Scene} as this MetallicMaterial.

     @param [cfg.roughnessMap=undefined] {Texture} RGB {@link Texture} containing this MetallicMaterial's
     roughness factor in its *R* component. The *R* component multiplies by the
     {@link MetallicMaterial#roughness} property. Must be within the same
     {@link Scene} as this MetallicMaterial.

     @param [cfg.metallicRoughnessMap=undefined] {Texture} RGB {@link Texture} containing this
     MetallicMaterial's metalness in its *R* component and roughness in its *G* component. Its *R* component multiplies by the
     {@link MetallicMaterial#metallic} property, while its *G* component multiplies by the
     {@link MetallicMaterial#roughness} property. Must be within the same
     {@link Scene} as this MetallicMaterial.

     @param [cfg.emissiveMap=undefined] {Texture} RGB {@link Texture} containing the emissive color of this
     MetallicMaterial. Multiplies by the {@link MetallicMaterial#emissive} property.
     Must be within the same {@link Scene} as this MetallicMaterial.

     @param [cfg.occlusionMap=undefined] {Texture} RGB ambient occlusion {@link Texture}. Within shaders,
     multiplies by the specular and diffuse light reflected by surfaces. Must be within the same {@link Scene}
     as this MetallicMaterial.

     @param [cfg.normalMap=undefined] {Texture} RGB tangent-space normal {@link Texture}. Must be
     within the same {@link Scene} as this MetallicMaterial.

     @param [cfg.alphaMode="opaque"] {String} The alpha blend mode, which specifies how alpha is to be interpreted. Accepted
     values are "opaque", "blend" and "mask". See the {@link MetallicMaterial#alphaMode} property for more info.

     @param [cfg.alphaCutoff=0.5] {Number} The alpha cutoff value.
     See the {@link MetallicMaterial#alphaCutoff} property for more info.

     @param [cfg.backfaces=false] {Boolean} Whether to render {@link Geometry} backfaces.
     @param [cfg.frontface="ccw"] {Boolean} The winding order for {@link Geometry} front faces - "cw" for clockwise, or "ccw" for counter-clockwise.

     @param [cfg.lineWidth=1] {Number} Scalar that controls the width of lines for {@link Geometry} with {@link Geometry/primitive} set to "lines".
     @param [cfg.pointSize=1] {Number} Scalar that controls the size of points for {@link Geometry} with {@link Geometry/primitive} set to "points".

     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            type: "MetallicMaterial",
            baseColor: math.vec4([1.0, 1.0, 1.0]),
            emissive: math.vec4([0.0, 0.0, 0.0]),
            metallic: null,
            roughness: null,
            specularF0: null,
            alpha: null,
            alphaMode: null, // "opaque"
            alphaCutoff: null,
            lineWidth: null,
            pointSize: null,
            backfaces: null,
            frontface: null, // Boolean for speed; true == "ccw", false == "cw"
            hash: null
        });

        this.baseColor = cfg.baseColor;
        this.metallic = cfg.metallic;
        this.roughness = cfg.roughness;
        this.specularF0 = cfg.specularF0;
        this.emissive = cfg.emissive;
        this.alpha = cfg.alpha;

        if (cfg.baseColorMap) {
            this._baseColorMap = this._checkComponent("Texture", cfg.baseColorMap);
        }
        if (cfg.metallicMap) {
            this._metallicMap = this._checkComponent("Texture", cfg.metallicMap);

        }
        if (cfg.roughnessMap) {
            this._roughnessMap = this._checkComponent("Texture", cfg.roughnessMap);
        }
        if (cfg.metallicRoughnessMap) {
            this._metallicRoughnessMap = this._checkComponent("Texture", cfg.metallicRoughnessMap);
        }
        if (cfg.emissiveMap) {
            this._emissiveMap = this._checkComponent("Texture", cfg.emissiveMap);
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
        const hash = ["/met"];
        if (this._baseColorMap) {
            hash.push("/bm");
            if (this._baseColorMap._state.hasMatrix) {
                hash.push("/mat");
            }
            hash.push("/" + this._baseColorMap._state.encoding);
        }
        if (this._metallicMap) {
            hash.push("/mm");
            if (this._metallicMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._roughnessMap) {
            hash.push("/rm");
            if (this._roughnessMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._metallicRoughnessMap) {
            hash.push("/mrm");
            if (this._metallicRoughnessMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._emissiveMap) {
            hash.push("/em");
            if (this._emissiveMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._occlusionMap) {
            hash.push("/ocm");
            if (this._occlusionMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._alphaMap) {
            hash.push("/am");
            if (this._alphaMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        if (this._normalMap) {
            hash.push("/nm");
            if (this._normalMap._state.hasMatrix) {
                hash.push("/mat");
            }
        }
        hash.push(";");
        state.hash = hash.join("");
    }


    /**
     RGB diffuse color.

     Multiplies by the RGB components of {@link MetallicMaterial#baseColorMap}.

     @property baseColor
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set baseColor(value) {
        let baseColor = this._state.baseColor;
        if (!baseColor) {
            baseColor = this._state.baseColor = new Float32Array(3);
        } else if (value && baseColor[0] === value[0] && baseColor[1] === value[1] && baseColor[2] === value[2]) {
            return;
        }
        if (value) {
            baseColor[0] = value[0];
            baseColor[1] = value[1];
            baseColor[2] = value[2];
        } else {
            baseColor[0] = 1;
            baseColor[1] = 1;
            baseColor[2] = 1;
        }
        this.glRedraw();
    }

    get baseColor() {
        return this._state.baseColor;
    }


    /**
     RGB {@link Texture} containing the diffuse color of this MetallicMaterial, with optional *A* component for alpha.

     The RGB components multiply by the {@link MetallicMaterial#baseColor} property,
     while the *A* component, if present, multiplies by the {@link MetallicMaterial#alpha} property.

     @property baseColorMap
     @default undefined
     @type {Texture}
     @final
     */
    get baseColorMap() {
        return this._baseColorMap;
    }

    /**
     Factor in the range [0..1] indicating how metallic this MetallicMaterial is.

     1 is metal, 0 is non-metal.

     Multiplies by the *R* component of {@link MetallicMaterial#metallicMap}
     and the *A* component of {@link MetallicMaterial#metalRoughnessMap}.

     @property metallic
     @default 1.0
     @type Number
     */
    set metallic(value) {
        value = (value !== undefined && value !== null) ? value : 1.0;
        if (this._state.metallic === value) {
            return;
        }
        this._state.metallic = value;
        this.glRedraw();
    }

    get metallic() {
        return this._state.metallic;
    }

    /**
     RGB {@link Texture} containing this MetallicMaterial's metallic factor in its *R* component.

     The *R* component multiplies by the {@link MetallicMaterial#metallic} property.

     @property metallicMap
     @default undefined
     @type {Texture}
     @final
     */
    get metallicMap() {
        return this._attached.metallicMap;
    }

    /**
     Factor in the range [0..1] indicating the roughness of this MetallicMaterial.

     0 is fully smooth, 1 is fully rough.

     Multiplies by the *R* component of {@link MetallicMaterial#roughnessMap}.

     @property roughness
     @default 1.0
     @type Number
     */
    set roughness(value) {
        value = (value !== undefined && value !== null) ? value : 1.0;
        if (this._state.roughness === value) {
            return;
        }
        this._state.roughness = value;
        this.glRedraw();
    }

    get roughness() {
        return this._state.roughness;
    }

    /**
     RGB {@link Texture} containing this MetallicMaterial's roughness factor in its *R* component.

     The *R* component multiplies by the {@link MetallicMaterial#roughness} property.

     Must be within the same {@link Scene} as this MetallicMaterial.

     @property roughnessMap
     @default undefined
     @type {Texture}
     @final
     */
    get roughnessMap() {
        return this._attached.roughnessMap;
    }

    /**
     RGB {@link Texture} containing this MetallicMaterial's metalness in its *R* component and roughness in its *G* component.

     Its *B* component multiplies by the {@link MetallicMaterial#metallic} property, while
     its *G* component multiplies by the {@link MetallicMaterial#roughness} property.

     Must be within the same {@link Scene} as this MetallicMaterial.

     @property metallicRoughnessMap
     @default undefined
     @type {Texture}
     @final
     */
    get metallicRoughnessMap() {
        return this._attached.metallicRoughnessMap;
    }

    /**
     Factor in the range [0..1] indicating specular Fresnel value.

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
     RGB emissive color.

     Multiplies by {@link MetallicMaterial#emissiveMap}.

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
     RGB emissive map.

     Multiplies by {@link MetallicMaterial#emissive}.

     @property emissiveMap
     @default undefined
     @type {Texture}
     @final
     */
    get emissiveMap() {
        return this._attached.emissiveMap;
    }

    /**
     RGB ambient occlusion map.

     Within objectRenderers, multiplies by the specular and diffuse light reflected by surfaces.

     @property occlusionMap
     @default undefined
     @type {Texture}
     @final
     */
    get occlusionMap() {
        return this._attached.occlusionMap;
    }

    /**
     Factor in the range [0..1] indicating the alpha value.

     Multiplies by the *R* component of {@link MetallicMaterial#alphaMap} and
     the *A* component, if present, of {@link MetallicMaterial#baseColorMap}.

     The value of {@link MetallicMaterial#alphaMode} indicates how alpha is
     interpreted when rendering.

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
     RGB {@link Texture} containing this MetallicMaterial's alpha in its *R* component.

     The *R* component multiplies by the {@link MetallicMaterial#alpha} property.

     @property alphaMap
     @default undefined
     @type {Texture}
     @final
     */
    get alphaMap() {
        return this._attached.alphaMap;
    }

    /**
     RGB tangent-space normal map {@link Texture}.

     Must be within the same {@link Scene} as this MetallicMaterial.

     @property normalMap
     @default undefined
     @type {Texture}
     @final
     */
    get normalMap() {
        return this._attached.normalMap;
    }

    /**
     The alpha rendering mode.

     This specifies how alpha is interpreted. Alpha is the combined result of the
     {@link MetallicMaterial#alpha} and
     {@link MetallicMaterial#alphaMap} properties.

     * "opaque" - The alpha value is ignored and the rendered output is fully opaque.
     * "mask" - The rendered output is either fully opaque or fully transparent depending on the alpha and {@link MetallicMaterial#alphaCutoff}.
     * "blend" - The alpha value is used to composite the source and destination areas. The rendered output is combined with the background using the normal painting operation (i.e. the Porter and Duff over operator).

     @property alphaMode
     @default "opaque"
     @type {String}
     */

    set alphaMode(alphaMode) {
        alphaMode = alphaMode || "opaque";
        let value = modes[alphaMode];
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
        return modeNames[this._state.alphaMode];
    }

    /**
     The alpha cutoff value.

     Specifies the cutoff threshold when {@link MetallicMaterial#alphaMode}
     equals "mask". If the alpha is greater than or equal to this value then it is rendered as fully
     opaque, otherwise, it is rendered as fully transparent. A value greater than 1.0 will render the entire
     material as fully transparent. This value is ignored for other modes.

     Alpha is the combined result of the
     {@link MetallicMaterial#alpha} and
     {@link MetallicMaterial#alphaMap} properties.

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
     Whether backfaces are visible on attached {@link Mesh}es.

     The backfaces will belong to {@link Geometry} compoents that are also attached to
     the {@link Mesh}es.

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
     Indicates the winding direction of front faces on attached {@link Mesh}es.

     The faces will belong to {@link Geometry} components that are also attached to
     the {@link Mesh}es.

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
     The MetallicMaterial's line width.

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
     The MetallicMaterial's point size.

     @property pointSize
     @default 1.0
     @type Number
     */
    set pointSize(value) {
        this._state.pointSize = value || 1.0;
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

export {MetallicMaterial};