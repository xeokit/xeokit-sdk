import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';

const PRESETS = {
    "default": {
        lineWidth: 1
    },
    "thick": {
        lineWidth: 2
    },
    "thicker": {
        lineWidth: 4
    }
};

/**
 * @desc Configures the shape of "lines" geometry primitives.
 *
 * * Located at {@link Scene#linesMaterial}.
 * * Globally configures "lines" primitives for all {@link PerformanceModel}s.
 *
 * ## Usage
 *
 * In the example below, we'll customize the {@link Scene}'s global ````LinesMaterial````, then use
 * an {@link XKTLoaderPlugin} to load a model containing line segments.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#materials_LinesMaterial)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [0, 0, 5];
 * viewer.scene.camera.look = [0, 0, 0];
 * viewer.scene.camera.up = [0, 1, 0];
 *
 * viewer.scene.linesMaterial.lineWidth = 3;
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/Duplex.ifc.xkt"
 * });
 * ````
 */
class LinesMaterial extends Material {

    /**
     @private
     */
    get type() {
        return "LinesMaterial";
    }

    /**
     * Gets available LinesMaterial presets.
     *
     * @type {Object}
     */
    get presets() {
        return PRESETS;
    };

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] The LinesMaterial configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Number} [cfg.lineWidth=1] Line width in pixels.
     * @param {String} [cfg.preset] Selects a preset LinesMaterial configuration - see {@link LinesMaterial#presets}.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            type: "LinesMaterial",
            lineWidth: null
        });

        if (cfg.preset) { // Apply preset then override with configs where provided
            this.preset = cfg.preset;
            if (cfg.lineWidth !== undefined) {
                this.lineWidth = cfg.lineWidth;
            }
        } else {
            this._preset = "default";
            this.lineWidth = cfg.lineWidth;
        }
    }

    /**
     * Sets line width.
     *
     * Default value is ````1```` pixels.
     *
     * @type {Number}
     */
    set lineWidth(value) {
        this._state.lineWidth = value || 1;
        this.glRedraw();
    }

    /**
     * Gets the line width.
     *
     * Default value is ````1```` pixels.
     *
     * @type {Number}
     */
    get lineWidth() {
        return this._state.lineWidth;
    }

    /**
     * Selects a preset LinesMaterial configuration.
     *
     * Default value is ````"default"````.
     *
     * @type {String}
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
        this.lineWidth = preset.lineWidth;
        this._preset = value;
    }

    /**
     * The current preset LinesMaterial configuration.
     *
     * Default value is ````"default"````.
     *
     * @type {String}
     */
    get preset() {
        return this._preset;
    }

    /**
     * @private
     * @return {string}
     */
    get hash() {
        return ["" + this.lineWidth].join((";"));
    }

    /**
     * Destroys this LinesMaterial.
     */
    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {LinesMaterial};