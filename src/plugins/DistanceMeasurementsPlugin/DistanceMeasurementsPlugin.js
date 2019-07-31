import {Plugin} from "../../viewer/Plugin.js";
import {DistanceMeasurement} from "./DistanceMeasurement.js";
import {utils} from "../../viewer/scene/utils.js";
import {math} from "../../viewer/scene/math/math.js";
import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

/**
 * {@link Viewer} plugin for measuring point-to-point distances.
 *
 * [<img src="https://user-images.githubusercontent.com/83100/58403089-26589280-8062-11e9-8652-aed61a4e8c64.gif">](https://xeokit.github.io/xeokit-sdk/examples/#measurements_clickToFlyToPosition)
 *
 * * [[Example 1: Model with measurements](https://xeokit.github.io/xeokit-sdk/examples/#measurements_distance_modelWithMeasurements)]
 * * [[Example 2: Create measurements with mouse](https://xeokit.github.io/xeokit-sdk/examples/#measurements_distance_createWithMouse)]
 * * [[Example 3: Click measurements to toggle axis wires](https://xeokit.github.io/xeokit-sdk/examples/#measurements_distance_clickToggleAxisWires)]
 *
 * ## Overview
 *
 * * A {@link DistanceMeasurement} represents a distance measurement between two 3D points.
 * * TODO
 *
 * ## Example 1: Creating a DistanceMeasurement programmatically
 *
 * In the example below, we'll use a {@link XKTLoaderPlugin} to load a model, and an DistanceMeasurementPlugin
 * to create an {@link DistanceMeasurement} on it.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#measurements_distance_modelWithMeasurements)]
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {DistanceMeasurementPlugin} from "../src/plugins/DistanceMeasurementPlugin/DistanceMeasurementPlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-2.37, 18.97, -26.12];
 * viewer.scene.camera.look = [10.97, 5.82, -11.22];
 * viewer.scene.camera.up = [0.36, 0.83, 0.40];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const distanceMeasurements = new DistanceMeasurementPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * model.on("loaded", () => {
 *
 *      const myMeasurement1 = distanceMeasurements.createMeasurement({
 *          id: "distanceMeasurement1",
 *          origin: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *              worldPos: [0.044, 5.998, 17.767]
 *          },
 *          target: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *              worldPos: [4.738, 3.172, 17.768]
 *          },
 *          visible: true,
 *          wireVisible: true
 *      });
 *
 *      const myMeasurement2 = distanceMeasurements.createMeasurement({
 *          id: "distanceMeasurement2",
 *          origin: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FNr2"],
 *              worldPos: [0.457, 2.532, 17.766]
 *          },
 *          target: {
 *              entity: viewer.scene.objects["1CZILmCaHETO8tf3SgGEXu"],
 *              worldPos: [0.436, 0.001, 22.135]
 *          },
 *          visible: true,
 *          wireVisible: true
 *      });
 *
 * });
 * ````
 *
 * ## Example 2: Creating DistanceMeasurements with mouse or touch
 *
 * DistanceMeasurementPlugin makes it easy to create {@link DistanceMeasurement}s by clicking on {@link Entity}s.
 *
 * Let's now extend our example to create an DistanceMeasurement wherever we click on the surface of of our model:
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#measurements_distance_createWithMouse)]
 *
 * ````JavaScript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {DistanceMeasurementPlugin} from "../src/plugins/DistanceMeasurementPlugin/DistanceMeasurementPlugin.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-2.37, 18.97, -26.12];
 * viewer.scene.camera.look = [10.97, 5.82, -11.22];
 * viewer.scene.camera.up = [0.36, 0.83, 0.40];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const distanceMeasurements = new DistanceMeasurementPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * distanceMeasurements.control.activate();
 * ````
 */
class DistanceMeasurementsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg]  Plugin configuration.
     * @param {String} [cfg.id="DistanceMeasurements"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg = {}) {

        super("DistanceMeasurements", viewer);

        this._control = new DistanceMeasurementsControl(this);

        this._measurements = {};

        this.labelMinAxisLength = cfg.labelMinAxisLength;
    }

    /**
     * @private
     */
    send(name, value) {

    }

    /**
     *
     * Gets the {@link DistanceMeasurementsControl}.
     *
     * @type {DistanceMeasurementsControl}
     */
    get control() {
        return this._control;
    }

    /**
     * Gets existing {@link DistanceMeasurement}s, each mapped to its {@link DistanceMeasurement#id}.
     *
     * @type {{String:DistanceMeasurement}}
     */
    get measurements() {
        return this._measurements;
    }

    /**
     *
     */
    set labelMinAxisLength(labelMinAxisLength) {
        this._labelMinAxisLength = labelMinAxisLength || 25;
    }

    get labelMinAxisLength() {
        return this._labelMinAxisLength;
    }


    /**
     * Creates a {@link DistanceMeasurement}.
     *
     * The DistanceMeasurement is then registered by {@link DistanceMeasurement#id} in {@link DistanceMeasurementsPlugin#measurements}.
     *
     * @param {Object} params {@link DistanceMeasurement} configuration.
     * @param {String} params.id Unique ID to assign to {@link DistanceMeasurement#id}. The DistanceMeasurement will be registered by this in {@link DistanceMeasurementsPlugin#measurements} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
     * @param {Number[]} params.origin.worldPos Origin World-space 3D position.
     * @param {Entity} params.origin.entity Origin Entity.
     * @param {Number[]} params.target.worldPos Target World-space 3D position.
     * @param {Entity} params.target.entity Target Entity.
     * @param {Boolean} [params.visible=true] Whether to initially show the {@link DistanceMeasurement}.
     * @param {Boolean} [params.originVisible=true] Whether to initially show the {@link DistanceMeasurement} origin.
     * @param {Boolean} [params.targetVisible=true] Whether to initially show the {@link DistanceMeasurement} target.
     * @param {Boolean} [params.wireVisible=true] Whether to initially show the direct point-to-point wire between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
     * @param {Boolean} [params.axisVisible=true] Whether to initially show the axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
     * @returns {DistanceMeasurement} The new {@link DistanceMeasurement}.
     */
    createMeasurement(params = {}) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer scene component with this ID already exists: " + params.id);
            delete params.id;
        }
        const origin = params.origin;
        const target = params.target;
        const measurement = new DistanceMeasurement(this, {
            id: params.id,
            plugin: this,
            origin: {
                entity: origin.entity,
                worldPos: origin.worldPos,
                occludable: false
            },
            target: {
                entity: target.entity,
                worldPos: target.worldPos,
                occludable: false
            },
            visible: params.visible,
            wireVisible: params.wireVisible,
            originVisible: params.originVisible,
            targetVisible: params.targetVisible,
        });
        this._measurements[measurement.id] = measurement;
        measurement.on("destroyed", () => {
            delete this._measurements[measurement.id];
        });
        return measurement;
    }

    /**
     * Destroys an\ {@link DistanceMeasurement}.
     *
     * @param {String} id ID of DistanceMeasurement to destroy.
     */
    destroyMeasurement(id) {
        const measurement = this._measurements[id];
        if (!measurement) {
            this.log("DistanceMeasurement not found: " + id);
            return;
        }
        measurement.destroy();
    }

    /**
     * Destroys all {@link DistanceMeasurement}s.
     */
    clear() {
        const ids = Object.keys(this._measurements);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroyMeasurement(ids[i]);
        }
    }

    /**
     * Destroys this DistanceMeasurementPlugin.
     *
     * Destroys all {@link DistanceMeasurement}s first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {DistanceMeasurementsPlugin}
