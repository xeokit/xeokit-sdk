import {Material} from './Material.js';
import {RenderState} from '../webgl/RenderState.js';

const PRESETS = {
    "default": {
        pointSize: 4,
        roundPoints: true,
        perspectivePoints: true
    },
    "square": {
        pointSize: 4,
        roundPoints: false,
        perspectivePoints: true
    },
    "round": {
        pointSize: 4,
        roundPoints: true,
        perspectivePoints: true
    }
};

/**
 * @desc Configures the size and shape of "points" geometry primitives.
 *
 * * Located at {@link Scene#pointsMaterial}.
 * * Supports round and square points.
 * * Optional perspective point scaling.
 * * Globally configures "points" primitives for all {@link PerformanceModel}s.
 *
 * ## Usage
 *
 * In the example below, we'll customize the {@link Scene}'s global ````PointsMaterial````, then use
 * an {@link XKTLoaderPlugin} to load a model containing a point cloud.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#materials_PointsMaterial)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
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
 * viewer.scene.pointsMaterial.pointSize = 2;
 * viewer.scene.pointsMaterial.roundPoints = true;
 * viewer.scene.pointsMaterial.perspectivePoints = true;
 * viewer.scene.pointsMaterial.minPerspectivePointSize = 1;
 * viewer.scene.pointsMaterial.maxPerspectivePointSize = 6;
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/duplex/duplex.xkt",
 *      metaModelSrc: "./metaModels/duplex/metaModel.json"
 * });
 * ````
 */
class PointsMaterial extends Material {

    /**
     @private
     */
    get type() {
        return "PointsMaterial";
    }

    /**
     * Gets available PointsMaterial presets.
     *
     * @type {Object}
     */
    get presets() {
        return PRESETS;
    };

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] The PointsMaterial configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Number} [cfg.pointSize=2] Point size in pixels.
     * @param {Boolean} [cfg.roundPoints=true] Whether points are round (````true````) or square (````false````).
     * @param {Boolean} [cfg.perspectivePoints=true] Whether apparent point size reduces with distance when {@link Camera#projection} is set to "perspective".
     * @param {Number} [cfg.minPerspectivePointSize=1] When ````perspectivePoints```` is ````true````, this is the minimum rendered size of each point in pixels.
     * @param {Number} [cfg.maxPerspectivePointSize=6] When ````perspectivePoints```` is ````true````, this is the maximum rendered size of each point in pixels.
     * @param {String} [cfg.preset] Selects a preset PointsMaterial configuration - see {@link PointsMaterial#presets}.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            type: "PointsMaterial",
            pointSize: null,
            roundPoints: null,
            perspectivePoints: null,
            minPerspectivePointSize: null,
            maxPerspectivePointSize: null
        });

        if (cfg.preset) { // Apply preset then override with configs where provided
            this.preset = cfg.preset;
            if (cfg.pointSize !== undefined) {
                this.pointSize = cfg.pointSize;
            }
            if (cfg.roundPoints !== undefined) {
                this.roundPoints = cfg.roundPoints;
            }
            if (cfg.perspectivePoints !== undefined) {
                this.perspectivePoints = cfg.perspectivePoints;
            }
            if (cfg.minPerspectivePointSize !== undefined) {
                this.minPerspectivePointSize = cfg.minPerspectivePointSize;
            }
            if (cfg.maxPerspectivePointSize !== undefined) {
                this.maxPerspectivePointSize = cfg.minPerspectivePointSize;
            }
        } else {
            this._preset = "default";
            this.pointSize = cfg.pointSize;
            this.roundPoints = cfg.roundPoints;
            this.perspectivePoints = cfg.perspectivePoints;
            this.minPerspectivePointSize = cfg.minPerspectivePointSize;
            this.maxPerspectivePointSize = cfg.maxPerspectivePointSize;
        }
    }

    /**
     * Sets point size.
     *
     * Default value is ````2.0```` pixels.
     *
     * @type {Number}
     */
    set pointSize(value) {
        this._state.pointSize = value || 2.0;
        this.glRedraw();
    }

    /**
     * Gets point size.
     *
     * Default value is ````2.0```` pixels.
     *
     * @type {Number}
     */
    get pointSize() {
        return this._state.pointSize;
    }


    /**
     * Sets if points are round or square.
     *
     * Default is ````true```` to set points round.
     *
     * @type {Boolean}
     */
    set roundPoints(value) {
        value = (value !== false);
        if (this._state.roundPoints === value) {
            return;
        }
        this._state.roundPoints = value;
        this.scene._needRecompile = true;
        this.glRedraw();
    }

    /**
     * Gets if points are round or square.
     *
     * Default is ````true```` to set points round.
     *
     * @type {Boolean}
     */
    get roundPoints() {
        return this._state.roundPoints;
    }

    /**
     * Sets if rendered point size reduces with distance when {@link Camera#projection} is set to ````"perspective"````.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set perspectivePoints(value) {
        value = (value !== false);
        if (this._state.perspectivePoints === value) {
            return;
        }
        this._state.perspectivePoints = value;
        this.scene._needRecompile = true;
        this.glRedraw();
    }

    /**
     * Gets if rendered point size reduces with distance when {@link Camera#projection} is set to "perspective".
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get perspectivePoints() {
        return this._state.perspectivePoints;
    }

    /**
     * Sets the minimum rendered size of points when {@link PointsMaterial#perspectivePoints} is ````true````.
     *
     * Default value is ````1.0```` pixels.
     *
     * @type {Number}
     */
    set minPerspectivePointSize(value) {
        this._state.minPerspectivePointSize = value || 1.0;
        this.scene._needRecompile = true;
        this.glRedraw();
    }

    /**
     * Gets the minimum rendered size of points when {@link PointsMaterial#perspectivePoints} is ````true````.
     *
     * Default value is ````1.0```` pixels.
     *
     * @type {Number}
     */
    get minPerspectivePointSize() {
        return this._state.minPerspectivePointSize;
    }

    /**
     * Sets the maximum rendered size of points when {@link PointsMaterial#perspectivePoints} is ````true````.
     *
     * Default value is ````6```` pixels.
     *
     * @type {Number}
     */
    set maxPerspectivePointSize(value) {
        this._state.maxPerspectivePointSize = value || 6;
        this.scene._needRecompile = true;
        this.glRedraw();
    }

    /**
     * Gets the maximum rendered size of points when {@link PointsMaterial#perspectivePoints} is ````true````.
     *
     * Default value is ````6```` pixels.
     *
     * @type {Number}
     */
    get maxPerspectivePointSize() {
        return this._state.maxPerspectivePointSize;
    }

    /**
     * Selects a preset ````PointsMaterial```` configuration.
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
        this.pointSize = preset.pointSize;
        this.roundPoints = preset.roundPoints;
        this.perspectivePoints = preset.perspectivePoints;
        this.minPerspectivePointSize = preset.minPerspectivePointSize;
        this.maxPerspectivePointSize = preset.maxPerspectivePointSize;
        this._preset = value;
    }

    /**
     * The current preset ````PointsMaterial```` configuration.
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
        return [
            this.pointSize,
            this.roundPoints,
            this.perspectivePoints,
            this.minPerspectivePointSize,
            this.maxPerspectivePointSize
        ].join((";"));
    }

    /**
     * Destroys this ````PointsMaterial````.
     */
    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {PointsMaterial};