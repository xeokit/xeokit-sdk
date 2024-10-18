import {math} from "../../viewer/scene/math/math.js";
import {transformToNode} from "../lib/ui/index.js";
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
 * distanceMeasurementsControl.snapping = true;
 *
 * distanceMeasurementsControl.activate();
 * ````
 */
export class DistanceMeasurementsMouseControl extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsMouseControl bound to the given DistanceMeasurementsPlugin.
     *
     * @param {DistanceMeasurementsPlugin} distanceMeasurementsPlugin The AngleMeasurementsPlugin to control.
     * @param [cfg] Configuration
     * @param {function} [cfg.canvasToPagePos] Optional function to map canvas-space coordinates to page coordinates.
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor when snapping is enabled.
     * @param {boolean} [cfg.snapping=true] Whether to initially enable snap-to-vertex and snap-to-edge for this DistanceMeasurementsMouseControl.
     */
    constructor(distanceMeasurementsPlugin, cfg = {}) {

        super(distanceMeasurementsPlugin.viewer.scene);

        this._canvasToPagePos = cfg.canvasToPagePos;

        this.pointerLens = cfg.pointerLens;

        this._active = false;

        this._currentDistanceMeasurement = null;

        this._currentDistanceMeasurementInitState = {
            wireVisible: null,
            axisVisible: null,
            xAxisVisible: null,
            yaxisVisible: null,
            zAxisVisible: null,
            targetVisible: null,
        }

        this._initMarkerDiv()

        this._snapping = cfg.snapping !== false;
        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;

        this._attachPlugin(distanceMeasurementsPlugin, cfg);
    }

    _initMarkerDiv() {
        const markerDiv = document.createElement('div');
        const canvas = this.scene.canvas.canvas;
        canvas.parentNode.insertBefore(markerDiv, canvas);
        markerDiv.style.background = "black";
        markerDiv.style.border = "2px solid blue";
        markerDiv.style.borderRadius = "10px";
        markerDiv.style.width = "5px";
        markerDiv.style.height = "5px";
        markerDiv.style.top = "-200px";
        markerDiv.style.left = "-200px";
        markerDiv.style.margin = "0 0";
        markerDiv.style.zIndex = "100";
        markerDiv.style.position = "absolute";
        markerDiv.style.pointerEvents = "none";

        this._markerDiv = markerDiv;
    }

    _destroyMarkerDiv() {
        if (this._markerDiv) {
            this._markerDiv.parentNode.removeChild(this._markerDiv);
            this._markerDiv = null;
        }
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
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @param snapping
     */
    set snapping(snapping) {
        this._snapping = snapping;
    }

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsMouseControl.
     *
     * This is `true` by default.
     * @returns {*}
     */
    get snapping() {
        return this._snapping;
    }

    /**
     * Activates this DistanceMeasurementsMouseControl, ready to respond to input.
     */
    activate() {

        if (this._active) {
            return;
        }

        if (!this._markerDiv) {
            this._initMarkerDiv()
        }

        this.fire("activated", true);

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
        let hoveredEntity = null;

        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;

        const pagePos = math.vec2();

        const hoverOn = event => {
                const canvasPos = event.snappedCanvasPos || event.canvasPos;
                mouseHovering = true;
                pointerWorldPos.set(event.worldPos);
                pointerCanvasPos.set(event.canvasPos);
                if (this._mouseState === MOUSE_FIRST_CLICK_EXPECTED) {

                    if (this._canvasToPagePos) {
                        this._canvasToPagePos(canvas, canvasPos, pagePos);
                        this._markerDiv.style.left = `${pagePos[0] - 5}px`;
                        this._markerDiv.style.top = `${pagePos[1] - 5}px`;
                    } else {
                        const markerPos = math.vec2(canvasPos);
                        transformToNode(canvas, this._markerDiv.parentNode, markerPos);
                        this._markerDiv.style.left = `${markerPos[0] - 5}px`;
                        this._markerDiv.style.top = `${markerPos[1] - 5}px`;
                    }

                    this._markerDiv.style.background = "pink";
                    if (event.snappedToVertex || event.snappedToEdge) {
                        if (this.pointerLens) {
                            this.pointerLens.visible = true;
                            this.pointerLens.canvasPos = event.canvasPos;
                            this.pointerLens.snappedCanvasPos = event.snappedCanvasPos || event.canvasPos;
                            this.pointerLens.snapped = true;
                        }
                        this._markerDiv.style.background = "greenyellow";
                        this._markerDiv.style.border = "2px solid green";
                    } else {
                        if (this.pointerLens) {
                            this.pointerLens.visible = true;
                            this.pointerLens.canvasPos = event.canvasPos;
                            this.pointerLens.snappedCanvasPos = event.canvasPos;
                            this.pointerLens.snapped = false;
                        }
                        this._markerDiv.style.background = "pink";
                        this._markerDiv.style.border = "2px solid red";
                    }
                    hoveredEntity = event.entity;
                } else {
                    this._markerDiv.style.left = `-10000px`;
                    this._markerDiv.style.top = `-10000px`;
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
                    this._markerDiv.style.left = `-10000px`;
                    this._markerDiv.style.top = `-10000px`;
                }
        };
        this._onHoverSnapOrSurface = cameraControl.on("hoverSnapOrSurface", e => { if (this._snapping)   hoverOn(e); });
        this._onHoverSurface       = cameraControl.on("hoverSurface",       e => { if (! this._snapping) hoverOn(e); });

        canvas.addEventListener('mousedown', this._onMouseDown = (e) => {
            if (e.which !== 1) {
                return;
            }
            pointerDownCanvasX = e.clientX;
            pointerDownCanvasY = e.clientY;
        });

        canvas.addEventListener("mouseup", this._onMouseUp = (e) => {
            if (e.which !== 1) {
                return;
            }
            if (e.clientX > pointerDownCanvasX + clickTolerance ||
                e.clientX < pointerDownCanvasX - clickTolerance ||
                e.clientY > pointerDownCanvasY + clickTolerance ||
                e.clientY < pointerDownCanvasY - clickTolerance) {
                return;
            }
            if (this._currentDistanceMeasurement) {
                if (mouseHovering) {
                    this._currentDistanceMeasurement.target.entity = hoveredEntity;
                    hoveredEntity = null;
                    this._currentDistanceMeasurement.clickable = true;
                    this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                    this._currentDistanceMeasurement = null;
                } else {
                    this._currentDistanceMeasurement.destroy();
                    this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
                    this._currentDistanceMeasurement = null;
                    hoveredEntity = null;
                }
            } else {
                if (mouseHovering) {
                    this._currentDistanceMeasurement = distanceMeasurementsPlugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            worldPos: pointerWorldPos.slice(),
                            entity: hoveredEntity
                        },
                        target: {
                            worldPos: pointerWorldPos.slice(),
                            entity: hoveredEntity
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
                    this._currentDistanceMeasurement.origin.entity = hoveredEntity;
                    hoveredEntity = null;
                    this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
                }
            }
        });

        const hoverOff = event => {
                if (this.pointerLens) {
                    this.pointerLens.visible = true;
                    this.pointerLens.canvasPos = event.canvasPos;
                    this.pointerLens.snappedCanvasPos = event.snappedCanvasPos || event.canvasPos;
                }
                mouseHovering = false;
                this._markerDiv.style.left = `-100px`;
                this._markerDiv.style.top = `-100px`;
                if (this._currentDistanceMeasurement) {
                    this._currentDistanceMeasurement.wireVisible = false;
                    this._currentDistanceMeasurement.targetVisible = false;
                    this._currentDistanceMeasurement.axisVisible = false;
                }
                canvas.style.cursor = "default";
        };
        this._onHoverSnapOrSurfaceOff = cameraControl.on("hoverSnapOrSurfaceOff", e => { if (this._snapping)   hoverOff(e); });
        this._onHoverOff              = cameraControl.on("hoverOff",              e => { if (! this._snapping) hoverOff(e); });

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

        this.fire("activated", false);

        if (this.pointerLens) {
            this.pointerLens.visible = false;
        }

        this.reset();

        const canvas = this.scene.canvas.canvas;
        canvas.removeEventListener("mousedown", this._onMouseDown);
        canvas.removeEventListener("mouseup", this._onMouseUp);
        const cameraControl = this.distanceMeasurementsPlugin.viewer.cameraControl;
        cameraControl.off(this._onHoverSnapOrSurface);
        cameraControl.off(this._onHoverSurface);
        cameraControl.off(this._onHoverSnapOrSurfaceOff);
        cameraControl.off(this._onHoverOff);

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

        this._destroyMarkerDiv()
        this._initMarkerDiv()

        if (this._currentDistanceMeasurement) {
            this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }

        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;
    }

    /**
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsMouseControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     */
    get currentMeasurement() {
        return this._currentDistanceMeasurement;
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
