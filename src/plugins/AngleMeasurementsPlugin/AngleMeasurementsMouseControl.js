import {math} from "../../viewer/scene/math/math.js";
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
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use to provide a magnified view of the cursor when snapping is enabled.
     * @param {boolean} [cfg.snapping=true] Whether to initially enable snap-to-vertex and snap-to-edge for this AngleMeasurementsMouseControl.
     */
    constructor(angleMeasurementsPlugin, cfg = {}) {

        super(angleMeasurementsPlugin.viewer.scene);

        this.pointerLens = cfg.pointerLens;

        this._active = false;
        this._mouseState = MOUSE_FINDING_ORIGIN;

        this._currentAngleMeasurement = null;

        // init markerDiv element (think about making its style configurable)
        this._initMarkerDiv()

        this._onMouseHoverSurface = null;
        this._onHoverNothing = null;
        this._onPickedNothing = null;
        this._onPickedSurface = null;

        this._onInputMouseDown = null;
        this._onInputMouseUp = null;

        this._snapping = cfg.snapping !== false;

        this._attachPlugin(angleMeasurementsPlugin, cfg);
    }

    _initMarkerDiv() {
        const markerDiv = document.createElement('div');
        markerDiv.setAttribute('id', 'myMarkerDiv');
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

        this.markerDiv = markerDiv;
    }

    _destroyMarkerDiv() {
        if (this._markerDiv) {
            const element = document.getElementById('myMarkerDiv')
            element.parentNode.removeChild(element)
            this._markerDiv = null
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
     * Internally, this deactivates then activates the AngleMeasurementsMouseControl when changed, which means that
     * it will destroy any AngleMeasurements currently under construction, and incurs some overhead, since it unbinds
     * and rebinds various input handlers.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-edge for this AngleMeasurementsMouseControl.
     */
    set snapping(snapping) {
        if (snapping !== this._snapping) {
            this._snapping = snapping;
            this.deactivate();
            this.activate();
        } else {
            this._snapping = snapping;
        }
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
        this._onMouseHoverSurface = cameraControl.on(
            this._snapping
                ? "hoverSnapOrSurface"
                : "hoverSurface",
            event => {
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
                        this.markerDiv.style.marginLeft = `${canvasPos[0] - 5}px`;
                        this.markerDiv.style.marginTop = `${canvasPos[1] - 5}px`;
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
                        this.markerDiv.style.marginLeft = `-10000px`;
                        this.markerDiv.style.marginTop = `-10000px`;
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
                        this.markerDiv.style.marginLeft = `-10000px`;
                        this.markerDiv.style.marginTop = `-10000px`;
                        canvas.style.cursor = "pointer";
                        break;
                }
            });
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
                                worldPos: mouseWorldPos
                            },
                            corner: {
                                worldPos: mouseWorldPos
                            },
                            target: {
                                worldPos: mouseWorldPos
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
        this._onMouseHoverOff = cameraControl.on(
            this._snapping
                ? "hoverSnapOrSurfaceOff"
                : "hoverOff",
            event => {
                mouseHovering = false;
                if (pointerLens) {
                    pointerLens.visible = true;
                    pointerLens.pointerPos = event.canvasPos;
                    pointerLens.snappedCanvasPos = event.snappedCanvasPos || event.canvasPos;
                    pointerLens.snapped = false;
                }
                this.markerDiv.style.marginLeft = `-100px`;
                this.markerDiv.style.marginTop = `-100px`;
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
            });
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
        if (this._markerDiv) {
            this._destroyMarkerDiv()
        }
        this.reset();
        const canvas = this.scene.canvas.canvas;
        canvas.removeEventListener("mousedown", this._onMouseDown);
        canvas.removeEventListener("mouseup", this._onMouseUp);
        const cameraControl = this.angleMeasurementsPlugin.viewer.cameraControl;
        cameraControl.off(this._onMouseHoverSurface);
        cameraControl.off(this._onPickedSurface);
        cameraControl.off(this._onHoverNothing);
        cameraControl.off(this._onPickedNothing);
        this._currentAngleMeasurement = null;
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
     * Destroys this AngleMeasurementsMouseControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
