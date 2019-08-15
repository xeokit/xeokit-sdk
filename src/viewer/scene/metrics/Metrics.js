import {Component} from "../Component.js";
import {math} from "../math/math.js";

const unitsInfo = {
    meters: {
        abbrev: "m"
    },
    metres: {
        abbrev: "m"
    },
    centimeters: {
        abbrev: "cm"
    },
    centimetres: {
        abbrev: "cm"
    },
    millimeters: {
        abbrev: "mm"
    },
    millimetres: {
        abbrev: "mm"
    },
    yards: {
        abbrev: "yd"
    },
    feet: {
        abbrev: "ft"
    },
    inches: {
        abbrev: "in"
    }
};

/**
 * @desc Configures its {@link Scene}'s unit of measurement and mapping between the Real-space and World-space 3D Cartesian coordinate systems.
 *
 *
 * ## Overview
 *
 * * Located at {@link Scene#metrics}.
 * * {@link Metrics#units} configures the unit of measurement, which is ````"meters"```` by default.
 * * {@link Metrics#scale} configures the number of measurement units represented by each unit within the World-space 3D coordinate system. This is ````1.0```` by default.
 * * {@link Metrics#origin} configures the  3D Real-space origin, in current measurement units, at which this {@link Scene}'s World-space coordinate origin sits, This is ````[0,0,0]```` by default.
 *
 * ## Usage
 *
 * Let's load a model using an {@link XKTLoaderPlugin}, then configure the unit of measurement and the coordinate
 * mapping between the Real-space and World-space 3D coordinate systems.
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.scene.camera.eye = [-2.37, 18.97, -26.12];
 * viewer.scene.camera.look = [10.97, 5.82, -11.22];
 * viewer.scene.camera.up = [0.36, 0.83, 0.40];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * const metrics = viewer.scene.metrics;
 *
 * metrics.units = "meters";
 * metrics.scale = 10.0;
 * metrics.origin = [100.0, 0.0, 200.0];
 * ````
 */
class Metrics extends Component {

    /**
     * @constructor
     * @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._units = "meters";
        this._scale = 1.0;
        this._origin = math.vec3([0, 0, 0]);

        this.units = cfg.units;
        this.scale = cfg.scale;
        this.origin = cfg.origin;
    }

    /**
     * Gets info about supported measurement units.
     *
     * This will be:
     *
     * ````javascript
     * {
     *      {
     *          meters: {
     *              abbrev: "m"
     *          },
     *          metres: {
     *              abbrev: "m"
     *          },
     *          centimeters: {
     *              abbrev: "cm"
     *          },
     *          centimetres: {
     *              abbrev: "cm"
     *          },
     *          millimeters: {
     *              abbrev: "mm"
     *          },
     *          millimetres: {
     *              abbrev: "mm"
     *          },
     *          yards: {
     *              abbrev: "yd"
     *          },
     *          feet: {
     *              abbrev: "ft"
     *          },
     *          inches: {
     *              abbrev: "in"
     *          }
     *      }
     * }
     * ````
     *
     * @type {*}
     */
    get unitsInfo() {
        return unitsInfo;
    }

    /**
     * Sets the {@link Scene}'s current measurement units.
     *
     * Accepted values are ````"meters"````, ````"centimeters"````, ````"millimeters"````, ````"metres"````, ````"centimetres"````, ````"millimetres"````, ````"yards"````, ````"feet"```` and ````"inches"````.
     *
     * @emits ````"units"```` event on change, with the value of this property.
     * @type {String}
     */
    set units(value) {
        if (!value) {
            value = "meters";
        }
        const info = unitsInfo[value];
        if (!info) {
            this.error("Unsupported value for 'units': " + value + " defaulting to 'meters'");
            value = "meters";
        }
        this._units = value;
        this.fire("units", this._units);
    }

    /**
     * Gets the {@link Scene}'s current measurement units.
     *
     * @type {String}
     */
    get units() {
        return this._units;
    }

    /**
     * Sets the number of measurement units represented by each of the {@link Scene}'s World-space coordinate system units.
     *
     * For example, if {@link Metrics#units} is ````"meters"````, and there are ten meters per
     * World-space coordinate system unit, then ````scale```` would have a value of ````10.0````.
     *
     * @emits ````"scale"```` event on change, with the value of this property.
     * @type {Number}
     */
    set scale(value) {
        value = value || 1;
        if (value <= 0) {
            this.error("scale value should be larger than zero");
            return;
        }
        this._scale = value;
        this.fire("scale", this._scale);
    }

    /**
     * Gets the number of measurement units represented by each of the {@link Scene}'s World-space coordinate system units.
     *
     * @type {Number}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the Real-space 3D origin, in the current measurement units, at which this {@link Scene}'s
     * World-space coordinate origin ````[0,0,0]```` sits.
     *
     * @emits "origin" event on change, with the value of this property.
     * @type {Number[]}
     */
    set origin(value) {
        if (!value) {
            this._origin[0] = 0;
            this._origin[1] = 0;
            this._origin[2] = 0;
            return;
        }
        this._origin[0] = value[0];
        this._origin[1] = value[1];
        this._origin[2] = value[2];
        this.fire("origin", this._origin);
    }

    /**
     * Gets the 3D Real-space origin, in current measurement units, at which this {@link Scene}'s
     * World-space coordinate origin ````[0,0,0]```` sits.
     *
     * @type {Number[]}
     */
    get origin() {
        return this._origin;
    }

    /**
     * Converts a 3D World-space position within the {@link Scene} to 3D Real-space.
     *
     * This is equivalent to ````#origin + (worldPos * #scale)````.
     *
     * @param {Number[]} worldPos World-space 3D position, in World coordinate system units.
     * @param {Number[]} [realPos] Destination for Real-space 3D position, in the current measurement {@link Metrics#units}.
     * @returns {Number[]} Real-space 3D position, in units indicated by {@link Metrics#units}.
     */
    worldToRealPos(worldPos, realPos = new Float32Array(3)) {
        realPos[0] = this._origin[0] + (this._scale * worldPos[0]);
        realPos[1] = this._origin[1] + (this._scale * worldPos[1]);
        realPos[2] = this._origin[2] + (this._scale * worldPos[2]);
    }

    /**
     * Converts a 3D Real-space position to the  {@link Scene}'s 3D World-space.
     *
     * This is equivalent to ````(worldPos - #origin) / #scale````.
     *
     * @param {Number[]} realPos Real-space 3D position, in the current measurement {@link Metrics#units}.
     * @param {Number[]} [worldPos] Destination for World-space 3D position, in World coordinate system units.
     * @returns {Number[]} World-space 3D position, in World coordinate system units.
     */
    realToWorldPos(realPos, worldPos = new Float32Array(3)) {
        worldPos[0] = (realPos[0] - this._origin[0]) / this._scale;
        worldPos[1] = (realPos[1] - this._origin[1]) / this._scale;
        worldPos[2] = (realPos[2] - this._origin[2]) / this._scale;
        return worldPos;
    }
}

export {Metrics};