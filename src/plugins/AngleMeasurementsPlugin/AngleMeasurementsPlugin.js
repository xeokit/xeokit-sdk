import {Plugin} from "../../viewer/Plugin.js";
import {AngleMeasurement} from "./AngleMeasurement.js";
import {AngleMeasurementsMouseControl} from "./AngleMeasurementsMouseControl.js";

/**
 * {@link Viewer} plugin for measuring angles.
 *
 * [<img src="https://user-images.githubusercontent.com/83100/63641903-61488180-c6b6-11e9-8e00-895b9d16dc4b.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_angle_createWithMouse)
 *
 * * [[Example 1: Model with angle measurements](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_angle_modelWithMeasurements)]
 * * [[Example 2: Create angle measurements with mouse](https://xeokit.github.io/xeokit-sdk/examples/measurement/#angle_createWithMouse_snapping)]
 *
 * ## Overview
 *
 * * An {@link AngleMeasurement} shows the angle between two connected 3D line segments, given
 * as three positions on the surface(s) of one or more {@link Entity}s.
 * * As shown on the screen capture above, a AngleMeasurement has two wires that show the line segments, with a label that shows the angle between them.
 * * Create AngleMeasurements programmatically with {@link AngleMeasurementsPlugin#createMeasurement}.
 * * Create AngleMeasurements interactively using a {@link AngleMeasurementsControl}.
 * * Existing AngleMeasurements are registered by ID in {@link AngleMeasurementsPlugin#measurements}.
 * * Destroy AngleMeasurements using {@link AngleMeasurementsPlugin#destroyMeasurement}.
 * * Configure global measurement units and scale via {@link Metrics}, located at {@link Scene#metrics}
 *
 * ## Example 1: Creating AngleMeasurements Programmatically
 *
 * In our first example, we'll use an {@link XKTLoaderPlugin} to load a model, and then use a AngleMeasurementsPlugin to programmatically create two {@link AngleMeasurement}s.
 *
 * Note how each AngleMeasurement has ````origin````, ````corner```` and  ````target````, which each indicate a 3D World-space
 * position on the surface of an {@link Entity}. These can be aon the same Entity, or on different Entitys.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_angle_modelWithMeasurements)]
 *
 * ````JavaScript
 * import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin} from "xeokit-sdk.es.js";
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
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * model.on("loaded", () => {
 *
 *      const myMeasurement1 = angleMeasurements.createMeasurement({
 *          id: "myAngleMeasurement1",
 *          origin: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *              worldPos: [0.044, 5.998, 17.767]
 *          },
 *          corner: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *              worldPos: [0.044, 5.998, 17.767]
 *          },
 *          target: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FLOH"],
 *              worldPos: [4.738, 3.172, 17.768]
 *          },
 *          visible: true
 *      });
 *
 *      const myMeasurement2 = angleMeasurements.createMeasurement({
 *          id: "myAngleMeasurement2",
 *          origin: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FNr2"],
 *              worldPos: [0.457, 2.532, 17.766]
 *          },
 *          corner: {
 *              entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FNr2"],
 *              worldPos: [0.457, 2.532, 17.766]
 *          },
 *          target: {
 *              entity: viewer.scene.objects["1CZILmCaHETO8tf3SgGEXu"],
 *              worldPos: [0.436, 0.001, 22.135]
 *          },
 *          visible: true
 *      });
 * });
 * ````
 *
 * ## Example 2: Creating AngleMeasurements with Mouse Input
 *
 * In our second example, we'll use an {@link XKTLoaderPlugin} to load a model, then we'll use the AngleMeasurementsPlugin's {@link AngleMeasurementsTouchControl} to interactively create {@link AngleMeasurement}s with mouse or touch input.
 *
 * After we've activated the AngleMeasurementsControl, the first click on any {@link Entity} begins constructing a AngleMeasurement, fixing its
 * origin to that Entity. The next click on any Entity will fix the AngleMeasurement's corner, and the next click after
 * that will fix its target and complete the AngleMeasurement.
 *
 * The AngleMeasurementControl will then wait for the next click on any Entity, to begin constructing
 * another AngleMeasurement, and so on, until deactivated again.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#angle_createWithMouse_snapping)]
 *
 * ````JavaScript
 * import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsMouseControl, PointerLens} from "xeokit-sdk.es.js";
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
 * cconst angleMeasurementsMouseControl  = new AngleMeasurementsMouseControl(angleMeasurements, {
 *     pointerLens : new PointerLens(viewer)
 * })
 *
 * angleMeasurementsMouseControl.snapToVertex = true;
 * angleMeasurementsMouseControl.snapToEdge = true;
 *
 * angleMeasurementsMouseControl.activate();
 * ````
 *
 * ## Example 4: Attaching Mouse Handlers
 *
 * In our fourth example, we'll attach even handlers to our plugin, to catch when the user
 * hovers or right-clicks over our measurements.
 *
 * [[Run example](/examples/measurement/#angle_modelWithMeasurements)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin} from "xeokit-sdk.es.js";
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
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * angleMeasurements.on("mouseOver", (e) => {
 *     e.measurement.setHighlighted(true);
 * });
 *
 * angleMeasurements.on("mouseLeave", (e) => {
 *     e.measurement.setHighlighted(false);
 * });
 *
 * angleMeasurements.on("contextMenu", (e) => {
 *     // Show context menu
 *     e.event.preventDefault();
 * });
 *
 * const model = xktLoader.load({
 *      src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * model.on("loaded", () => {
 *
 *       angleMeasurementsPlugin.createMeasurement({
 *             id: "angleMeasurement1",
 *             origin: {
 *                 entity: viewer.scene.objects["1CZILmCaHETO8tf3SgGEXu"],
 *                 worldPos: [0.4158603637281142, 2.5193106917110457, 17.79972838299403]
 *             },
 *             corner: {
 *                 entity: viewer.scene.objects["1CZILmCaHETO8tf3SgGEXu"],
 *                 worldPos: [0.41857741956197625,0.0987169929481646,17.799763071093395]
 *             },
 *             target: {
 *                 entity: viewer.scene.objects["1CZILmCaHETO8tf3SgGEXu"],
 *                 worldPos: [5.235526066859247, 0.11580773869801986, 17.824891550941565]
 *             },
 *             visible: true
 *         });
 *
 *         angleMeasurementsPlugin.createMeasurement({
 *             id: "angleMeasurement2",
 *             origin: {
 *                 entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FNr2"],
 *                 worldPos: [-0.00003814187850181838, 5.9996748076205115,17.79996871551525]
 *             },
 *             corner: {
 *                 entity: viewer.scene.objects["2O2Fr$t4X7Zf8NOew3FNqI"],
 *                 worldPos: [-0.0005214119318139865, 3.1010044228517595, 17.787656604483363]
 *
 *             },
 *             target: {
 *                 entity: viewer.scene.objects["1s1jVhK8z0pgKYcr9jt7AB"],
 *                 worldPos: [ 8.380657312957396, 3.1055697628459553, 17.799220108187185]
 *             },
 *             visible: true
 *         });
 * });
 * ````
 *
 * ## Example 5: Creating AngleMeasurements with Touch Input
 *
 * In our fifth example, we'll show how to create angle measurements with touch input, with snapping
 * to the nearest vertex or edge. While creating the measurements, a long-touch when setting the
 * start, corner or end point will cause the point to snap to the nearest vertex or edge. A quick
 * touch-release will immediately set the point at the tapped position on the object surface.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#angle_createWithTouch_snapping)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsTouchControl} from "xeokit-sdk.es.js";
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
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const angleMeasurementsTouchControl  = new AngleMeasurementsTouchControl(angleMeasurements, {
 *     pointerLens : new PointerLens(viewer),
 *     snapToVertex: true,
 *     snapToEdge: true
 * })
 *
 * angleMeasurementsTouchControl.activate();
 * ````
 */
