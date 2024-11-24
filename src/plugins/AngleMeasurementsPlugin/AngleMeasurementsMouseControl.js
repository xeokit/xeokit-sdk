import {math} from "../../viewer/scene/math/math.js";
import {transformToNode} from "../lib/ui/index.js";
import {AngleMeasurementsControl} from "./AngleMeasurementsControl.js";

const MOUSE_FINDING_ORIGIN = 0;
const MOUSE_FINDING_CORNER = 1;
const MOUSE_FINDING_TARGET = 2;

/**
 * Creates {@link AngleMeasurement}s in an {@link AngleMeasurementsPlugin} from mouse input.
 *
 * ## Usage
 *
 * [[Run example](/examples/measurement/#angle_createWithMouse_snapping)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsMouseControl, PointerLens} from "xeokit-sdk.es.js";
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
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const angleMeasurementsMouseControl  = new AngleMeasurementsMouseControl(angleMeasurements, {
 *     pointerLens : new PointerLens(viewer)
 * })
 *
 * angleMeasurementsMouseControl.snapping = true;
 *
 * angleMeasurementsMouseControl.activate();
 * ````
 */
export class AngleMeasurementsMouseControl extends AngleMeasurementsControl {

    /**
     * Creates a AngleMeasurementsMouseControl bound to the given AngleMeasurementsPlugin.
     *
     * @param {AngleMeasurementsPlugin} angleMeasurementsPlugin The AngleMeasurementsPlugin to control.
     * @param {*} [cfg] Configuration
     * @param {function} [cfg.canvasToPagePos] Optional function to map canvas-space coordinates to page coordinates.
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor when snapping is enabled.
     * @param {boolean} [cfg.snapping=true] Whether to initially enable snap-to-vertex and snap-to-edge for this AngleMeasurementsMouseControl.
     */
    constructor(angleMeasurementsPlugin, cfg = {}) {

        super(angleMeasurementsPlugin.viewer.scene);

        this._canvasToPagePos = cfg.canvasToPagePos;

        this.pointerLens = cfg.pointerLens;

        this._active = false;

        this._currentAngleMeasurement = null;

        this._initMarkerDiv()

        this._snapping = cfg.snapping !== false;
        this._mouseState = MOUSE_FINDING_ORIGIN;

        this._attachPlugin(angleMeasurementsPlugin, cfg);
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

        this.markerDiv = markerDiv;
    }

    _destroyMarkerDiv() {
        if (this.markerDiv) {
            this.markerDiv.parentNode.removeChild(this.markerDiv);
            this.markerDiv = null;
        }
    }

    _attachPlugin(angleMeasurementsPlugin, cfg = {}) {

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsMouseControl.
         *
         * @type {AngleMeasurementsPlugin}
         */
        this.angleMeasurementsPlugin = angleMeasurementsPlugin;

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsMouseControl.
         *
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = angleMeasurementsPlugin;
    }

    /**
     * Gets if this AngleMeasurementsMouseControl is currently active, where it is responding to input.
     *
     * @returns {boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-edge for this AngleMeasurementsMouseControl.
     */
    set snapping(snapping) {
        this._snapping = snapping;
    }

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsMouseControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsMouseControl.
     */
    get snapping() {
        return this._snapping;
    }

