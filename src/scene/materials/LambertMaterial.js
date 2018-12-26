/**
 A **LambertMaterial** is a {@link Material} that defines the surface appearance of
 attached {@link Mesh"}}Meshes{{/crossLink}} using
 the non-physically based <a href="https://en.wikipedia.org/wiki/Lambertian_reflectance">Lambertian</a> model for calculating reflectance.

 ## Examples

 TODO

 ## Overview

 * Used for rendering non-realistic objects such as "helpers", wireframe objects, labels etc.
 * Use  {@link PhongMaterial} when you need specular highlights.
 * Use the physically based {@link MetallicMaterial} or {@link SpecularMaterial} when you need more realism.

 For LambertMaterial, the illumination calculation is performed at each triangle vertex, and the resulting color is
 interpolated across the face of the triangle. For {@link PhongMaterial}, {@link MetallicMaterial} and
 {@link SpecularMaterial}, vertex normals are interpolated across the surface of the triangle, and
 the illumination calculation is performed at each texel.

 The following table summarizes LambertMaterial properties:

 | Property | Type | Range | Default Value | Space | Description |
 |:--------:|:----:|:-----:|:-------------:|:-----:|:-----------:|
 |  {@link LambertMaterial/ambient} | Array | [0, 1] for all components | [1,1,1,1] | linear | The RGB components of the ambient light reflected by the material. |
 |  {@link LambertMaterial/color} | Array | [0, 1] for all components | [1,1,1,1] | linear | The RGB components of the diffuse light reflected by the material. |
 |  {@link LambertMaterial/emissive} | Array | [0, 1] for all components | [0,0,0] | linear | The RGB components of the light emitted by the material. |
 | {@link LambertMaterial/alpha} | Number | [0, 1] | 1 | linear | The transparency of the material surface (0 fully transparent, 1 fully opaque). |
 | {@link LambertMaterial/lineWidth} | Number | [0..100] | 1 |  | Line width in pixels. |
 | {@link LambertMaterial/pointSize} | Number | [0..100] | 1 |  | Point size in pixels. |
 | {@link LambertMaterial/backfaces} | Boolean |  | false |  | Whether to render {@link Geometry}}Geometry{{/crossLink}} backfaces. |
 | {@link LambertMaterial/backfaces} | String | "ccw", "cw" | "ccw" |  | The winding order for {@link Geometry}}Geometry{{/crossLink}} frontfaces - "cw" for clockwise, or "ccw" for counter-clockwise. |

 ## Usage

 ```` javascript
 var torus = new xeokit.Mesh({
    material: new xeokit.LambertMaterial({
        ambient: [0.3, 0.3, 0.3],
        color: [0.5, 0.5, 0.0],
        alpha: 1.0 // Default
    }),

    geometry: new xeokit.TorusGeometry()
});
 ````
 @class LambertMaterial
 @module xeokit
 @submodule materials
 @constructor
 @extends Material
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} The LambertMaterial configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {@link Scene}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta=null] {String:Object} Metadata to attach to this LambertMaterial.
 @param [cfg.ambient=[1.0, 1.0, 1.0 ]] {Array of Number} LambertMaterial ambient color.
 @param [cfg.color=[ 1.0, 1.0, 1.0 ]] {Array of Number} LambertMaterial diffuse color.
 @param [cfg.emissive=[ 0.0, 0.0, 0.0 ]] {Array of Number} LambertMaterial emissive color.
 @param [cfg.alpha=1] {Number} Scalar in range 0-1 that controls alpha, where 0 is completely transparent and 1 is completely opaque.
 @param [cfg.reflectivity=1] {Number} Scalar in range 0-1 that controls how much {@link CubeMap"}}CubeMap{{/crossLink}} is reflected.
 @param [cfg.lineWidth=1] {Number} Scalar that controls the width of lines for {@link Geometry} with {@link Geometry/primitive} set to "lines".
 @param [cfg.pointSize=1] {Number} Scalar that controls the size of points for {@link Geometry} with {@link Geometry/primitive} set to "points".
 @param [cfg.backfaces=false] {Boolean} Whether to render {@link Geometry}}Geometry{{/crossLink}} backfaces.
 @param [cfg.frontface="ccw"] {Boolean} The winding order for {@link Geometry}}Geometry{{/crossLink}} front faces - "cw" for clockwise, or "ccw" for counter-clockwise.
 */

import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

class LambertMaterial extends Material {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "LambertMaterial";
    }

    init(cfg) {

        super.init(cfg);

        this._state = new RenderState({
            type: "LambertMaterial",
            ambient: math.vec3([1.0, 1.0, 1.0]),
            color: math.vec3([1.0, 1.0, 1.0]),
            emissive: math.vec3([0.0, 0.0, 0.0]),
            alpha: null,
            alphaMode: 0, // 2 ("blend") when transparent, so renderer knows when to add to transparency bin
            lineWidth: null,
            pointSize: null,
            backfaces: null,
            frontface: null, // Boolean for speed; true == "ccw", false == "cw"
            hash: "/lam;"
        });

        this.ambient = cfg.ambient;
        this.color = cfg.color;
        this.emissive = cfg.emissive;
        this.alpha = cfg.alpha;
        this.lineWidth = cfg.lineWidth;
        this.pointSize = cfg.pointSize;
        this.backfaces = cfg.backfaces;
        this.frontface = cfg.frontface;
    }

    /**
     The LambertMaterial's ambient color.

     @property ambient
     @default [0.3, 0.3, 0.3]
     @type Float32Array
     */

    set ambient(value) {
        let ambient = this._state.ambient;
        if (!ambient) {
            ambient = this._state.ambient = new Float32Array(3);
        } else if (value && ambient[0] === value[0] && ambient[1] === value[1] && ambient[2] === value[2]) {
            return;
        }
        if (value) {
            ambient[0] = value[0];
            ambient[1] = value[1];
            ambient[2] = value[2];
        } else {
            ambient[0] = .2;
            ambient[1] = .2;
            ambient[2] = .2;
        }
        this.glRedraw();
    }

    get ambient() {
        return this._state.ambient;
    }

    /**
     The LambertMaterial's diffuse color.

     @property color
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set color(value) {
        let color = this._state.color;
        if (!color) {
            color = this._state.color = new Float32Array(3);
        } else if (value && color[0] === value[0] && color[1] === value[1] && color[2] === value[2]) {
            return;
        }
        if (value) {
            color[0] = value[0];
            color[1] = value[1];
            color[2] = value[2];
        } else {
            color[0] = 1;
            color[1] = 1;
            color[2] = 1;
        }
        this.glRedraw();
    }

    get color() {
        return this._state.color;
    }

    /**
     The LambertMaterial's emissive color.

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
     Factor in the range [0..1] indicating how transparent the LambertMaterial is.

     A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

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
        this._state.alphaMode = value < 1.0 ? 2 /* blend */ : 0
        /* opaque */
        this.glRedraw();
    }

    get alpha() {
        return this._state.alpha;
    }

    /**
     The LambertMaterial's line width.

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
     The LambertMaterial's point size.

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

    /**
     Whether backfaces are visible on attached {@link Mesh"}}Meshes{{/crossLink}}.

     The backfaces will belong to {@link Geometry} components that are also attached to
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

    _getState() {
        return this._state;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {LambertMaterial};