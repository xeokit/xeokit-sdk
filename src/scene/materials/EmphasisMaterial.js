import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';

const PRESETS = {
    "default": {
        fill: true,
        fillColor: [0.4, 0.4, 0.4],
        fillAlpha: 0.2,
        edges: true,
        edgeColor: [0.2, 0.2, 0.2],
        edgeAlpha: 0.5,
        edgeWidth: 1
    },
    "defaultWhiteBG": {
        fill: true,
        fillColor: [1, 1, 1],
        fillAlpha: 0.6,
        edgeColor: [0.2, 0.2, 0.2],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "defaultLightBG": {
        fill: true,
        fillColor: [0.4, 0.4, 0.4],
        fillAlpha: 0.2,
        edges: true,
        edgeColor: [0.2, 0.2, 0.2],
        edgeAlpha: 0.5,
        edgeWidth: 1
    },
    "defaultDarkBG": {
        fill: true,
        fillColor: [0.4, 0.4, 0.4],
        fillAlpha: 0.2,
        edges: true,
        edgeColor: [0.5, 0.5, 0.5],
        edgeAlpha: 0.5,
        edgeWidth: 1
    },
    "phosphorous": {
        fill: true,
        fillColor: [0.0, 0.0, 0.0],
        fillAlpha: 0.4,
        edges: true,
        edgeColor: [0.9, 0.9, 0.9],
        edgeAlpha: 0.5,
        edgeWidth: 2
    },
    "sunset": {
        fill: true,
        fillColor: [0.9, 0.9, 0.6],
        fillAlpha: 0.2,
        edges: true,
        edgeColor: [0.9, 0.9, 0.9],
        edgeAlpha: 0.5,
        edgeWidth: 1
    },
    "vectorscope": {
        fill: true,
        fillColor: [0.0, 0.0, 0.0],
        fillAlpha: 0.7,
        edges: true,
        edgeColor: [0.2, 1.0, 0.2],
        edgeAlpha: 1,
        edgeWidth: 2
    },
    "battlezone": {
        fill: true,
        fillColor: [0.0, 0.0, 0.0],
        fillAlpha: 1.0,
        edges: true,
        edgeColor: [0.2, 1.0, 0.2],
        edgeAlpha: 1,
        edgeWidth: 3
    },
    "sepia": {
        fill: true,
        fillColor: [0.970588207244873, 0.7965892553329468, 0.6660899519920349],
        fillAlpha: 0.4,
        edges: true,
        edgeColor: [0.529411792755127, 0.4577854573726654, 0.4100345969200134],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "yellowHighlight": {
        fill: true,
        fillColor: [1.0, 1.0, 0.0],
        fillAlpha: 0.5,
        edges: true,
        edgeColor: [0.529411792755127, 0.4577854573726654, 0.4100345969200134],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "greenSelected": {
        fill: true,
        fillColor: [0.0, 1.0, 0.0],
        fillAlpha: 0.5,
        edges: true,
        edgeColor: [0.4577854573726654, 0.529411792755127, 0.4100345969200134],
        edgeAlpha: 1.0,
        edgeWidth: 1
    },
    "gamegrid": {
        fill: true,
        fillColor: [0.2, 0.2, 0.7],
        fillAlpha: 0.9,
        edges: true,
        edgeColor: [0.4, 0.4, 1.6],
        edgeAlpha: 0.8,
        edgeWidth: 3
    }
};

/**
 * Configures the appearance of {@link Mesh}es when ghosted, highlighted or selected.
 *
 * * Ghost a {@link Mesh} by setting {@link Mesh#ghosted} ````true````.
 * * Highlight a {@link Mesh} by setting {@link Mesh#highlighted} ````true````.
 * * Select a {@link Mesh} by setting {@link Mesh#selected} ````true````.
 * * When {@link Mesh}es are within the subtree of a {@link Node}, then setting {@link Node#ghosted}, {@link Node#highlighted} or {@link Node#selected}
 * will collectively set {@link Mesh#ghosted}, {@link Mesh#highlighted} or {@link Mesh#selected} on all those {@link Mesh}es.
 * * EmphasisMaterial provides several presets. Select a preset by setting {@link EmphasisMaterial#preset} to the ID of a preset in {@link EmphasisMaterial#presets}.
 * * By default, a {@link Mesh} uses the default EmphasisMaterials in {@link Scene#ghostMaterial}, {@link Scene#highlightMaterial} and {@link Scene#selectedMaterial}
 * but you can assign each {@link Mesh#ghostMaterial}, {@link Mesh#highlightMaterial} or {@link Mesh#selectedMaterial} to a custom EmphasisMaterial, if required.
 *
 * ## Usage
 *
 * In the example below, we'll create a {@link Mesh} with its own GhostMaterial and set {@link Mesh#ghosted} ````true```` to ghost it.
 *
 * ````javascript
 * new Mesh(myViewer.scene, {
 *     geometry: new BoxGeometry(myViewer.scene, {
 *         edgeThreshold: 1
 *     }),
 *     material: new PhongMaterial(myViewer.scene, {
 *         diffuse: [0.2, 0.2, 1.0]
 *     }),
 *     ghostMaterial: new EdgeMaterial(myViewer.scene, {
 *         fill: true,
 *         fillColor: [0, 0, 0],
 *         fillAlpha: 0.7,
 *         edges: true,
 *         edgeColor: [0.2, 1.0, 0.2],
 *         edgeAlpha: 1.0,
 *         edgeWidth: 2
 *     }),
 *     ghosted: true
 * });
 * ````
 *
 * Note the ````edgeThreshold```` configuration for the {@link Geometry} on our {@link Mesh}.  EmphasisMaterial configures
 * a wireframe representation of the {@link Geometry} for the selected emphasis mode, which will have inner edges (those edges between
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
 *     ghosted: true
 * });
 *
 * var ghostMaterial = myViewer.scene.ghostMaterial;
 *
 * ghostMaterial.fillColor = [0.2, 1.0, 0.2];
 * ghostMaterial.fillAlpha = 1.0;
 * ````
 *
 * ## Presets
 *
 * Let's switch the {@link Scene#ghostMaterial} to one of the presets in {@link EmphasisMaterial#presets}:
 *
 * ````javascript
 * myViewer.ghostMaterial.preset = EmphasisMaterial.presets["sepia"];
 * ````
 *
 * We can also create an EmphasisMaterial from a preset, while overriding properties of the preset as required:
 *
 * ````javascript
 * var myEmphasisMaterial = new EMphasisMaterial(myViewer.scene, {
 *      preset: "sepia",
 *      fillColor = [1.0, 0.5, 0.5]
 * });
 * ````
 */
class EmphasisMaterial extends Material {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "EmphasisMaterial";
    }

    /**
     Available EmphasisMaterial presets.

     @property presets
     @type {Object}
     @static
     */
    get presets() {
        return PRESETS;
    };

    /**
     @constructor
     @extends Material
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] The EmphasisMaterial configuration
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     @param [cfg.meta=null] {String:Object} Metadata to attach to this EmphasisMaterial.
     @param [cfg.fill=true] {Boolean} Indicates whether or not ghost surfaces are filled with color.
     @param [cfg.fillColor=[0.4,0.4,0.4]] {Array of Number} EmphasisMaterial fill color.
     @param [cfg.fillAlpha=0.2] {Number}  Transparency of filled ghost faces. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
     @param [cfg.edges=true] {Boolean} Indicates whether or not ghost edges are visible.
     @param [cfg.edgeColor=[0.2,0.2,0.2]] {Array of Number}  RGB color of ghost edges.
     @param [cfg.edgeAlpha=0.5] {Number} Transparency of ghost edges. A value of 0.0 indicates fully transparent, 1.0 is fully opaque.
     @param [cfg.edgeWidth=1] {Number}  Width of ghost edges, in pixels.
     @param [cfg.backfaces=false] {Boolean} Whether to render {@link Geometry} backfaces.
     @param [cfg.preset] {String} Selects a preset EmphasisMaterial configuration - see {@link EmphasisMaterial/preset:method"}}EmphasisMaterial#preset(){{/crossLink}}.
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            type: "EmphasisMaterial",
            fill: null,
            fillColor: null,
            fillAlpha: null,
            edges: null,
            edgeColor: null,
            edgeAlpha: null,
            edgeWidth: null,
            backfaces: true
        });

        this._preset = "default";

        if (cfg.preset) { // Apply preset then override with configs where provided
            this.preset = cfg.preset;
            if (cfg.fill !== undefined) {
                this.fill = cfg.fill;
            }
            if (cfg.fillColor) {
                this.fillColor = cfg.fillColor;
            }
            if (cfg.fillAlpha !== undefined) {
                this.fillAlpha = cfg.fillAlpha;
            }
            if (cfg.edges !== undefined) {
                this.edges = cfg.edges;
            }
            if (cfg.edgeColor) {
                this.edgeColor = cfg.edgeColor;
            }
            if (cfg.edgeAlpha !== undefined) {
                this.edgeAlpha = cfg.edgeAlpha;
            }
            if (cfg.edgeWidth !== undefined) {
                this.edgeWidth = cfg.edgeWidth;
            }
            if (cfg.backfaces !== undefined) {
                this.backfaces = cfg.backfaces;
            }
        } else {
            this.fill = cfg.fill;
            this.fillColor = cfg.fillColor;
            this.fillAlpha = cfg.fillAlpha;
            this.edges = cfg.edges;
            this.edgeColor = cfg.edgeColor;
            this.edgeAlpha = cfg.edgeAlpha;
            this.edgeWidth = cfg.edgeWidth;
            this.backfaces = cfg.backfaces;
        }
    }

    /**
     Indicates whether or not ghost surfaces are filled with color.

     @property fill
     @default true
     @type Boolean
     */
    set fill(value) {
        value = value !== false;
        if (this._state.fill === value) {
            return;
        }
        this._state.fill = value;
        this.glRedraw();
    }

    get fill() {
        return this._state.fill;
    }

    /**
     RGB color of filled ghost faces.

     @property fillColor
     @default [0.4, 0.4, 0.4]
     @type Float32Array
     */
    set fillColor(value) {
        let fillColor = this._state.fillColor;
        if (!fillColor) {
            fillColor = this._state.fillColor = new Float32Array(3);
        } else if (value && fillColor[0] === value[0] && fillColor[1] === value[1] && fillColor[2] === value[2]) {
            return;
        }
        if (value) {
            fillColor[0] = value[0];
            fillColor[1] = value[1];
            fillColor[2] = value[2];
        } else {
            fillColor[0] = 0.4;
            fillColor[1] = 0.4;
            fillColor[2] = 0.4;
        }
        this.glRedraw();
    }

    get fillColor() {
        return this._state.fillColor;
    }

    /**
     Transparency of filled ghost faces.

     A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

     @property fillAlpha
     @default 0.2
     @type Number
     */
    set fillAlpha(value) {
        value = (value !== undefined && value !== null) ? value : 0.2;
        if (this._state.fillAlpha === value) {
            return;
        }
        this._state.fillAlpha = value;
        this.glRedraw();
    }

    get fillAlpha() {
        return this._state.fillAlpha;
    }

    /**
     Indicates whether or not ghost edges are visible.

     @property edges
     @default true
     @type Boolean
     */
    set edges(value) {
        value = value !== false;
        if (this._state.edges === value) {
            return;
        }
        this._state.edges = value;
        this.glRedraw();
    }

    get edges() {
        return this._state.edges;
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
     @default 0.5
     @type Number
     */
    set edgeAlpha(value) {
        value = (value !== undefined && value !== null) ? value : 0.5;
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
     Whether backfaces are visible on attached {@link Mesh}es.

     The backfaces will belong to {@link Geometry} components that are also attached to
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
     Selects a preset EmphasisMaterial configuration.

     Available presets are:

     * "default" - grey wireframe with translucent fill, for light backgrounds.
     * "defaultLightBG" - grey wireframe with grey translucent fill, for light backgrounds.
     * "defaultDarkBG" - grey wireframe with grey translucent fill, for dark backgrounds.
     * "vectorscope" - green wireframe and black translucent fill.
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
        this.fill = preset.fill;
        this.fillColor = preset.fillColor;
        this.fillAlpha = preset.fillAlpha;
        this.edges = preset.edges;
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

export {EmphasisMaterial};