import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';

const PRESETS = {
    "default": {
        edgeColor: [0.0, 0.0, 0.0],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "defaultWhiteBG": {
        edgeColor: [0.2, 0.2, 0.2],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "defaultLightBG": {
        edgeColor: [0.2, 0.2, 0.2],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "defaultDarkBG": {
        edgeColor: [0.5, 0.5, 0.5],
        edgeAlpha: 1.0,
        edgeWidth: 1
    }
};

/**
 * Defines the appearance of {@link Mesh}es when their edges are emphasised.
 *
 * * Emphasise edges of a {@link Mesh} by setting {@link Mesh#edges} ````true````.
 * * When {@link Mesh}es are within the subtree of a {@link Node}, then setting {@link Node#edges} ````true```` will collectively set {@link Mesh#edges} ````true```` on all those {@link Mesh}es.
 * * EdgeMaterial provides several presets. Select a preset by setting {@link EdgeMaterial#preset} to the ID of a preset in {@link EdgeMaterial#presets}.
 * * By default, a {@link Mesh} uses the default EdgeMaterial in {@link Scene#edgeMaterial}, but you can assign each {@link Mesh#edgeMaterial} to a custom EdgeMaterial if required.
 *
 * ## Usage
 *
 * In the example below, we'll create a {@link Mesh} with its own EdgeMaterial and set {@link Mesh#edges} ````true```` to emphasise its edges.
 *
 * ````javascript
 * new Mesh(myViewer.scene, {
 *     geometry: new BoxGeometry(myViewer.scene, {
 *         edgeThreshold: 1
 *     }),
 *     material: new PhongMaterial(myViewer.scene, {
 *         diffuse: [0.2, 0.2, 1.0]
 *     }),
 *     edgeMaterial: new EdgeMaterial(myViewer.scene, {
 *         edgeColor: [0.2, 1.0, 0.2],
 *         edgeAlpha: 1.0,
 *         edgeWidth: 2
 *     }),
 *     edges: true
 * });
 * ````
 *
 * Note the ````edgeThreshold```` configuration for the {@link Geometry} on our {@link Mesh}.  EdgeMaterial configures
 * a wireframe representation of the {@link Geometry}, which will have inner edges (those edges between
 * adjacent co-planar triangles) removed for visual clarity. The ````edgeThreshold```` indicates that, for
 * this particular {@link Geometry}, an inner edge is one where the angle between the surface normals of adjacent triangles
 * is not greater than ````5```` degrees. That's set to ````2```` by default, but we can override it to tweak the effect
 * as needed for particular Geometries.
 *
 * Here's the example again, this time implicitly defaulting to the {@link Scene#edgeMaterial}. We'll also modify that EdgeMaterial
 * to customize the effect.
 *
 * ````javascript
 * new Mesh({
 *     geometry: new TeapotGeometry(myViewer.scene, {
 *         edgeThreshold: 5
 *     }),
 *     material: new PhongMaterial(myViewer.scene, {
 *         diffuse: [0.2, 0.2, 1.0]
 *     }),
 *     edges: true
 * });
 *
 * var edgeMaterial = myViewer.scene.edgeMaterial;
 *
 * edgeMaterial.edgeColor = [0.2, 1.0, 0.2];
 * edgeMaterial.edgeAlpha = 1.0;
 * edgeMaterial.edgeWidth = 2;
 * ````
*
 *  ## Presets
 *
 * Let's switch the {@link Scene#edgeMaterial} to one of the presets in {@link EdgeMaterial#presets}:
 *
 * ````javascript
 * myViewer.edgeMaterial.preset = EdgeMaterial.presets["sepia"];
 * ````
 *
 * We can also create an EdgeMaterial from a preset, while overriding properties of the preset as required:
 *
 * ````javascript
 * var myEdgeMaterial = new EdgeMaterial(myViewer.scene, {
 *      preset: "sepia",
 *      edgeColor = [1.0, 0.5, 0.5]
 * });
 * ````
 */
class EdgeMaterial extends Material {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "EdgeMaterial";
    }

    /**
     Available EdgeMaterial presets.

     @property presets
     @type {Object}
     @static
     */
    get presets() {
        return PRESETS;
    };

    /**

     @class EdgeMaterial
     @module xeokit
     @submodule materials
     @constructor
     @extends Material
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] The EdgeMaterial configuration
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     @param [cfg.meta=null] {String:Object} Metadata to attach to this EdgeMaterial.

     @param [cfg.edgeColor=[0.2,0.2,0.2]] {Array of Number}  RGB color of ghost edges.
     @param [cfg.edgeAlpha=1.0] {Number} Transparency of ghost edges. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
     @param [cfg.edgeWidth=1] {Number}  Width of ghost edges, in pixels.

     @param [cfg.preset] {String} Selects a preset EdgeMaterial configuration - see {@link EdgeMaterial#preset:method"}}EdgeMaterial#preset(){{/crossLink}}.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            type: "EdgeMaterial",
            edgeColor: null,
            edgeAlpha: null,
            edgeWidth: null
        });

        this._preset = "default";

        if (cfg.preset) { // Apply preset then override with configs where provided
            this.preset = cfg.preset;
            if (cfg.edgeColor) {
                this.edgeColor = cfg.edgeColor;
            }
            if (cfg.edgeAlpha !== undefined) {
                this.edgeAlpha = cfg.edgeAlpha;
            }
            if (cfg.edgeWidth !== undefined) {
                this.edgeWidth = cfg.edgeWidth;
            }
        } else {
            this.edgeColor = cfg.edgeColor;
            this.edgeAlpha = cfg.edgeAlpha;
            this.edgeWidth = cfg.edgeWidth;
        }
    }


    /**
     RGB color of ghost edges.

     @property edgeColor
     @default [0.2, 0.2, 0.2]
     @type Float32Array
     */
    set edgeColor(value) {
        let edgeColor = this._state.edgeColor;
        if (!edgeColor) {
            edgeColor = this._state.edgeColor = new Float32Array(3);
        } else if (value && edgeColor[0] === value[0] && edgeColor[1] === value[1] && edgeColor[2] === value[2]) {
            return;
        }
        if (value) {
            edgeColor[0] = value[0];
            edgeColor[1] = value[1];
            edgeColor[2] = value[2];
        } else {
            edgeColor[0] = 0.2;
            edgeColor[1] = 0.2;
            edgeColor[2] = 0.2;
        }
        this.glRedraw();
    }

    get edgeColor() {
        return this._state.edgeColor;
    }

    /**
     Transparency of ghost edges.

     A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

     @property edgeAlpha
     @default 1.0
     @type Number
     */
    set edgeAlpha(value) {
        value = (value !== undefined && value !== null) ? value : 1.0;
        if (this._state.edgeAlpha === value) {
            return;
        }
        this._state.edgeAlpha = value;
        this.glRedraw();
    }

    get edgeAlpha() {
        return this._state.edgeAlpha;
    }

    /**
     Width of ghost edges, in pixels.

     @property edgeWidth
     @default 1.0
     @type Number
     */
    set edgeWidth(value) {
        this._state.edgeWidth = value || 1.0;
        this.glRedraw();
    }

    get edgeWidth() {
        return this._state.edgeWidth;
    }

    /**
     Selects a preset EdgeMaterial configuration.

     Available presets are:

     * "default" - grey wireframe with translucent fill, for light backgrounds.
     * "defaultLightBG" - grey wireframe with grey translucent fill, for light backgrounds.
     * "defaultDarkBG" - grey wireframe with grey translucent fill, for dark backgrounds.
     * "vectorscope" - green wireframe with glowing vertices and black translucent fill.
     * "battlezone" - green wireframe with black opaque fill, giving a solid hidden-lines-removed effect.
     * "sepia" - light red-grey wireframe with light sepia translucent fill - easy on the eyes.
     * "gamegrid" - light blue wireframe with dark blue translucent fill - reminiscent of Tron.
     * "yellowHighlight" - light yellow translucent fill - highlights while allowing underlying detail to show through.

     @property preset
     @default "default"
     @type String
     */
    set preset(value) {
        value = value || "default";
        if (this._preset === value) {
            return;
        }
        const preset = PRESETS[value];
        if (!preset) {
            this.error("unsupported preset: '" + value + "' - supported values are " + Object.keys(PRESETS).join(", "));
            return;
        }
        this.edgeColor = preset.edgeColor;
        this.edgeAlpha = preset.edgeAlpha;
        this.edgeWidth = preset.edgeWidth;
        this._preset = value;
    }

    get preset() {
        return this._preset;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {EdgeMaterial};