export class AngleMeasurementsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg]  Plugin configuration.
     * @param {String} [cfg.id="AngleMeasurements"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {HTMLElement} [cfg.container] Container DOM element for markers and labels. Defaults to ````document.body````.
     * @param {string} [cfg.defaultColor=null] The default color of the dots, wire and label.
     * @param {boolean} [cfg.defaultLabelsVisible=true] The default value of {@link AngleMeasurement.labelsVisible}.
     * @param {number} [cfg.zIndex] If set, the wires, dots and labels will have this zIndex (+1 for dots and +2 for labels).
     * @param {PointerCircle} [cfg.pointerLens] A PointerLens to help the user position the pointer. This can be shared with other plugins.
     */
    constructor(viewer, cfg = {}) {

        super("AngleMeasurements", viewer);

        this._container = cfg.container || document.body;

        this._defaultControl = null;

        this._measurements = {};

        this.defaultColor = cfg.defaultColor !== undefined ? cfg.defaultColor : "#00BBFF";
        this.defaultLabelsVisible = cfg.defaultLabelsVisible !== false;
        this.zIndex = cfg.zIndex || 10000;

        this._onMouseOver = (event, measurement) => {
            this.fire("mouseOver", {
                plugin: this,
                angleMeasurement: measurement,
                measurement,
                event
            });
        }

        this._onMouseLeave = (event, measurement) => {
            this.fire("mouseLeave", {
                plugin: this,
                angleMeasurement: measurement,
                measurement,
                event
            });
        };

        this._onContextMenu = (event, measurement) => {
            this.fire("contextMenu", {
                plugin: this,
                angleMeasurement: measurement,
                measurement,
                event
            });
        };
    }

    /**
     * Gets the plugin's HTML container element, if any.
     * @returns {*|HTMLElement|HTMLElement}
     */
    getContainerElement() {
        return this._container;
    }


    /**
     * @private
     */
    send(name, value) {

    }

    /**
     * Gets the default {@link AngleMeasurementsMouseControl}.
     *
     * @type {AngleMeasurementsMouseControl}
     * @deprecated
     */
    get control() {
        if (!this._defaultControl) {
            this._defaultControl = new AngleMeasurementsMouseControl(this, {});
        }
        return this._defaultControl;
    }

    /**
     * Gets the existing {@link AngleMeasurement}s, each mapped to its {@link AngleMeasurement#id}.
     *
     * @type {{String:AngleMeasurement}}
     */
    get measurements() {
        return this._measurements;
    }

    /**
     * Creates an {@link AngleMeasurement}.
     *
     * The AngleMeasurement is then registered by {@link AngleMeasurement#id} in {@link AngleMeasurementsPlugin#measurements}.
     *
     * @param {Object} params {@link AngleMeasurement} configuration.
     * @param {String} params.id Unique ID to assign to {@link AngleMeasurement#id}. The AngleMeasurement will be registered by this in {@link AngleMeasurementsPlugin#measurements} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
     * @param {Number[]} params.origin.worldPos Origin World-space 3D position.
     * @param {Entity} params.origin.entity Origin Entity.
     * @param {Number[]} params.corner.worldPos Corner World-space 3D position.
     * @param {Entity} params.corner.entity Corner Entity.
     * @param {Number[]} params.target.worldPos Target World-space 3D position.
     * @param {Entity} params.target.entity Target Entity.
     * @param {Boolean} [params.visible=true] Whether to initially show the {@link AngleMeasurement}.
     * @returns {AngleMeasurement} The new {@link AngleMeasurement}.
     */
    createMeasurement(params = {}) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer scene component with this ID already exists: " + params.id);
            delete params.id;
        }
        const origin = params.origin;
        const corner = params.corner;
        const target = params.target;
        const measurement = new AngleMeasurement(this, {
            id: params.id,
            plugin: this,
            container: this._container,
            origin: {
                entity: origin.entity,
                worldPos: origin.worldPos
            },
            corner: {
                entity: corner.entity,
                worldPos: corner.worldPos
            },
            target: {
                entity: target.entity,
                worldPos: target.worldPos
            },

            visible: params.visible,
            originVisible: true,
            originWireVisible: true,
            cornerVisible: true,
            targetWireVisible: true,
            targetVisible: true,
            onMouseOver: this._onMouseOver,
            onMouseLeave: this._onMouseLeave,
            onContextMenu: this._onContextMenu
        });
        this._measurements[measurement.id] = measurement;
        measurement.on("destroyed", () => {
            delete this._measurements[measurement.id];
        });
        measurement.clickable = true;
        this.fire("measurementCreated", measurement);
        return measurement;
    }

    /**
     * Destroys a {@link AngleMeasurement}.
     *
     * @param {String} id ID of AngleMeasurement to destroy.
     */
    destroyMeasurement(id) {
        const measurement = this._measurements[id];
        if (!measurement) {
            this.log("AngleMeasurement not found: " + id);
            return;
        }
        measurement.destroy();
        this.fire("measurementDestroyed", measurement);
    }

    /**
     * Shows all or hides the angle label of each {@link AngleMeasurement}.
     *
     * @param {Boolean} labelsShown Whether or not to show the labels.
     */
    setLabelsShown(labelsShown) {
        for (const [key, measurement] of Object.entries(this.measurements)) {
            measurement.labelShown = labelsShown;
        }
    }

    /**
     * Destroys all {@link AngleMeasurement}s.
     */
    clear() {
        const ids = Object.keys(this._measurements);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroyMeasurement(ids[i]);
        }
    }

    /**
     * Destroys this AngleMeasurementsPlugin.
     *
     * Destroys all {@link AngleMeasurement}s first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

