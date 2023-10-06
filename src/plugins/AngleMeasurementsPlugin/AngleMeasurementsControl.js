import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";

const MOUSE_FINDING_ORIGIN = 0;
const MOUSE_FINDING_CORNER = 1;
const MOUSE_FINDING_TARGET = 2;

const TOUCH_FINDING_ORIGIN = 0;
const QUICK_TOUCH_FINDING_ORIGIN = 1;
const LONG_TOUCH_FINDING_ORIGIN = 2;
const TOUCH_FINDING_CORNER = 3;
const QUICK_TOUCH_MOUSE_FINDING_CORNER = 4;
const LONG_TOUCH_MOUSE_FINDING_CORNER = 5;
const TOUCH_FINDING_TARGET = 6;
const QUICK_TOUCH_FINDING_TARGET = 7;
const LONG_TOUCH_FINDING_TARGET = 8;
const TOUCH_CANCELING = 9;

/**
 * Creates {@link AngleMeasurement}s from mouse and touch input.
 *
 * Belongs to a {@link AngleMeasurementsPlugin}. Located at {@link AngleMeasurementsPlugin#control}.
 *
 * Once the AngleMeasurementControl is activated, the first click on any {@link Entity} begins constructing a {@link AngleMeasurement}, fixing its origin to that Entity. The next click on any Entity will complete the AngleMeasurement, fixing its target to that second Entity. The AngleMeasurementControl will then wait for the next click on any Entity, to begin constructing another AngleMeasurement, and so on, until deactivated.
 *
 * See {@link AngleMeasurementsPlugin} for more info.
 */
class AngleMeasurementsControl extends Component {

    /**
     * @private
     */
    constructor(plugin, cfg = {}) {

        super(plugin.viewer.scene);

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsControl.
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._active = false;
        this._mouseState = MOUSE_FINDING_ORIGIN;
        this._touchState = TOUCH_FINDING_ORIGIN;

        this._currentAngleMeasurement = null;

        // Add a marker to the canvas
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

        this.markerDiv = markerDiv;

        // Event handles from CameraControl
        this._onMouseHoverSurface = null;
        this._onHoverNothing = null;
        this._onMouseHoverOff = null;
        this._onPickedNothing = null;
        this._onPickedSurface = null;

        // Event handles from Scene.input
        this._onInputMouseDown = null;
        this._onInputMouseUp = null;

        // Event handles from Canvas element
        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;

        this._mobileModeLongPressTimeMs = 500;

        this._snapEdge = cfg.snapEdge !== false;
        this._snapVertex = cfg.snapVertex !== false;
    }

    /** Gets if this AngleMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex is enabled for this AngleMeasurementsControl.
     * This is `true` by default.
     * @param snapVertex
     */
    set snapVertex(snapVertex) {
        this._snapVertex = snapVertex;
    }

    /**
     * Gets whether snap-to-vertex is enabled for this AngleMeasurementsControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapVertex() {
        return this._snapVertex;
    }

    /**
     * Sets whether snap-to-edge is enabled for this AngleMeasurementsControl.
     * This is `true` by default.
     * @param snapEdge
     */
    set snapEdge(snapEdge) {
        this._snapEdge = snapEdge;
    }

