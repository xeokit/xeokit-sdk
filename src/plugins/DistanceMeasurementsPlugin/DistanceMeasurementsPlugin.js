import { Plugin } from "../../viewer/Plugin.js";
import { DistanceMeasurement } from "./DistanceMeasurement.js";
import { DistanceMeasurementsMouseControl } from "./DistanceMeasurementsMouseControl.js";

/**
 * {@link Viewer} plugin for measuring point-to-point distances.
 *
 * [<img src="https://user-images.githubusercontent.com/83100/63047331-867a0a80-bed4-11e9-892f-398740013c5f.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_distance_createWithMouse)
 *
 * * [[Example 1: Model with distance measurements](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_distance_modelWithMeasurements)]
 * * [[Example 2: Create distance measurements with mouse](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_createWithMouse_snapping)]
 * * [[Example 3: Configuring units and scale](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_unitsAndScale)
 *
 * ## Overview
 *
 * * A {@link DistanceMeasurement} represents a point-to-point measurement between two 3D points on one or two {@link Entity}s.
 * * As shown on the screen capture above, a DistanceMeasurement has one wire (light blue) that shows the direct point-to-point measurement,
 * and three more wires (red, green and blue) that show the distance on each of the World-space X, Y and Z axis.
 * * Create DistanceMeasurements programmatically with {@link DistanceMeasurementsPlugin#createMeasurement}.
 * * Create DistanceMeasurements interactively using a {@link DistanceMeasurementsControl}.
 * * Existing DistanceMeasurements are registered by ID in {@link DistanceMeasurementsPlugin#measurements}.
 * * Destroy DistanceMeasurements using {@link DistanceMeasurementsPlugin#destroyMeasurement}.
 * * Configure global measurement units and scale via {@link Metrics}, located at {@link Scene#metrics}.
 *
 * ## Example 1: Creating DistanceMeasurements Programmatically
 *
 * In our first example, we'll use an {@link XKTLoaderPlugin} to load a model, and then use a DistanceMeasurementsPlugin to programmatically create two {@link DistanceMeasurement}s.
 *
 * Note how each DistanceMeasurement has ````origin```` and ````target```` endpoints, which each indicate a 3D World-space
 * position on the surface of an {@link Entity}. The endpoints can be attached to the same Entity, or to different Entitys.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_modelWithMeasurements)]
 *
 * ````JavaScript
 * import {Viewer, XKTLoaderPlugin, DistanceMeasurementsPlugin} from "xeokit-sdk.es.js";
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
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
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
 * });
 * ````
 *
 * ## Example 2: Creating DistanceMeasurements with Mouse Input
 *
 * In our second example, we'll use an {@link XKTLoaderPlugin} to load a model, then we'll use a
 * {@link DistanceMeasurementsMouseControl} to interactively create {@link DistanceMeasurement}s with mouse input.
 *
 * After we've activated the DistanceMeasurementsMouseControl, the first click on any {@link Entity} begins constructing a DistanceMeasurement, fixing its
 * origin to that Entity. The next click on any Entity will complete the DistanceMeasurement, fixing its target to that second Entity.
 *
 * The DistanceMeasurementsMouseControl will then wait for the next click on any Entity, to begin constructing
 * another DistanceMeasurement, and so on, until deactivated again.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_createWithMouse_snapping)]
 *
 * ````JavaScript
 * import {Viewer, XKTLoaderPlugin, DistanceMeasurementsPlugin, DistanceMeasurementsMouseControl, PointerLens} from "xeokit-sdk.es.js";
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
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
 *
 * const distanceMeasurementsControl  = new DistanceMeasurementsMouseControl(distanceMeasurements, {
 *     pointerLens : new PointerLens(viewer)
 * })
 *
 * distanceMeasurementsControl.snapToVertex = true;
 * distanceMeasurementsControl.snapToEdge = true;
 *
 * distanceMeasurementsControl.activate();
 *
 * const model = xktLoader.load({
 *     src: "./models/xkt/duplex/duplex.xkt"
 * });
 * ````
 *
 * ## Example 3: Configuring Measurement Units and Scale
 *
 * In our third example, we'll use the  {@link Scene}'s {@link Metrics} to set the global unit of measurement to ````"meters"````. We'll also specify that a unit within the World-space coordinate system represents ten meters.
 *
 * The wires belonging to our DistanceMeasurements show their lengths in Real-space coordinates, in the current unit of measurement. They will dynamically update as we set these configurations.
 *
 * * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_distance_unitsAndScale)]
 *
 * ````JavaScript
 * const metrics = viewer.scene.metrics;

 * metrics.units = "meters";
 * metrics.scale = 10.0;
 * ````
 *
 * ## Example 4: Attaching Mouse Handlers
 *
 * In our fourth example, we'll attach event handlers to our plugin, to catch when the user
 * hovers or right-clicks over our measurements.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/index.html#measurements_distance_modelWithMeasurements)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, DistanceMeasurementsPlugin, DistanceMeasurementsMouseControl, PointerLens} from "xeokit-sdk.es.js";
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
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
 *
 * const distanceMeasurementsControl  = new DistanceMeasurementsMouseControl(distanceMeasurements, {
 *     pointerLens : new PointerLens(viewer)
 * })
 *
 * distanceMeasurementsControl.snapToVertex = true;
 * distanceMeasurementsControl.snapToEdge = true;
 *
 * distanceMeasurementsControl.activate();
 *
 * distanceMeasurements.on("mouseOver", (e) => {
 *     e.measurement.setHighlighted(true);
 * });
 *
 * distanceMeasurements.on("mouseLeave", (e) => {
 *     e.measurement.setHighlighted(false);
 * });
 *
 * distanceMeasurements.on("contextMenu", (e) => {
 *     // Show context menu
 *     e.event.preventDefault();
 * });
 *
 * const model = xktLoader.load({
 *      src: "Duplex.xkt"
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
 * });
 * ````
 *
 * ## Example 5: Creating DistanceMeasurements with Touch Input
 *
 * In our fifth example, we'll show how to create distance measurements with touch input, with snapping
 * to the nearest vertex or edge. While creating the measurements, a long-touch when setting the
 * start or end point will cause the point to snap to the nearest vertex or edge. A quick
 * touch-release will immediately set the point at the tapped position on the object surface.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/measurement/#distance_createWithTouch_snapping)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, DistanceMeasurementsPlugin, DistanceMeasurementsTouchControl} from "xeokit-sdk.es.js";
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
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      src: "./models/xkt/duplex/duplex.xkt"
 * });
 *
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
 *
 * const distanceMeasurementsTouchControl  = new DistanceMeasurementsTouchControl(distanceMeasurements, {
 *     pointerLens : new PointerLens(viewer),
 *     snapToVertex: true,
 *     snapToEdge: true
 * })
 *
 * distanceMeasurementsTouchControl.activate();
 * ````
 */
class DistanceMeasurementsPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {Object} [cfg]  Plugin configuration.
   * @param {String} [cfg.id="DistanceMeasurements"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
   * @param {Number} [cfg.labelMinAxisLength=25] The minimum length, in pixels, of an axis wire beyond which its label is shown.
   * @param {HTMLElement} [cfg.container] Container DOM element for markers and labels. Defaults to ````document.body````.
   * @param {boolean} [cfg.defaultVisible=true] The default value of the DistanceMeasurements `visible` property.
   * @param {boolean} [cfg.defaultOriginVisible=true] The default value of the DistanceMeasurements `originVisible` property.
   * @param {boolean} [cfg.defaultTargetVisible=true] The default value of the DistanceMeasurements `targetVisible` property.
   * @param {boolean} [cfg.defaultWireVisible=true] The default value of the DistanceMeasurements `wireVisible` property.
   * @param {boolean} [cfg.defaultLabelsVisible=true] The default value of the DistanceMeasurements `labelsVisible` property.
   * @param {boolean} [cfg.defaultXLabelEnabled=true] The default value of the DistanceMeasurements `xLabelEnabled` property.
   * @param {boolean} [cfg.defaultYLabelEnabled=true] The default value of the DistanceMeasurements `yLabelEnabled` property.
   * @param {boolean} [cfg.defaultZLabelEnabled=true] The default value of the DistanceMeasurements `zLabelEnabled` property.
   * @param {boolean} [cfg.defaultLengthLabelEnabled=true] The default value of the DistanceMeasurements `lengthLabelEnabled` property.
   * @param {boolean} [cfg.defaultAxisVisible=true] The default value of the DistanceMeasurements `axisVisible` property.
   * @param {boolean} [cfg.defaultXAxisVisible=true] The default value of the DistanceMeasurements `xAxisVisible` property.
   * @param {boolean} [cfg.defaultYAxisVisible=true] The default value of the DistanceMeasurements `yAxisVisible` property.
   * @param {boolean} [cfg.defaultZAxisVisible=true] The default value of the DistanceMeasurements `zAxisVisible` property.
   * @param {boolean} [cfg.useRotationAdjustment=false] The default value of DistanceMeasurements `useRotationAdjustment` property.
   * @param {string} [cfg.defaultColor=#00BBFF] The default color of the length dots, wire and label.
   * @param {number} [cfg.zIndex] If set, the wires, dots and labels will have this zIndex (+1 for dots and +2 for labels).
   * @param {boolean} [cfg.defaultLabelsOnWires=true] The default value of the DistanceMeasurements `labelsOnWires` property.
   * @param {PointerCircle} [cfg.pointerLens] A PointerLens to help the user position the pointer. This can be shared with other plugins.
   */
  constructor(viewer, cfg = {}) {
    super("DistanceMeasurements", viewer);

    this._pointerLens = cfg.pointerLens;

    this._container = cfg.container || document.body;

    this._defaultControl = null;

    this._measurements = {};

    this.labelMinAxisLength = cfg.labelMinAxisLength;
    this.defaultVisible = cfg.defaultVisible !== false;
    this.defaultOriginVisible = cfg.defaultOriginVisible !== false;
    this.defaultTargetVisible = cfg.defaultTargetVisible !== false;
    this.defaultWireVisible = cfg.defaultWireVisible !== false;
    this.defaultXLabelEnabled = cfg.defaultXLabelEnabled !== false;
    this.defaultYLabelEnabled = cfg.defaultYLabelEnabled !== false;
    this.defaultZLabelEnabled = cfg.defaultZLabelEnabled !== false;
    this.defaultLengthLabelEnabled = cfg.defaultLengthLabelEnabled !== false;
    this.defaultLabelsVisible = cfg.defaultLabelsVisible !== false;
    this.defaultAxisVisible = cfg.defaultAxisVisible !== false;
    this.defaultXAxisVisible = cfg.defaultXAxisVisible !== false;
    this.defaultYAxisVisible = cfg.defaultYAxisVisible !== false;
    this.defaultZAxisVisible = cfg.defaultZAxisVisible !== false;
    this.defaultColor =cfg.defaultColor !== undefined ? cfg.defaultColor : "#00BBFF";
    this.zIndex = cfg.zIndex || 10000;
    this.defaultLabelsOnWires = cfg.defaultLabelsOnWires !== false;
    this.useRotationAdjustment = cfg.useRotationAdjustment !== undefined ? cfg.useRotationAdjustment !== false : false;

    this._onMouseOver = (event, measurement) => {
      this.fire("mouseOver", {
        plugin: this,
        distanceMeasurement: measurement,
        measurement,
        event,
      });
    };

    this._onMouseLeave = (event, measurement) => {
      this.fire("mouseLeave", {
        plugin: this,
        distanceMeasurement: measurement,
        measurement,
        event,
      });
    };

    this._onContextMenu = (event, measurement) => {
      this.fire("contextMenu", {
        plugin: this,
        distanceMeasurement: measurement,
        measurement,
        event,
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
  send(name, value) {}

  /**
   * Gets the PointerLens attached to this DistanceMeasurementsPlugin.
   * @returns {PointerCircle}
   */
  get pointerLens() {
    return this._pointerLens;
  }

  /**
   * Gets the default {@link DistanceMeasurementsControl}.
   *
   * @type {DistanceMeasurementsControl}
   * @deprecated
   */
  get control() {
    if (!this._defaultControl) {
      this._defaultControl = new DistanceMeasurementsMouseControl(this, {});
    }
    return this._defaultControl;
  }

  /**
   * Gets the existing {@link DistanceMeasurement}s, each mapped to its {@link DistanceMeasurement#id}.
   *
   * @type {{String:DistanceMeasurement}}
   */
  get measurements() {
    return this._measurements;
  }

  /**
   * Sets the minimum length, in pixels, of an axis wire beyond which its label is shown.
   *
   * The axis wire's label is not shown when its length is less than this value.
   *
   * This is ````25```` pixels by default.
   *
   * Must not be less than ````1````.
   *
   * @type {number}
   */
  set labelMinAxisLength(labelMinAxisLength) {
    if (labelMinAxisLength < 1) {
      this.error("labelMinAxisLength must be >= 1; defaulting to 25");
      labelMinAxisLength = 25;
    }
    this._labelMinAxisLength = labelMinAxisLength || 25;
  }

  /**
   * Gets the minimum length, in pixels, of an axis wire beyond which its label is shown.
   * @returns {number}
   */
  get labelMinAxisLength() {
    return this._labelMinAxisLength;
  }

  /**
   * Sets whether the measurement added is rotation adjusted or not.
   *
   * @type {boolean}
   */
  set useRotationAdjustment(_useRotationAdjustment) {
    _useRotationAdjustment = _useRotationAdjustment !== undefined ? Boolean(_useRotationAdjustment) : false;
    this._useRotationAdjustment = _useRotationAdjustment;
  }

  /**
   * Gets whether the measurement added is rotation adjusted or not.
   * @returns {number}
   */
  get useRotationAdjustment(){
    return this._useRotationAdjustment;
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
   * @param {Boolean} [params.xAxisVisible=true] Whether to initially show the X-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
   * @param {Boolean} [params.yAxisVisible=true] Whether to initially show the Y-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
   * @param {Boolean} [params.zAxisVisible=true] Whether to initially show the Z-axis-aligned wires between {@link DistanceMeasurement#origin} and {@link DistanceMeasurement#target}.
   * @param {Boolean} [params.xLabelEnabled=true] Whether to initially show the x label.
   * @param {Boolean} [params.yLabelEnabled=true] Whether to initially show the y label.
   * @param {Boolean} [params.zLabelEnabled=true] Whether to initially show the z label.
   * @param {Boolean} [params.lengthLabelEnabled=true] Whether to initially show the length label.
   * @param {Boolean} [params.labelsVisible=true] Whether to initially show the labels.
   * @param {Boolean} [params.lengthLabelVisible=true] Whether to initially show the labels.
   * @param {string} [params.color] The color of the length dot, wire and label.
   * @param {Boolean} [params.labelsOnWires=true] Determines if labels will be set on wires or one below the other.
   * @returns {DistanceMeasurement} The new {@link DistanceMeasurement}.
   */
  createMeasurement(params = {}) {
    if (this.viewer.scene.components[params.id]) {
      this.error(
        "Viewer scene component with this ID already exists: " + params.id
      );
      delete params.id;
    }
    const origin = params.origin;
    const target = params.target;
    const measurement = new DistanceMeasurement(this, {
      id: params.id,
      plugin: this,
      container: this._container,
      origin: {
        entity: origin.entity,
        worldPos: origin.worldPos,
      },
      target: {
        entity: target.entity,
        worldPos: target.worldPos,
      },
      visible: params.visible,
      wireVisible: params.wireVisible,
      axisVisible: params.axisVisible !== false && this.defaultAxisVisible !== false,
      xAxisVisible: params.xAxisVisible !== false && this.defaultXAxisVisible !== false,
      yAxisVisible: params.yAxisVisible !== false && this.defaultYAxisVisible !== false,
      zAxisVisible: params.zAxisVisible !== false && this.defaultZAxisVisible !== false,
      xLabelEnabled: params.xLabelEnabled !== false && this.defaultXLabelEnabled !== false,
      yLabelEnabled: params.yLabelEnabled !== false && this.defaultYLabelEnabled !== false,
      zLabelEnabled: params.zLabelEnabled !== false && this.defaultZLabelEnabled !== false,
      lengthLabelEnabled: params.lengthLabelEnabled !== false && this.defaultLengthLabelEnabled !== false,
      labelsVisible: params.labelsVisible !== false && this.defaultLabelsVisible !== false,
      useRotationAdjustment: this.useRotationAdjustment,
      originVisible: params.originVisible,
      targetVisible: params.targetVisible,
      color: params.color,
      labelsOnWires:params.labelsOnWires !== false && this.defaultLabelsOnWires !== false,
      onMouseOver: this._onMouseOver,
      onMouseLeave: this._onMouseLeave,
      onContextMenu: this._onContextMenu,
    });
    this._measurements[measurement.id] = measurement;
    measurement.clickable = true;
    measurement.on("destroyed", () => {
      delete this._measurements[measurement.id];
    });
    this.fire("measurementCreated", measurement);
    return measurement;
  }

  /**
   * Destroys a {@link DistanceMeasurement}.
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
    this.fire("measurementDestroyed", measurement);
  }

  /**
   * Shows all or hides the distance label of each {@link DistanceMeasurement}.
   *
   * @param {Boolean} labelsShown Whether or not to show the labels.
   */
  setLabelsShown(labelsShown) {
    for (const [key, measurement] of Object.entries(this.measurements)) {
      measurement.labelShown = labelsShown;
    }
  }

  /**
   * Shows all or hides the axis wires of each {@link DistanceMeasurement}.
   *
   * @param {Boolean} labelsShown Whether or not to show the axis wires.
   */
  setAxisVisible(axisVisible) {
    for (const [key, measurement] of Object.entries(this.measurements)) {
      measurement.axisVisible = axisVisible;
    }
    this.defaultAxisVisible = axisVisible;
  }

  /**
   * Gets if the axis wires of each {@link DistanceMeasurement} are visible.
   *
   * @returns {Boolean} Whether or not the axis wires are visible.
   */
  getAxisVisible() {
    return this.defaultAxisVisible;
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
   * Destroys this DistanceMeasurementsPlugin.
   *
   * Destroys all {@link DistanceMeasurement}s first.
   */
  destroy() {
    this.clear();
    super.destroy();
  }
}

export { DistanceMeasurementsPlugin };
