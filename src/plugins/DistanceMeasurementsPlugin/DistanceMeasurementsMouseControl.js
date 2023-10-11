import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";
import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";

const MOUSE_FIRST_CLICK_EXPECTED = 0;
const MOUSE_SECOND_CLICK_EXPECTED = 1;

/**
 * Creates {@link DistanceMeasurement}s in a {@link DistanceMeasurementsPlugin} from mouse input.
 *
 * ## Usage
 *
 * [[Run example](/examples/measurement/#distance_createWithMouse_snapping)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, DistanceMeasurementsPlugin, DistanceMeasurementsMouseControl, PointerLens} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.039];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "Duplex.xkt"
 * });
 *
 * const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
 *
 * const distanceMeasurementsControl  = new DistanceMeasurementsMouseControl(DistanceMeasurements, {
 *     pointerLens: new PointerLens(viewer)
 * })
 *
 * distanceMeasurementsControl.snapToVertex = true;
 * distanceMeasurementsControl.snapToEdge = true;
 *
 * distanceMeasurementsControl.activate();
 * ````
 */
export class DistanceMeasurementsMouseControl  extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsMouseControl bound to the given DistanceMeasurementsPlugin.
     */
    constructor(distanceMeasurementsPlugin, cfg = {}) {

        super(distanceMeasurementsPlugin.viewer.scene);

        this.pointerLens = cfg.pointerLens;

        this._active = false;

        const markerDiv = document.createElement('div');
        const canvas = this.scene.canvas.canvas;
        canvas.parentNode.insertBefore(markerDiv, canvas);
        markerDiv.style.background = "black";
        markerDiv.style.border = "2px solid blue";
        markerDiv.style.borderRadius = "10px";
        markerDiv.style.width = "5px";
        markerDiv.style.height = "5px";
        markerDiv.style.margin = "-200px -200px";
        markerDiv.style.zIndex = "100";
        markerDiv.style.position = "absolute";
        markerDiv.style.pointerEvents = "none";

        this._markerDiv = markerDiv;

        this._currentDistanceMeasurement = null;

        this._currentDistanceMeasurementInitState = {
            wireVisible: null,
            axisVisible: null,
            xAxisVisible: null,
            yaxisVisible: null,
            zAxisVisible: null,
            targetVisible: null,
        }

        this._onCameraControlHoverSnapOrSurface = null;
        this._onCameraControlHoverSnapOrSurfaceOff = null;
        this._onInputMouseDown = null;
        this._onInputMouseUp = null;
        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;
        this._snapToEdge = cfg.snapToEdge !== false;
        this._snapToVertex = cfg.snapToVertex !== false;
        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;

        this._attachPlugin(distanceMeasurementsPlugin, cfg);
    }

    _attachPlugin(distanceMeasurementsPlugin, cfg = {}) {

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsMouseControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.distanceMeasurementsPlugin = distanceMeasurementsPlugin;

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsMouseControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = distanceMeasurementsPlugin;
    }

    /**
     * Gets if this DistanceMeasurementsMouseControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this DistanceMeasurementsMouseControl is active.
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex is enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @param {boolean} snapToVertex Whether to enable snap-to-vertex for this DistanceMeasurementsMouseControl.
     */
    set snapToVertex(snapToVertex) {
        this._snapToVertex = snapToVertex;
    }

    /**
     * Gets whether snap-to-vertex is enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex is enabled for this DistanceMeasurementsMouseControl.
     */
    get snapToVertex() {
        return this._snapToVertex;
    }

    /**
     * Sets whether snap-to-edge is enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @param snapToEdge {boolean} snapToEdge Whether to enable snap-to-edge for this DistanceMeasurementsMouseControl.
     */
    set snapToEdge(snapToEdge) {
        this._snapToEdge = snapToEdge;
    }

    /**
     * Gets whether snap-to-edge is enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     */
    get snapToEdge() {
        return this._snapToEdge;
    }

    /**
     * Activates this DistanceMeasurementsMouseControl, ready to respond to input.
     */
    activate() {

        if (this._active) {
            return;
        }

        const distanceMeasurementsPlugin = this.distanceMeasurementsPlugin;
        const scene = this.scene;
        const cameraControl = distanceMeasurementsPlugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;
        const input = scene.input;
        let mouseHovering = false;
        const pointerWorldPos = math.vec3();
        const pointerCanvasPos = math.vec2();
        let pointerDownCanvasX;
        let pointerDownCanvasY;
        const clickTolerance = 20;

        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;

        this._onCameraControlHoverSnapOrSurface = cameraControl.on("hoverSnapOrSurface", event => {
            mouseHovering = true;
            pointerWorldPos.set(event.worldPos);
            pointerCanvasPos.set(event.canvasPos);
            if (this._mouseState === MOUSE_FIRST_CLICK_EXPECTED) {
                this._markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
                this._markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
                this._markerDiv.style.background = "pink";
                if (event.snappedToVertex || event.snappedToEdge) {
                    if (this.pointerLens) {
                        this.pointerLens.visible = true;
                        this.pointerLens.centerPos = event.cursorPos || event.canvasPos;
                        this.pointerLens.cursorPos = event.canvasPos;
                        this.pointerLens.snapped = true;
                    }
                    this._markerDiv.style.background = "greenyellow";
                    this._markerDiv.style.border = "2px solid green";
                } else {
                    if (this.pointerLens) {
                        this.pointerLens.visible = true;
                        this.pointerLens.centerPos = event.cursorPos || event.canvasPos;
                        this.pointerLens.cursorPos = event.canvasPos;
                        this.pointerLens.snapped = false;
                    }
                    this._markerDiv.style.background = "pink";
                    this._markerDiv.style.border = "2px solid red";
                }
            } else {
                this._markerDiv.style.marginLeft = `-10000px`;
                this._markerDiv.style.marginTop = `-10000px`;
            }
            canvas.style.cursor = "pointer";
            if (this._currentDistanceMeasurement) {
                this._currentDistanceMeasurement.wireVisible = this._currentDistanceMeasurementInitState.wireVisible;
                this._currentDistanceMeasurement.axisVisible = this._currentDistanceMeasurementInitState.axisVisible && this.distanceMeasurementsPlugin.defaultAxisVisible;
                this._currentDistanceMeasurement.xAxisVisible = this._currentDistanceMeasurementInitState.xAxisVisible && this.distanceMeasurementsPlugin.defaultXAxisVisible;
                this._currentDistanceMeasurement.yAxisVisible = this._currentDistanceMeasurementInitState.yAxisVisible && this.distanceMeasurementsPlugin.defaultYAxisVisible;
                this._currentDistanceMeasurement.zAxisVisible = this._currentDistanceMeasurementInitState.zAxisVisible && this.distanceMeasurementsPlugin.defaultZAxisVisible;
                this._currentDistanceMeasurement.targetVisible = this._currentDistanceMeasurementInitState.targetVisible;
                this._currentDistanceMeasurement.target.worldPos = pointerWorldPos.slice();
                this._markerDiv.style.marginLeft = `-10000px`;
                this._markerDiv.style.marginTop = `-10000px`;
            }
        });


        this._onInputMouseDown = input.on("mousedown", (coords) => {
            pointerDownCanvasX = coords[0];
            pointerDownCanvasY = coords[1];
        });

        this._onInputMouseUp = input.on("mouseup", (coords) => {
            if (coords[0] > pointerDownCanvasX + clickTolerance ||
                coords[0] < pointerDownCanvasX - clickTolerance ||
                coords[1] > pointerDownCanvasY + clickTolerance ||
                coords[1] < pointerDownCanvasY - clickTolerance) {
                return;
            }
            if (this._currentDistanceMeasurement) {
                if (mouseHovering) {
                    this._currentDistanceMeasurement.clickable = true;
                    this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                    this._currentDistanceMeasurement = null;
                } else {
                    this._currentDistanceMeasurement.destroy();
                    this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
                    this._currentDistanceMeasurement = null;
                }
            } else {
                if (mouseHovering) {
                    this._currentDistanceMeasurement = distanceMeasurementsPlugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            worldPos: pointerWorldPos.slice()
                        },
                        target: {
                            worldPos: pointerWorldPos.slice()
                        },
                        approximate: true
                    });
                    this._currentDistanceMeasurementInitState.axisVisible = this._currentDistanceMeasurement.axisVisible && this.distanceMeasurementsPlugin.defaultAxisVisible;
                    this._currentDistanceMeasurementInitState.xAxisVisible = this._currentDistanceMeasurement.xAxisVisible && this.distanceMeasurementsPlugin.defaultXAxisVisible;
                    this._currentDistanceMeasurementInitState.yAxisVisible = this._currentDistanceMeasurement.yAxisVisible && this.distanceMeasurementsPlugin.defaultYAxisVisible;
                    this._currentDistanceMeasurementInitState.zAxisVisible = this._currentDistanceMeasurement.zAxisVisible && this.distanceMeasurementsPlugin.defaultZAxisVisible;
                    this._currentDistanceMeasurementInitState.wireVisible = this._currentDistanceMeasurement.wireVisible;
                    this._currentDistanceMeasurementInitState.targetVisible = this._currentDistanceMeasurement.targetVisible;
                    this._currentDistanceMeasurement.clickable = false;
                    this.fire("measurementStart", this._currentDistanceMeasurement);
                }
            }
        });

        this._onCameraControlHoverSnapOrSurfaceOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
            if (this.pointerLens) {
                this.pointerLens.visible = true;
                this.pointerLens.centerPos = event.cursorPos || event.canvasPos;
                this.pointerLens.cursorPos = event.canvasPos;
            }
            mouseHovering = false;
            this._markerDiv.style.marginLeft = `-100px`;
            this._markerDiv.style.marginTop = `-100px`;
            if (this._currentDistanceMeasurement) {
                this._currentDistanceMeasurement.wireVisible = false;
                this._currentDistanceMeasurement.targetVisible = false;
                this._currentDistanceMeasurement.axisVisible = false;
            }
            canvas.style.cursor = "default";
        });

        this._active = true;
    }

    /**
     * Deactivates this DistanceMeasurementsMouseControl, making it unresponsive to input.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsMouseControl.
     */
    deactivate() {
        if (!this._active) {
            return;
        }
        if (this.pointerLens) {
            this.pointerLens.visible = false;
        }
        this.reset();
        const input = this.distanceMeasurementsPlugin.viewer.scene.input;
        input.off(this._onInputMouseDown);
        input.off(this._onInputMouseUp);
        const cameraControl = this.distanceMeasurementsPlugin.viewer.cameraControl;
        cameraControl.off(this._onCameraControlHoverSnapOrSurface);
        cameraControl.off(this._onCameraControlHoverSnapOrSurfaceOff);
        if (this._currentDistanceMeasurement) {
            this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }
        this._active = false;
    }

    /**
     * Resets this DistanceMeasurementsMouseControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsMouseControl.
     *
     * Does nothing if the DistanceMeasurementsMouseControl is not active.
     */
    reset() {
        if (!this._active) {
            return;
        }
        if (this._currentDistanceMeasurement) {
            this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }
    }

    /**
     * Destroys this DistanceMeasurementsMouseControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsMouseControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