    /**
     * Gets whether snap-to-edge is enabled for this AngleMeasurementsControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapEdge() {
        return this._snapEdge;
    }

    /**
     * Activates this AngleMeasurementsControl, ready to respond to input.
     */
    activate() {

        if (this._active) {
            return;
        }

        const plugin = this.plugin;
        const scene = this.scene;
        const input = scene.input;
        const canvas = scene.canvas.canvas;

        const clickTolerance = 20;

        const cameraControl = this.plugin.viewer.cameraControl;

        const pointerLens = this.plugin.pointerLens;

        //----------------------------------------------------------------------------------------------------
        // Mouse input
        //----------------------------------------------------------------------------------------------------

        {
            let mouseHovering = false;
            let mouseHoverEntity = false;
            let lastMouseCanvasX = 0;
            let lastMouseCanvasY = 0;

            const mouseWorldPos = math.vec3();
            const mouseHoverCanvasPos = math.vec2();

            this._currentAngleMeasurement = null;

            this._onMouseHoverSurface = cameraControl.on("hoverSnapOrSurface", event => {
                if (event.snappedToVertex || event.snappedToEdge) {
                    if (pointerLens) {
                        pointerLens.visible = true;
                        pointerLens.centerPos = event.cursorPos || event.canvasPos;
                        pointerLens.cursorPos = event.canvasPos;
                        pointerLens.snapped = true;
                    }
                    this.markerDiv.style.background = "greenyellow";
                    this.markerDiv.style.border = "2px solid green";
                } else {
                    if (pointerLens) {
                        pointerLens.visible = true;
                        pointerLens.centerPos = event.cursorPos || event.canvasPos;
                        pointerLens.cursorPos = event.canvasPos;
                        pointerLens.snapped = false;
                    }
                    this.markerDiv.style.background = "pink";
                    this.markerDiv.style.border = "2px solid red";
                }
                mouseHovering = true;
                mouseHoverEntity = event.entity;
                mouseWorldPos.set(event.worldPos);
                mouseHoverCanvasPos.set(event.canvasPos);
                switch (this._mouseState) {
                    case MOUSE_FINDING_ORIGIN:
                        this.markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
                        this.markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
                        break;
                    case MOUSE_FINDING_CORNER:
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.angleVisible = false;
                            this._currentAngleMeasurement.corner.worldPos = event.worldPos;
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
                        }
                        this.markerDiv.style.marginLeft = `-10000px`;
                        this.markerDiv.style.marginTop = `-10000px`;
                        canvas.style.cursor = "pointer";
                        break;
                }
            });

            this._onInputMouseDown = input.on("mousedown", (coords) => {
                lastMouseCanvasX = coords[0];
                lastMouseCanvasY = coords[1];
            });

            this._onInputMouseUp = input.on("mouseup", (coords) => {
                if (coords[0] > lastMouseCanvasX + clickTolerance ||
                    coords[0] < lastMouseCanvasX - clickTolerance ||
                    coords[1] > lastMouseCanvasY + clickTolerance ||
                    coords[1] < lastMouseCanvasY - clickTolerance) {
                    return;
                }
                switch (this._mouseState) {
                    case MOUSE_FINDING_ORIGIN:
                        if (mouseHovering) {
                            this._currentAngleMeasurement = this.plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    entity: mouseHoverEntity,
                                    worldPos: mouseWorldPos
                                },
                                corner: {
                                    entity: mouseHoverEntity,
                                    worldPos: mouseWorldPos
                                },
                                target: {
                                    entity: mouseHoverEntity,
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
                            this._mouseState = MOUSE_FINDING_CORNER;
                            this.fire("measurementStart", this._currentAngleMeasurement);
                        }
                        break;
                    case MOUSE_FINDING_CORNER:
                        if (mouseHovering) {
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                            this._mouseState = MOUSE_FINDING_TARGET;
                        } else {
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
                                this._mouseState = MOUSE_FINDING_ORIGIN
                                this.fire("measurementCancel", this._currentAngleMeasurement);
                            }
                        }
                        break;
                    case MOUSE_FINDING_TARGET:
                        if (mouseHovering) {
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                            this.fire("measurementEnd", this._currentAngleMeasurement);
                            this._currentAngleMeasurement = null;
                            this._mouseState = MOUSE_FINDING_ORIGIN;
                        } else {
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
                                this._mouseState = MOUSE_FINDING_ORIGIN;
                                this.fire("measurementCancel", this._currentAngleMeasurement);
                            }
                        }
                        break;
                }
            });

            this._onMouseHoverOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
                mouseHovering = false;
                if (pointerLens) {
                    pointerLens.visible = true;
                    pointerLens.centerPos = event.cursorPos;
                    pointerLens.cursorPos = event.cursorPos;
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
        }

        //----------------------------------------------------------------------------------------------------
        // Touch input always assumes mobile devices
        //----------------------------------------------------------------------------------------------------

        {
            let longTouchTimeout = null;

            const disableCameraMouseControl = () => {
                cameraControl.active = false;
            }

            const enableCameraMouseControl = () => {
                cameraControl.active = true;
            }

            // const scheduleSurfacePickIfNeeded = () => {
            //     if (!cameraControl._handlers[2]._active) {
            //         cameraControl._controllers.pickController.schedulePickSurface = true;
            //         cameraControl._controllers.pickController.update();
            //     }
            // }

            this._touchState = TOUCH_FINDING_ORIGIN;

            const touchStartCanvasPos = math.vec2();
            const touchMoveCanvasPos = math.vec2();
            const touchEndCanvasPos = math.vec2();
            const pointerWorldPos = math.vec3();

            canvas.addEventListener("touchstart", this._onCanvasTouchStart = (event) => {

                const currentNumTouches = event.touches.length;

                if (currentNumTouches !== 1) {
                    return;
                }

                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;

                touchStartCanvasPos.set([touchX, touchY]);
                touchMoveCanvasPos.set([touchX, touchY]);

                switch (this._touchState) {

                    case TOUCH_FINDING_ORIGIN:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            this._touchState = TOUCH_CANCELING;
                            // console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_CANCELING")
                            return;
                        }
                        if (currentNumTouches === 1) { // One finger down
                            longTouchTimeout = setTimeout(() => {
                                longTouchTimeout = null;
                                if (currentNumTouches !== 1 ||
                                    touchMoveCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                                    touchMoveCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                                    touchMoveCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                                    touchMoveCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                                    return;   // Has moved
                                }
                                // Long touch
                                disableCameraMouseControl();
                                if (pointerLens) {
                                    pointerLens.visible = true;
                                    pointerLens.centerPos = touchStartCanvasPos;
                                    pointerLens.cursorPos = touchStartCanvasPos;
                                }
                                if (pointerLens) {
                                    pointerLens.centerPos = touchMoveCanvasPos;
                                }
                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos,
                                    snapVertex: this._snapVertex,
                                    snapEdge: this._snapEdge
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (pointerLens) {
                                        pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                        pointerLens.snapped = true;
                                    }
                                    pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                    if (!this._currentAngleMeasurement) {
                                        this._currentAngleMeasurement = plugin.createMeasurement({
                                            id: math.createUUID(),
                                            origin: {
                                                worldPos: snapPickResult.snappedWorldPos
                                            },
                                            corner: {
                                                worldPos: snapPickResult.snappedWorldPos
                                            },
                                            target: {
                                                worldPos: snapPickResult.snappedWorldPos
                                            }
                                        });
                                        this._currentAngleMeasurement.clickable = false;
                                        this._currentAngleMeasurement.originVisible = true;
                                        this._currentAngleMeasurement.originWireVisible = false;
                                        this._currentAngleMeasurement.cornerVisible = false;
                                        this._currentAngleMeasurement.cornerWireVisible = false;
                                        this._currentAngleMeasurement.targetVisible = false;
                                        this._currentAngleMeasurement.targetWireVisible = false;
                                        this._currentAngleMeasurement.angleVisible = false
                                    } else {
                                        this._currentAngleMeasurement.origin.worldPos = snapPickResult.snappedWorldPos;
                                    }
                                    this.fire("measurementStart", this._currentAngleMeasurement);
                                    this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                                    // console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
                                } else {
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = pickResult.canvasPos;
                                            pointerLens.snapped = false;
                                        }
                                        pointerWorldPos.set(pickResult.worldPos);
                                        if (!this._currentAngleMeasurement) {
                                            this._currentAngleMeasurement = plugin.createMeasurement({
                                                id: math.createUUID(),
                                                origin: {
                                                    worldPos: pickResult.worldPos
                                                },
                                                corner: {
                                                    worldPos: pickResult.worldPos
                                                },
                                                target: {
                                                    worldPos: pickResult.worldPos
                                                }
                                            });
                                            this._currentAngleMeasurement.clickable = false;
                                            this._currentAngleMeasurement.originVisible = true;
                                            this._currentAngleMeasurement.originWireVisible = false;
                                            this._currentAngleMeasurement.cornerVisible = false;
                                            this._currentAngleMeasurement.cornerWireVisible = false;
                                            this._currentAngleMeasurement.targetVisible = false;
                                            this._currentAngleMeasurement.targetWireVisible = false;
                                            this._currentAngleMeasurement.angleVisible = false
                                        } else {
                                            this._currentAngleMeasurement.origin.worldPos = pickResult.worldPos;
                                        }
                                        this.fire("measurementStart", this._currentAngleMeasurement);
                                    } else {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = null;
                                            pointerLens.snapped = false;
                                        }
                                    }
                                }
                                this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                                // console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
                            }, this._mobileModeLongPressTimeMs);
                            this._touchState = QUICK_TOUCH_FINDING_ORIGIN;
                            // console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> QUICK_TOUCH_FINDING_ORIGIN")
                        }
                        break;

                    case TOUCH_FINDING_CORNER:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            this._touchState = TOUCH_CANCELING;
                            // console.log("touchstart: this._touchState= TOUCH_FINDING_CORNER -> TOUCH_CANCELING")
                            return;
                        }
                        if (currentNumTouches === 1) { // One finger down
                            longTouchTimeout = setTimeout(() => {
                                longTouchTimeout = null;
                                if (currentNumTouches !== 1 ||
                                    touchMoveCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                                    touchMoveCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                                    touchMoveCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                                    touchMoveCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                                    return;   // Has moved
                                }
                                // Long touch
                                disableCameraMouseControl();
                                if (pointerLens) {
                                    pointerLens.visible = true;
                                    pointerLens.centerPos = touchStartCanvasPos;
                                    pointerLens.cursorPos = touchStartCanvasPos;
                                }

                                if (pointerLens) {
                                    pointerLens.centerPos = touchMoveCanvasPos;
                                }
                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos,
                                    snapVertex: this._snapVertex,
                                    snapEdge: this._snapEdge
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (pointerLens) {
                                        pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                        pointerLens.snapped = true;
                                    }
                                    pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                    this._currentAngleMeasurement.corner.worldPos = snapPickResult.snappedWorldPos;
                                    this._currentAngleMeasurement.originVisible = true;
                                    this._currentAngleMeasurement.originWireVisible = true;
                                    this._currentAngleMeasurement.cornerVisible = true;
                                    this._currentAngleMeasurement.cornerWireVisible = false;
                                    this._currentAngleMeasurement.targetVisible = false;
                                    this._currentAngleMeasurement.targetWireVisible = false;
                                    this._currentAngleMeasurement.angleVisible = false
                                } else {
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = pickResult.canvasPos;
                                            pointerLens.snapped = false;
                                        }
                                        pointerWorldPos.set(pickResult.worldPos);
                                        this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                        this._currentAngleMeasurement.originVisible = true;
                                        this._currentAngleMeasurement.originWireVisible = true;
                                        this._currentAngleMeasurement.cornerVisible = true;
                                        this._currentAngleMeasurement.cornerWireVisible = false;
                                        this._currentAngleMeasurement.targetVisible = false;
                                        this._currentAngleMeasurement.targetWireVisible = false;
                                        this._currentAngleMeasurement.angleVisible = false
                                    } else {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = null;
                                            pointerLens.snapped = false;
                                        }
                                    }
                                }
                                this._touchState = LONG_TOUCH_MOUSE_FINDING_CORNER;
                                // console.log("touchstart: this._touchState= TOUCH_FINDING_CORNER -> LONG_TOUCH_MOUSE_FINDING_CORNER")
                            }, this._mobileModeLongPressTimeMs);
                            this._touchState = QUICK_TOUCH_MOUSE_FINDING_CORNER;
                            // console.log("touchstart: this._touchState= TOUCH_FINDING_CORNER -> QUICK_TOUCH_MOUSE_FINDING_CORNER")
                        }
                        break;

                    case TOUCH_FINDING_TARGET:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            return;
                        }
                        if (currentNumTouches === 1) { // One finger down
                            longTouchTimeout = setTimeout(() => {
                                longTouchTimeout = null;
                                if (currentNumTouches !== 1 ||
                                    touchMoveCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                                    touchMoveCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                                    touchMoveCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                                    touchMoveCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                                    // Has moved
                                    return;
                                }
                                // Long touch
                                disableCameraMouseControl();
                                if (pointerLens) {
                                    pointerLens.visible = true;
                                    pointerLens.centerPos = touchStartCanvasPos;
                                }

                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos,
                                    snapVertex: this._snapVertex,
                                    snapEdge: this._snapEdge
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (pointerLens) {
                                        pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                        pointerLens.snapped = true;
                                    }
                                    pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                    this._currentAngleMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
                                    this._currentAngleMeasurement.originVisible = true;
                                    this._currentAngleMeasurement.originWireVisible = true;
                                    this._currentAngleMeasurement.cornerVisible = true;
                                    this._currentAngleMeasurement.cornerWireVisible = true;
                                    this._currentAngleMeasurement.targetVisible = true;
                                    this._currentAngleMeasurement.targetWireVisible = true;
                                    this._currentAngleMeasurement.angleVisible = true;
                                } else {
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = pickResult.canvasPos;
                                            pointerLens.snapped = false;
                                        }
                                        pointerWorldPos.set(pickResult.worldPos);
                                        this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                        this._currentAngleMeasurement.originVisible = true;
                                        this._currentAngleMeasurement.originWireVisible = true;
                                        this._currentAngleMeasurement.cornerVisible = true;
                                        this._currentAngleMeasurement.cornerWireVisible = true;
                                        this._currentAngleMeasurement.targetVisible = true;
                                        this._currentAngleMeasurement.targetWireVisible = true;
                                        this._currentAngleMeasurement.angleVisible = true;
                                    } else {
                                        if (pointerLens) {
                                            pointerLens.cursorPos = null;
                                            pointerLens.snapped = false;
                                        }
                                    }
                                }
                                this._touchState = LONG_TOUCH_FINDING_TARGET;
                                // console.log("touchstart: this._touchState= TOUCH_FINDING_TARGET -> LONG_TOUCH_FINDING_TARGET")
                            }, this._mobileModeLongPressTimeMs);
                            this._touchState = QUICK_TOUCH_FINDING_TARGET;
                            // console.log("touchstart: this._touchState= TOUCH_FINDING_TARGET -> QUICK_TOUCH_FINDING_TARGET")
                        }
                        break;

                    default:
                        if (longTouchTimeout !== null) {
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                        }
                        enableCameraMouseControl();
                        this._touchState = TOUCH_CANCELING;
                        // console.log("touchstart: this._touchState= default -> TOUCH_CANCELING")

                        return;
                }

            }, {passive: true});

            canvas.addEventListener("touchmove", (event) => {
                const currentNumTouches = event.touches.length;
                if (currentNumTouches !== 1) {
                    return;
                }
                const touchX = event.touches[0].clientX;
                const touchY = event.touches[0].clientY;
                touchMoveCanvasPos.set([touchX, touchY]);
                let snapPickResult;
                let pickResult;

                switch (this._touchState) {

                    case TOUCH_CANCELING:
                        break;

                    case TOUCH_FINDING_ORIGIN:
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        // console.log("touchmove: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_ORIGIN")
                        break;

                    case QUICK_TOUCH_FINDING_ORIGIN:
                        this._touchState = QUICK_TOUCH_FINDING_ORIGIN;
                        // console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_ORIGIN -> QUICK_TOUCH_FINDING_ORIGIN")
                        break;

                    case LONG_TOUCH_FINDING_ORIGIN:
                        if (pointerLens) {
                            pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos,
                            snapVertex: this._snapVertex,
                            snapEdge: this._snapEdge
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (pointerLens) {
                                pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                pointerLens.snapped = true;
                            }
                            pointerWorldPos.set(snapPickResult.snappedWorldPos);
                            if (!this._currentAngleMeasurement) {
                                this._currentAngleMeasurement = plugin.createMeasurement({
                                    id: math.createUUID(),
                                    origin: {
                                        worldPos: snapPickResult.snappedWorldPos
                                    },
                                    corner: {
                                        worldPos: snapPickResult.snappedWorldPos
                                    },
                                    target: {
                                        worldPos: snapPickResult.snappedWorldPos
                                    }
                                });
                                this._currentAngleMeasurement.clickable = false;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = false;
                                this._currentAngleMeasurement.cornerVisible = false;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false
                            } else {
                                this._currentAngleMeasurement.origin.worldPos = snapPickResult.snappedWorldPos;
                            }
                            this.fire("measurementStart", this._currentAngleMeasurement);
                        } else {
                            pickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                pointerWorldPos.set(pickResult.worldPos);
                                if (!this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement = plugin.createMeasurement({
                                        id: math.createUUID(),
                                        origin: {
                                            worldPos: pickResult.worldPos
                                        },
                                        corner: {
                                            worldPos: pickResult.worldPos
                                        },
                                        target: {
                                            worldPos: pickResult.worldPos
                                        }
                                    });
                                    this._currentAngleMeasurement.clickable = false;
                                    this._currentAngleMeasurement.originVisible = true;
                                    this._currentAngleMeasurement.originWireVisible = false;
                                    this._currentAngleMeasurement.cornerVisible = false;
                                    this._currentAngleMeasurement.cornerWireVisible = false;
                                    this._currentAngleMeasurement.targetVisible = false;
                                    this._currentAngleMeasurement.targetWireVisible = false;
                                    this._currentAngleMeasurement.angleVisible = false
                                } else {
                                    this._currentAngleMeasurement.origin.worldPos = pickResult.worldPos;
                                }
                                this.fire("measurementStart", this._currentAngleMeasurement);
                            } else {
                                if (pointerLens) {
                                    pointerLens.cursorPos = null;
                                    pointerLens.snapped = false;
                                }
                            }
                        }
                        this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                        // console.log("touchmove: this._touchState= LONG_TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
                        break;

                    case TOUCH_FINDING_CORNER:
                        this._touchState = TOUCH_FINDING_CORNER;
                        // console.log("touchmove: this._touchState= TOUCH_FINDING_CORNER -> TOUCH_FINDING_CORNER")
                        break;

                    case QUICK_TOUCH_MOUSE_FINDING_CORNER:
                        this._touchState = QUICK_TOUCH_MOUSE_FINDING_CORNER;
                        // console.log("touchmove: this._touchState= QUICK_TOUCH_MOUSE_FINDING_CORNER -> QUICK_TOUCH_MOUSE_FINDING_CORNER")
                        break;

                    case LONG_TOUCH_MOUSE_FINDING_CORNER:
                        if (pointerLens) {
                            pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos,
                            snapVertex: this._snapVertex,
                            snapEdge: this._snapEdge
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (pointerLens) {
                                pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                pointerLens.snapped = true;
                            }
                            pointerWorldPos.set(snapPickResult.snappedWorldPos);
                            this._currentAngleMeasurement.corner.worldPos = snapPickResult.snappedWorldPos;
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.cornerWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                        } else {
                            pickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                pointerWorldPos.set(pickResult.worldPos);
                                this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false;
                            } else {
                                if (pointerLens) {
                                    pointerLens.cursorPos = null;
                                    pointerLens.snapped = false;
                                }
                            }
                        }
                        this._touchState = LONG_TOUCH_MOUSE_FINDING_CORNER;
                        // console.log("touchmove: this._touchState= LONG_TOUCH_MOUSE_FINDING_CORNER -> LONG_TOUCH_MOUSE_FINDING_CORNER")
                        break;

                    case TOUCH_FINDING_TARGET:
                        this._touchState = TOUCH_FINDING_TARGET;
                        // console.log("touchmove: this._touchState= TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
                        break;

                    case QUICK_TOUCH_FINDING_TARGET:
                        this._touchState = QUICK_TOUCH_FINDING_TARGET;
                        // console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> QUICK_TOUCH_FINDING_TARGET")
                        break;

                    case LONG_TOUCH_FINDING_TARGET:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            if (pointerLens) {
                                pointerLens.visible = false;
                            }
                            enableCameraMouseControl();
                            this._touchState = TOUCH_CANCELING;
                            // console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_CANCELING")
                            return;
                        }
                        if (pointerLens) {
                            pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos,
                            snapVertex: this._snapVertex,
                            snapEdge: this._snapEdge
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (pointerLens) {
                                pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                pointerLens.snapped = true;
                            }
                            this._currentAngleMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.cornerWireVisible = true;
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.targetWireVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                        } else {
                            pickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = true;
                                this._currentAngleMeasurement.targetVisible = true;
                                this._currentAngleMeasurement.targetWireVisible = true;
                                this._currentAngleMeasurement.angleVisible = true;
                            }
                        }
                        this._touchState = LONG_TOUCH_FINDING_TARGET;
                        break;

                    default:
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        // console.log("touchmove: this._touchState= default -> TOUCH_FINDING_ORIGIN")
                        break;
                }
            }, {passive: true});


            canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {

                const currentNumTouches = event.changedTouches.length;

                if (currentNumTouches !== 1) {
                    return;
                }

                enableCameraMouseControl();
                clearTimeout(longTouchTimeout);
                longTouchTimeout = null;

                const touchX = event.changedTouches[0].clientX;
                const touchY = event.changedTouches[0].clientY;

                touchEndCanvasPos.set([touchX, touchY]);

                switch (this._touchState) {

                    case TOUCH_CANCELING:
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        // console.log("touchend: this._touchState= TOUCH_CANCELING -> TOUCH_FINDING_ORIGIN")
                        break;

                    case TOUCH_FINDING_ORIGIN:
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        // console.log("touchend: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_ORIGIN")
                        break;

                    case TOUCH_FINDING_CORNER:
                        this._touchState = TOUCH_FINDING_CORNER;
                        // console.log("touchend: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_CORNER")
                        break;

                    case TOUCH_FINDING_TARGET:
                        this._touchState = TOUCH_FINDING_TARGET;
                        // console.log("touchend: this._touchState= TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
                        break;

                    case QUICK_TOUCH_FINDING_ORIGIN:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
                            }
                            this._touchState = TOUCH_FINDING_ORIGIN;
                            // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (pointer moved, destroy measurement) -> TOUCH_FINDING_ORIGIN")
                            break;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                this._currentAngleMeasurement = plugin.createMeasurement({
                                    id: math.createUUID(),
                                    origin: {
                                        worldPos: pickResult.worldPos
                                    },
                                    corner: {
                                        worldPos: pickResult.worldPos
                                    },
                                    target: {
                                        worldPos: pickResult.worldPos
                                    }
                                });
                                this._currentAngleMeasurement.clickable = false;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = false;
                                this._currentAngleMeasurement.cornerVisible = false;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false
                                this.fire("measurementStart", this._currentAngleMeasurement);
                                this._touchState = TOUCH_FINDING_CORNER;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (picked, begin measurement) -> TOUCH_FINDING_CORNER")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) { // Not likely needed, but safe
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                this._touchState = TOUCH_FINDING_ORIGIN;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (nothing picked)  -> TOUCH_FINDING_ORIGIN")
                                break;
                            }
                        }

                    case LONG_TOUCH_FINDING_ORIGIN:
                        if (pointerLens) {
                            pointerLens.visible = false;
                        }
                        if (!this._currentAngleMeasurement) {
                            if (pointerLens) {
                                pointerLens.snapped = false;
                                pointerLens.visible = false;
                            }
                            this._touchState = TOUCH_FINDING_ORIGIN;
                            // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (no measurement) -> TOUCH_FINDING_ORIGIN")
                            break;
                        } else {
                            //    this.fire("measurementStart", this._currentAngleMeasurement);
                            //  enableCameraMouseControl();
                            this._touchState = TOUCH_FINDING_CORNER;
                            // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (picked, begin measurement) -> TOUCH_FINDING_CORNER")
                            break;
                        }

                    case QUICK_TOUCH_MOUSE_FINDING_CORNER:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                            // if (this._currentAngleMeasurement) {
                            //     this._currentAngleMeasurement.destroy();
                            //     this._currentAngleMeasurement = null;
                            // }
                            this._touchState = TOUCH_FINDING_CORNER;
                            // console.log("touchend: (moved) this._touchState= QUICK_TOUCH_MOUSE_FINDING_CORNER -> TOUCH_FINDING_CORNER")
                            break;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false;
                                this._touchState = TOUCH_FINDING_TARGET;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_MOUSE_FINDING_CORNER (picked, begin measurement) -> TOUCH_FINDING_TARGET")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                this._touchState = TOUCH_FINDING_ORIGIN;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (nothing picked, destroy measurement) -> TOUCH_FINDING_ORIGIN")
                                break;
                            }
                        }

                    case LONG_TOUCH_MOUSE_FINDING_CORNER: {
                        if (pointerLens) {
                            pointerLens.visible = false;
                        }
                        if (!this._currentAngleMeasurement || !this._currentAngleMeasurement.cornerVisible) {
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
                            }
                            this._touchState = TOUCH_FINDING_ORIGIN;
                            // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (no measurement) -> TOUCH_FINDING_ORIGIN")
                        } else {
                            this._touchState = TOUCH_FINDING_TARGET;
                            // console.log("touchend: this._touchState= LONG_TOUCH_MOUSE_FINDING_CORNER  -> TOUCH_FINDING_ORIGIN")
                        }
                        break;
                    }

                    case QUICK_TOUCH_FINDING_TARGET:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                            // if (this._currentAngleMeasurement) {
                            //     this._currentAngleMeasurement.destroy();
                            //     this._currentAngleMeasurement = null;
                            // }
                            this._touchState = TOUCH_FINDING_TARGET;
                            // console.log("touchend: (moved) this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
                            break;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
                                }
                                this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = true;
                                this._currentAngleMeasurement.targetVisible = true;
                                this._currentAngleMeasurement.targetWireVisible = true;
                                this._currentAngleMeasurement.angleVisible = true;
                                this.fire("measurementEnd", this._currentAngleMeasurement);
                                this._currentAngleMeasurement = null;
                                this._touchState = TOUCH_FINDING_ORIGIN;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_TARGET (picked, begin measurement) -> TOUCH_FINDING_ORIGIN")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                this._touchState = TOUCH_FINDING_ORIGIN;
                                // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (nothing picked, destroy measurement) -> TOUCH_FINDING_ORIGIN")
                                break;
                            }
                        }

                    case LONG_TOUCH_FINDING_TARGET:
                        if (pointerLens) {
                            pointerLens.visible = false;
                        }
                        if (!this._currentAngleMeasurement || !this._currentAngleMeasurement.targetVisible) {
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
                            }
                            this._currentAngleMeasurement = null;
                            this._touchState = TOUCH_FINDING_ORIGIN;
                            // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET (no target found) -> TOUCH_FINDING_ORIGIN")
                        } else {
                            this._currentAngleMeasurement.clickable = true;
                            this.fire("measurementEnd", this._currentAngleMeasurement);
                            this._currentAngleMeasurement = null;
                            this._touchState = TOUCH_FINDING_ORIGIN;
                            // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET  -> TOUCH_FINDING_ORIGIN")
                        }
                        break;

                    default:
                        if (pointerLens) {
                            pointerLens.visible = false;
                            pointerLens.snapped = false;
                        }
                        this._currentAngleMeasurement = null;
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        // console.log("touchend: this._touchState= default -> TOUCH_FINDING_ORIGIN")
                        break;
                }

            }, {passive: true});
        }

        this._active = true;
    }

    /**
     * Deactivates this AngleMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link AngleMeasurement} under construction.
     */
    deactivate() {

        if (!this._active) {
            return;
        }

        if (this.plugin.pointerLens) {
            this.plugin.pointerLens.visible = false;
        }

        this.reset();

        const input = this.plugin.viewer.scene.input;
        const cameraControl = this.plugin.viewer.cameraControl;
        const canvas = this.plugin.viewer.scene.canvas.canvas;

        input.off(this._onInputMouseDown);
        input.off(this._onInputMouseUp);

        cameraControl.off(this._onMouseHoverSurface);
        cameraControl.off(this._onPickedSurface);
        cameraControl.off(this._onHoverNothing);
        cameraControl.off(this._onPickedNothing);

        canvas.removeEventListener("touchstart", this._onCanvasTouchStart);
        canvas.removeEventListener("touchend", this._onCanvasTouchEnd);

        this._currentAngleMeasurement = null;

        this._active = false;
    }

    /**
     * Resets this AngleMeasurementsControl.
     *
     * Destroys any {@link AngleMeasurement} under construction.
     *
     * Does nothing if the AngleMeasurementsControl is not active.
     */
    reset() {

        if (!this._active) {
            return;
        }

        if (this._currentAngleMeasurement) {
            this._currentAngleMeasurement.destroy();
            this._currentAngleMeasurement = null;
        }

        this._mouseState = MOUSE_FINDING_ORIGIN;
        this._touchState = TOUCH_FINDING_ORIGIN;
    }

    /**
     * @private
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }

}

const getCanvasPosFromEvent = function (event, canvasPos) {
    if (!event) {
        event = window.event;
        canvasPos[0] = event.x;
        canvasPos[1] = event.y;
    } else {
        let element = event.target;
        let totalOffsetLeft = 0;
        let totalOffsetTop = 0;
        while (element.offsetParent) {
            totalOffsetLeft += element.offsetLeft;
            totalOffsetTop += element.offsetTop;
            element = element.offsetParent;
        }
        canvasPos[0] = event.pageX - totalOffsetLeft;
        canvasPos[1] = event.pageY - totalOffsetTop;
    }
    return canvasPos;
};

export {AngleMeasurementsControl};