    /**
     * Activates this AngleMeasurementsMouseControl, ready to respond to input.
     */
    activate() {
        if (this._active) {
            return;
        }
        if (!this.markerDiv) {
            this._initMarkerDiv() // if the marker is destroyed after deactivation, we recreate it
        }
        const angleMeasurementsPlugin = this.angleMeasurementsPlugin;
        const scene = this.scene;
        const input = scene.input;
        const canvas = scene.canvas.canvas;
        const clickTolerance = 20;
        const cameraControl = this.angleMeasurementsPlugin.viewer.cameraControl;
        const pointerLens = this.pointerLens;
        let mouseHovering = false;
        let hoveredEntity = null;
        let lastMouseCanvasX = 0;
        let lastMouseCanvasY = 0;
        const mouseWorldPos = math.vec3();
        const mouseHoverCanvasPos = math.vec2();
        this._currentAngleMeasurement = null;

        const pagePos = math.vec2();

        const hoverOn = event => {
                if (event.snappedToVertex || event.snappedToEdge) {
                    if (pointerLens) {
                        pointerLens.visible = true;
                        pointerLens.canvasPos = event.canvasPos;
                        pointerLens.snappedCanvasPos = event.snappedCanvasPos || event.canvasPos;
                        pointerLens.snapped = true;
                    }
                    this.markerDiv.style.background = "greenyellow";
                    this.markerDiv.style.border = "2px solid green";
                } else {
                    if (pointerLens) {
                        pointerLens.visible = true;
                        pointerLens.canvasPos =  event.canvasPos;
                        pointerLens.snappedCanvasPos = event.canvasPos;
                        pointerLens.snapped = false;
                    }
                    this.markerDiv.style.background = "pink";
                    this.markerDiv.style.border = "2px solid red";
                }
                const canvasPos = event.snappedCanvasPos || event.canvasPos;
                mouseHovering = true;
                hoveredEntity = event.entity;
                mouseWorldPos.set(event.worldPos);
                mouseHoverCanvasPos.set(canvasPos);
                switch (this._mouseState) {
                    case MOUSE_FINDING_ORIGIN:
                        if (this._canvasToPagePos) {
                            this._canvasToPagePos(canvas, canvasPos, pagePos);
                            this.markerDiv.style.left = `${pagePos[0] - 5}px`;
                            this.markerDiv.style.top = `${pagePos[1] - 5}px`;
                        } else {
                            const markerPos = math.vec2(canvasPos);
                            transformToNode(canvas, this.markerDiv.parentNode, markerPos);
                            this.markerDiv.style.left = `${markerPos[0] - 5}px`;
                            this.markerDiv.style.top = `${markerPos[1] - 5}px`;
                        }
                        break;
                    case MOUSE_FINDING_CORNER:
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.angleVisible = false;
                            this._currentAngleMeasurement.corner.worldPos = event.worldPos;
                            this._currentAngleMeasurement.corner.entity = event.entity;
                        }
                        this.markerDiv.style.left = `-10000px`;
                        this.markerDiv.style.top = `-10000px`;
                        canvas.style.cursor = "pointer";
                        break;
                    case MOUSE_FINDING_TARGET:
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.targetWireVisible = true;
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                            this._currentAngleMeasurement.target.worldPos = event.worldPos;
                            this._currentAngleMeasurement.target.entity = event.entity;
                        }
                        this.markerDiv.style.left = `-10000px`;
                        this.markerDiv.style.top = `-10000px`;
                        canvas.style.cursor = "pointer";
                        break;
                }
        };
        this._onHoverSnapOrSurface = cameraControl.on("hoverSnapOrSurface", e => { if (this._snapping)   hoverOn(e); });
        this._onHoverSurface       = cameraControl.on("hoverSurface",       e => { if (! this._snapping) hoverOn(e); });

        canvas.addEventListener('mousedown', this._onMouseDown = (e) => {
            if (e.which !== 1) {
                return;
            }
            lastMouseCanvasX = e.clientX;
            lastMouseCanvasY = e.clientY;
        });
        canvas.addEventListener("mouseup", this._onMouseUp =(e) => {
            if (e.which !== 1) {
                return;
            }
            if (e.clientX > lastMouseCanvasX + clickTolerance ||
                e.clientX < lastMouseCanvasX - clickTolerance ||
                e.clientY > lastMouseCanvasY + clickTolerance ||
                e.clientY < lastMouseCanvasY - clickTolerance) {
                return;
            }
            switch (this._mouseState) {
                case MOUSE_FINDING_ORIGIN:
                    if (mouseHovering) {
                        this._currentAngleMeasurement = this.angleMeasurementsPlugin.createMeasurement({
                            id: math.createUUID(),
                            origin: {
                                worldPos: mouseWorldPos,
                                entity: hoveredEntity
                            },
                            corner: {
                                worldPos: mouseWorldPos,
                                entity: hoveredEntity
                            },
                            target: {
                                worldPos: mouseWorldPos,
                                entity: hoveredEntity
                            },
                            approximate: true
                        });
                        this._currentAngleMeasurement.clickable = false;
                        this._currentAngleMeasurement.originVisible = true;
                        this._currentAngleMeasurement.originWireVisible = true;
                        this._currentAngleMeasurement.cornerVisible = false;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = false;
                        this._currentAngleMeasurement.angleVisible = false;
                        this._currentAngleMeasurement.origin.entity = hoveredEntity;
                        this._mouseState = MOUSE_FINDING_CORNER;
                        this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                    }
                    break;
                case MOUSE_FINDING_CORNER:
                    if (mouseHovering) {
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this._currentAngleMeasurement.corner.entity = hoveredEntity;
                        this._mouseState = MOUSE_FINDING_TARGET;
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                            hoveredEntity = null;
                            this._mouseState = MOUSE_FINDING_ORIGIN
                            this.angleMeasurementsPlugin.fire("measurementCancel", this._currentAngleMeasurement);
                        }
                    }
                    break;
                case MOUSE_FINDING_TARGET:
                    if (mouseHovering) {
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this._currentAngleMeasurement.target.entity = hoveredEntity;
                        this._currentAngleMeasurement.clickable = true;
                        hoveredEntity = null;
                        this.angleMeasurementsPlugin.fire("measurementEnd", this._currentAngleMeasurement);
                        this._currentAngleMeasurement = null;
                        this._mouseState = MOUSE_FINDING_ORIGIN;
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                            hoveredEntity = null;
                            this._mouseState = MOUSE_FINDING_ORIGIN;
                            this.angleMeasurementsPlugin.fire("measurementCancel", this._currentAngleMeasurement);
                        }
                    }
                    break;
            }
        });

        const hoverOff = event => {
                mouseHovering = false;
                if (pointerLens) {
                    pointerLens.visible = true;
                    pointerLens.canvasPos = event.canvasPos;
                    pointerLens.snappedCanvasPos = event.snappedCanvasPos || event.canvasPos;
                    pointerLens.snapped = false;
                }
                this.markerDiv.style.left = `-100px`;
                this.markerDiv.style.top = `-100px`;
                if (this._currentAngleMeasurement) {
                    switch (this._mouseState) {
                        case MOUSE_FINDING_ORIGIN:
                            this._currentAngleMeasurement.originVisible = false;
                            break;
                        case MOUSE_FINDING_CORNER:
                            this._currentAngleMeasurement.cornerVisible = false;
                            this._currentAngleMeasurement.originWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                            break;
                        case MOUSE_FINDING_TARGET:
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                            break;
                    }
                    canvas.style.cursor = "default";
                }
        };
        this._onHoverSnapOrSurfaceOff = cameraControl.on("hoverSnapOrSurfaceOff", e => { if (this._snapping)   hoverOff(e); });
        this._onHoverOff              = cameraControl.on("hoverOff",              e => { if (! this._snapping) hoverOff(e); });

        this._active = true;
    }

    /**
     * Deactivates this AngleMeasurementsMouseControl, making it unresponsive to input.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsMouseControl.
     */
    deactivate() {
        if (!this._active) {
            return;
        }

        if (this.pointerLens) {
            this.pointerLens.visible = false;
        }

        this.reset();

        const canvas = this.scene.canvas.canvas;
        canvas.removeEventListener("mousedown", this._onMouseDown);
        canvas.removeEventListener("mouseup", this._onMouseUp);
        const cameraControl = this.angleMeasurementsPlugin.viewer.cameraControl;
        cameraControl.off(this._onHoverSnapOrSurface);
        cameraControl.off(this._onHoverSurface);
        cameraControl.off(this._onHoverSnapOrSurfaceOff);
        cameraControl.off(this._onHoverOff);

        this._active = false;
    }

    /**
     * Resets this AngleMeasurementsMouseControl.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsMouseControl.
     *
     * Does nothing if the AngleMeasurementsMouseControl is not active.
     */
    reset() {
        if (!this._active) {
            return;
        }

        this._destroyMarkerDiv()
        this._initMarkerDiv()

        if (this._currentAngleMeasurement) {
            this._currentAngleMeasurement.destroy();
            this._currentAngleMeasurement = null;
        }

        this._mouseState = MOUSE_FINDING_ORIGIN;
    }

    /**
     * Gets the {@link AngleMeasurement} under construction by this AngleMeasurementsMouseControl, if any.
     *
     * @returns {null|AngleMeasurement}
     */
    get currentMeasurement() {
        return this._currentAngleMeasurement;
    }

    /**
     * Destroys this AngleMeasurementsMouseControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
