import {math} from "../../viewer/scene/math/math.js";
import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";
import {AngleMeasurementsControl} from "./AngleMeasurementsControl.js";
import {transformToNode} from "../lib/ui/index.js";

const WAITING_FOR_ORIGIN_TOUCH_START = 0;
const WAITING_FOR_ORIGIN_QUICK_TOUCH_END = 1;
const WAITING_FOR_ORIGIN_LONG_TOUCH_END = 2;

const WAITING_FOR_CORNER_TOUCH_START = 3;
const WAITING_FOR_CORNER_QUICK_TOUCH_END = 4;
const WAITING_FOR_CORNER_LONG_TOUCH_END = 5;

const WAITING_FOR_TARGET_TOUCH_START = 6;
const WAITING_FOR_TARGET_QUICK_TOUCH_END = 7;
const WAITING_FOR_TARGET_LONG_TOUCH_END = 8;

const TOUCH_CANCELING = 7;

const tmpVec2 = math.vec2();

/**
 * Creates {@link AngleMeasurement}s from touch input.
 *
 * See {@link AngleMeasurementsPlugin} for more info.
 *
 */
export class AngleMeasurementsTouchControl extends AngleMeasurementsControl {

    /**
     * Creates a AngleMeasurementsTouchControl bound to the given AngleMeasurementsPlugin.
     */
    constructor(angleMeasurementsPlugin, cfg = {}) {

        super(angleMeasurementsPlugin.viewer.scene);

        this.pointerLens = cfg.pointerLens;
        this.pointerCircle = new PointerCircle(angleMeasurementsPlugin.viewer);

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

        this.markerDiv = markerDiv;

        this._currentAngleMeasurement = null;

        this._longTouchTimeoutMs = 300;
        this._snapping = cfg.snapping !== false;
        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;

        this._attachPlugin(angleMeasurementsPlugin, cfg);
    }

    _attachPlugin(angleMeasurementsPlugin) {

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsTouchControl.
         * @type {AngleMeasurementsPlugin}
         */
        this.angleMeasurementsPlugin = angleMeasurementsPlugin;

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsTouchControl.
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = angleMeasurementsPlugin;
    }

    /** Gets if this AngleMeasurementsTouchControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
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
     * Activates this AngleMeasurementsTouchControl, ready to respond to input.
     */
    activate() {

        if (this._active) {
            return;
        }

        const plugin = this.plugin;
        const scene = this.scene;
        const canvas = scene.canvas.canvas;
        const pointerLens = plugin.pointerLens;
        const pointerWorldPos = math.vec3();

        const touchTolerance = 20;

        let longTouchTimeout = null;

        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;

        const touchStartCanvasPos = math.vec2();
        const touchMoveCanvasPos = math.vec2();
        const touchEndCanvasPos = math.vec2();

        let touchId = null;

        const disableCameraNavigation = () => {
            this.plugin.viewer.cameraControl.active = false;
        }

        const enableCameraNavigation = () => {
            this.plugin.viewer.cameraControl.active = true;
        }

        const cancel = () => {
            if (longTouchTimeout) {
                clearTimeout(longTouchTimeout);
                longTouchTimeout = null;
            }
            if (this._currentAngleMeasurement) {
                this._currentAngleMeasurement.destroy();
                this._currentAngleMeasurement = null;
            }
            enableCameraNavigation();
            this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
        }

        const copyCanvasPos = (event, dst) => {
            dst[0] = event.clientX;
            dst[1] = event.clientY;
            transformToNode(canvas.ownerDocument.documentElement, canvas, dst);
            return dst;
        };

        const toBodyPos = (pos, dst) => {
            dst.set(pos);
            transformToNode(canvas, canvas.ownerDocument.documentElement, dst);
            return dst;
        };

        canvas.addEventListener("touchstart", this._onCanvasTouchStart = (event) => {

            const currentNumTouches = event.touches.length;

            if (currentNumTouches !== 1) {
                if (longTouchTimeout) {
                    clearTimeout(longTouchTimeout);
                    longTouchTimeout = null;
                }
                return;
            }

            const touch = event.touches[0];
            copyCanvasPos(touch, touchStartCanvasPos);
            touchMoveCanvasPos.set(touchStartCanvasPos);

            switch (this._touchState) {

                case WAITING_FOR_ORIGIN_TOUCH_START:
                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        cancel();
                        return;
                    }
                    const snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapping,
                        snapToEdge: this._snapping
                    });
                    if (snapPickResult && snapPickResult.snapped) {
                        pointerWorldPos.set(snapPickResult.worldPos);
                        this.pointerCircle.start(toBodyPos(snapPickResult.snappedCanvasPos, tmpVec2));
                    } else {
                        const pickResult = scene.pick({
                            canvasPos: touchMoveCanvasPos,
                            pickSurface: true
                        })
                        if (pickResult && pickResult.worldPos) {
                            pointerWorldPos.set(pickResult.worldPos);
                            this.pointerCircle.start(toBodyPos(pickResult.canvasPos, tmpVec2));
                        } else {
                            return;
                        }
                    }
                    longTouchTimeout = setTimeout(() => {
                        if (currentNumTouches !== 1 ||
                            touchMoveCanvasPos[0] > touchStartCanvasPos[0] + touchTolerance ||
                            touchMoveCanvasPos[0] < touchStartCanvasPos[0] - touchTolerance ||
                            touchMoveCanvasPos[1] > touchStartCanvasPos[1] + touchTolerance ||
                            touchMoveCanvasPos[1] < touchStartCanvasPos[1] - touchTolerance) {
                            return;   // Has moved
                        }
                        // Long touch
                        if (this.pointerLens) {
                            this.pointerLens.visible = true;
                            this.pointerLens.canvasPos = touchStartCanvasPos;
                            this.pointerLens.cursorPos = touchStartCanvasPos;
                        }
                        if (this.pointerLens) {
                            this.pointerLens.canvasPos = touchMoveCanvasPos;
                            this.pointerLens.snapped = false;
                        }
                        if (this.pointerLens) {
                            this.pointerLens.cursorPos = snapPickResult.canvasPos;
                            this.pointerLens.snapped = true;
                        }
                        // pointerWorldPos.set(snapPickResult.worldPos);
                        if (!this._currentAngleMeasurement) {
                            this._currentAngleMeasurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    worldPos: snapPickResult.worldPos,
                                    entity: snapPickResult.entity
                                },
                                corner: {
                                    worldPos: snapPickResult.worldPos,
                                    entity: snapPickResult.entity
                                },
                                target: {
                                    worldPos: snapPickResult.worldPos,
                                    entity: snapPickResult.entity
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
                            this._currentAngleMeasurement.origin.worldPos = pointerWorldPos;
                        }
                        this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                        // if (this.pointerLens) {
                        //     this.pointerLens.cursorPos = pickResult.canvasPos;
                        //     this.pointerLens.snapped = false;
                        // }
                        this._touchState = WAITING_FOR_ORIGIN_LONG_TOUCH_END;
                      //  console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_LONG_TOUCH_END")
                        disableCameraNavigation();
                    }, this._longTouchTimeoutMs);
                    this._touchState = WAITING_FOR_ORIGIN_QUICK_TOUCH_END;
                    //console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_QUICK_TOUCH_END")

                    touchId = touch.identifier;

                    break;

                case WAITING_FOR_CORNER_TOUCH_START:

                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        return;
                    }
                    if (currentNumTouches === 1) { // One finger down
                        longTouchTimeout = setTimeout(() => {
                            longTouchTimeout = null;
                            if (currentNumTouches !== 1 ||
                                touchMoveCanvasPos[0] > touchStartCanvasPos[0] + touchTolerance ||
                                touchMoveCanvasPos[0] < touchStartCanvasPos[0] - touchTolerance ||
                                touchMoveCanvasPos[1] > touchStartCanvasPos[1] + touchTolerance ||
                                touchMoveCanvasPos[1] < touchStartCanvasPos[1] - touchTolerance) {
                                // Has moved
                                return;
                            }

                            // Long touch
                            if (this.pointerLens) {
                                this.pointerLens.visible = true;
                                this.pointerLens.canvasPos = touchStartCanvasPos;
                                this.pointerLens.snapped = false;
                            }

                            const snapPickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                snapToVertex: this._snapping,
                                snapToEdge: this._snapping
                            });
                            if (snapPickResult && snapPickResult.snapped) {
                                if (this.pointerLens) {
                                    this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    this.pointerLens.snapped = true;
                                }
                                this.pointerCircle.start(toBodyPos(snapPickResult.snappedCanvasPos, tmpVec2));
                                pointerWorldPos.set(snapPickResult.worldPos);
                                this._currentAngleMeasurement.corner.worldPos = snapPickResult.worldPos;
                                this._currentAngleMeasurement.corner.entity = snapPickResult.entity;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false
                                this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                            } else {
                                const pickResult = scene.pick({
                                    canvasPos: touchMoveCanvasPos,
                                    pickSurface: true
                                })
                                if (pickResult && pickResult.worldPos) {
                                    if (this.pointerLens) {
                                        this.pointerLens.cursorPos = pickResult.canvasPos;
                                        this.pointerLens.snapped = false;
                                    }
                                    this.pointerCircle.start(toBodyPos(pickResult.canvasPos, tmpVec2));
                                    pointerWorldPos.set(pickResult.worldPos);
                                    this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                    this._currentAngleMeasurement.corner.entity = pickResult.entity;
                                    this._currentAngleMeasurement.originVisible = true;
                                    this._currentAngleMeasurement.originWireVisible = true;
                                    this._currentAngleMeasurement.cornerVisible = true;
                                    this._currentAngleMeasurement.cornerWireVisible = false;
                                    this._currentAngleMeasurement.targetVisible = false;
                                    this._currentAngleMeasurement.targetWireVisible = false;
                                    this._currentAngleMeasurement.angleVisible = false
                                    this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                                } else {
                                    if (this.pointerLens) {
                                        this.pointerLens.cursorPos = null;
                                        this.pointerLens.snapped = false;

                                    }
                                }
                            }
                            this._touchState = WAITING_FOR_CORNER_LONG_TOUCH_END;
                           // console.log("touchstart: this._touchState= WAITING_FOR_CORNER_TOUCH_START -> WAITING_FOR_CORNER_LONG_TOUCH_END")

                            disableCameraNavigation();

                        }, this._longTouchTimeoutMs);

                        this._touchState = WAITING_FOR_CORNER_QUICK_TOUCH_END;
                      //  console.log("touchstart: this._touchState= WAITING_FOR_CORNER_TOUCH_START -> WAITING_FOR_CORNER_QUICK_TOUCH_END")
                    }

                    touchId = touch.identifier;

                    break;

                case WAITING_FOR_TARGET_TOUCH_START:

                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        return;
                    }
                    if (currentNumTouches === 1) { // One finger down
                        longTouchTimeout = setTimeout(() => {
                            longTouchTimeout = null;
                            if (currentNumTouches !== 1 ||
                                touchMoveCanvasPos[0] > touchStartCanvasPos[0] + touchTolerance ||
                                touchMoveCanvasPos[0] < touchStartCanvasPos[0] - touchTolerance ||
                                touchMoveCanvasPos[1] > touchStartCanvasPos[1] + touchTolerance ||
                                touchMoveCanvasPos[1] < touchStartCanvasPos[1] - touchTolerance) {
                                // Has moved
                                return;
                            }

                            // Long touch
                            if (this.pointerLens) {
                                this.pointerLens.visible = true;
                                this.pointerLens.canvasPos = touchStartCanvasPos;
                                this.pointerLens.snapped = false;
                            }

                            const snapPickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                snapToVertex: this._snapping,
                                snapToEdge: this._snapping
                            });
                            if (snapPickResult && snapPickResult.snapped) {
                                if (this.pointerLens) {
                                    this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    this.pointerLens.snapped = true;
                                }
                                this.pointerCircle.start(toBodyPos(snapPickResult.snappedCanvasPos, tmpVec2));
                                pointerWorldPos.set(snapPickResult.worldPos);
                                this._currentAngleMeasurement.target.worldPos = snapPickResult.worldPos;
                                this._currentAngleMeasurement.target.entity = snapPickResult.entity;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = true;
                                this._currentAngleMeasurement.targetVisible = true;
                                this._currentAngleMeasurement.targetWireVisible = true;
                                this._currentAngleMeasurement.angleVisible = true;
                                this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                            } else {
                                const pickResult = scene.pick({
                                    canvasPos: touchMoveCanvasPos,
                                    pickSurface: true
                                })
                                if (pickResult && pickResult.worldPos) {
                                    if (this.pointerLens) {
                                        this.pointerLens.cursorPos = pickResult.canvasPos;
                                        this.pointerLens.snapped = false;
                                    }
                                    this.pointerCircle.start(toBodyPos(pickResult.canvasPos, tmpVec2));
                                    pointerWorldPos.set(pickResult.worldPos);
                                    this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                    this._currentAngleMeasurement.target.entity = pickResult.entity;
                                    this._currentAngleMeasurement.originVisible = true;
                                    this._currentAngleMeasurement.originWireVisible = true;
                                    this._currentAngleMeasurement.cornerVisible = true;
                                    this._currentAngleMeasurement.cornerWireVisible = true;
                                    this._currentAngleMeasurement.targetVisible = true;
                                    this._currentAngleMeasurement.targetWireVisible = true;
                                    this._currentAngleMeasurement.angleVisible = true;
                                    this.angleMeasurementsPlugin.fire("measurementStart", this._currentAngleMeasurement);
                                } else {
                                    if (this.pointerLens) {
                                        this.pointerLens.cursorPos = null;
                                        this.pointerLens.snapped = false;

                                    }
                                }
                            }
                            this._touchState = WAITING_FOR_TARGET_LONG_TOUCH_END;
                           // console.log("touchstart: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_TARGET_LONG_TOUCH_END")

                            disableCameraNavigation();

                        }, this._longTouchTimeoutMs);

                        this._touchState = WAITING_FOR_TARGET_QUICK_TOUCH_END;
                       // console.log("touchstart: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_TARGET_QUICK_TOUCH_END")
                    }

                    touchId = touch.identifier;

                    break;


                default:
                    if (longTouchTimeout !== null) {
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                    }
                    this._touchState = TOUCH_CANCELING;
                  //  console.log("touchstart: this._touchState= default -> TOUCH_CANCELING")
                    return;
            }

        }, {passive: true});


        canvas.addEventListener("touchmove", (event) => {

            this.pointerCircle.stop();

            const currentNumTouches = event.touches.length;

            if (currentNumTouches !== 1 || event.changedTouches.length !== 1) {
                if (longTouchTimeout) {
                    clearTimeout(longTouchTimeout);
                    longTouchTimeout = null;
                }
                return;
            }

            const touch = event.touches[0];
            if (touch.identifier !== touchId) {
                return;
            }

            copyCanvasPos(touch, touchMoveCanvasPos);

            let snapPickResult;
            let pickResult;

            switch (this._touchState) {

                case WAITING_FOR_ORIGIN_LONG_TOUCH_END:
                    if (this.pointerLens) {
                        this.pointerLens.canvasPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapping,
                        snapToEdge: this._snapping
                    });
                    if (snapPickResult && (snapPickResult.snapped)) {
                        if (this.pointerLens) {
                            this.pointerLens.snappedCanvasPos = snapPickResult.snappedCanvasPos;
                            this.pointerLens.snapped = true;
                        }
                        pointerWorldPos.set(snapPickResult.worldPos);
                        this._currentAngleMeasurement.origin.worldPos = snapPickResult.worldPos;
                    } else {
                        pickResult = scene.pick({
                            canvasPos: touchMoveCanvasPos,
                            pickSurface: true
                        })
                        if (pickResult && pickResult.worldPos) {
                            if (this.pointerLens) {
                                this.pointerLens.cursorPos = pickResult.canvasPos;
                                this.pointerLens.snapped = false;
                            }
                            pointerWorldPos.set(pickResult.worldPos);
                            this._currentAngleMeasurement.origin.worldPos = pickResult.worldPos;
                        } else {
                            if (this.pointerLens) {
                                this.pointerLens.cursorPos = null;
                                this.pointerLens.snapped = false;
                            }
                        }
                    }
                    this._touchState = WAITING_FOR_ORIGIN_LONG_TOUCH_END;
                   // console.log("touchmove: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END -> WAITING_FOR_ORIGIN_LONG_TOUCH_END")
                    break;

                case WAITING_FOR_CORNER_LONG_TOUCH_END:
                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        if (this.pointerLens) {
                            this.pointerLens.visible = false;
                        }
                        this._touchState = TOUCH_CANCELING;
                     //   console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_CORNER -> TOUCH_CANCELING")
                        return;
                    }
                    if (this.pointerLens) {
                        this.pointerLens.canvasPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapping,
                        snapToEdge: this._snapping
                    });
                    if (snapPickResult && snapPickResult.worldPos) {
                        if (this.pointerLens) {
                            this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            this.pointerLens.snapped = true;
                        }
                        this._currentAngleMeasurement.corner.worldPos = snapPickResult.worldPos;
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
                            if (this.pointerLens) {
                                this.pointerLens.cursorPos = pickResult.canvasPos;
                                this.pointerLens.snapped = false;
                            }
                            this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.cornerWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                        }
                    }
                    this._touchState = WAITING_FOR_CORNER_LONG_TOUCH_END;
                    break;


                case WAITING_FOR_TARGET_LONG_TOUCH_END:
                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        if (this.pointerLens) {
                            this.pointerLens.visible = false;
                        }
                        this._touchState = TOUCH_CANCELING;
                      //  console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_CANCELING")
                        return;
                    }
                    if (this.pointerLens) {
                        this.pointerLens.canvasPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapping,
                        snapToEdge: this._snapping
                    });
                    if (snapPickResult && snapPickResult.worldPos) {
                        if (this.pointerLens) {
                            this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            this.pointerLens.snapped = true;
                        }
                        this._currentAngleMeasurement.target.worldPos = snapPickResult.worldPos;
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
                            if (this.pointerLens) {
                                this.pointerLens.cursorPos = pickResult.canvasPos;
                                this.pointerLens.snapped = false;
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
                    this._touchState = WAITING_FOR_TARGET_LONG_TOUCH_END;
                    break;

                default:
                    break;
            }
        }, {passive: true});

        canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {

            this.pointerCircle.stop();

            const numChangedTouches = event.changedTouches.length;

            if (numChangedTouches !== 1) {
                return;
            }

            const touch = event.changedTouches[0];
            if (touch.identifier !== touchId) {
                return;
            }

            if (longTouchTimeout) {
                clearTimeout(longTouchTimeout);
                longTouchTimeout = null;
            }

            copyCanvasPos(touch, touchEndCanvasPos);

            const touchX = touchEndCanvasPos[0];
            const touchY = touchEndCanvasPos[1];

            switch (this._touchState) {

                case WAITING_FOR_ORIGIN_QUICK_TOUCH_END: {
                    if (numChangedTouches !== 1 ||
                        touchX > touchStartCanvasPos[0] + touchTolerance ||
                        touchX < touchStartCanvasPos[0] - touchTolerance ||
                        touchY > touchStartCanvasPos[1] + touchTolerance ||
                        touchY < touchStartCanvasPos[1] - touchTolerance) {
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        return;
                    }
                    const pickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        pickSurface: true
                    });
                    if (pickResult && pickResult.worldPos) {
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
                        this._touchState = WAITING_FOR_CORNER_TOUCH_START;
                      //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_QUICK_TOUCH_END -> WAITING_FOR_CORNER_TOUCH_START")
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                      //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_QUICK_TOUCH_END -> WAITING_FOR_ORIGIN_TOUCH_START")
                    }
                }
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_ORIGIN_LONG_TOUCH_END:
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentAngleMeasurement) {
                        if (this.pointerLens) {
                            this.pointerLens.snapped = false;
                            this.pointerLens.visible = false;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                      //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (no measurement) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._touchState = WAITING_FOR_CORNER_TOUCH_START;
                       // console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (picked, begin measurement) -> WAITING_FOR_CORNER_TOUCH_START")
                    }
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_CORNER_QUICK_TOUCH_END: {
                    if (numChangedTouches !== 1 ||
                        touchX > touchStartCanvasPos[0] + touchTolerance ||
                        touchX < touchStartCanvasPos[0] - touchTolerance ||
                        touchY > touchStartCanvasPos[1] + touchTolerance ||
                        touchY < touchStartCanvasPos[1] - touchTolerance) {
                        this._touchState = WAITING_FOR_CORNER_TOUCH_START;
                        return;
                    }
                    const pickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        pickSurface: true
                    });
                    if (pickResult && pickResult.worldPos) {
                        this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                        this._currentAngleMeasurement.originVisible = true;
                        this._currentAngleMeasurement.originWireVisible = true;
                        this._currentAngleMeasurement.cornerVisible = true;
                        this._currentAngleMeasurement.cornerWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = false;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.angleVisible = false;
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                       // console.log("touchend: this._touchState= WAITING_FOR_CORNER_TOUCH_START -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                       // console.log("touchend: this._touchState= WAITING_FOR_CORNER_TOUCH_START -> WAITING_FOR_ORIGIN_TOUCH_START")
                    }

                }
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_CORNER_LONG_TOUCH_END:
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                  //  console.log("touchend: this._touchState= WAITING_FOR_CORNER_LONG_TOUCH_END  -> WAITING_FOR_ORIGIN_TOUCH_START")
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_TARGET_QUICK_TOUCH_END: {
                    if (numChangedTouches !== 1 ||
                        touchX > touchStartCanvasPos[0] + touchTolerance ||
                        touchX < touchStartCanvasPos[0] - touchTolerance ||
                        touchY > touchStartCanvasPos[1] + touchTolerance ||
                        touchY < touchStartCanvasPos[1] - touchTolerance) {
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                        return;
                    }
                    const pickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        pickSurface: true
                    });
                    if (pickResult && pickResult.worldPos) {
                        this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                        this._currentAngleMeasurement.originVisible = true;
                        this._currentAngleMeasurement.originWireVisible = true;
                        this._currentAngleMeasurement.cornerVisible = true;
                        this._currentAngleMeasurement.cornerWireVisible = true;
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.targetWireVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this.angleMeasurementsPlugin.fire("measurementEnd", this._currentAngleMeasurement);
                        this._currentAngleMeasurement = null;
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                        }
                    }
                    this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                   // console.log("touchend: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_ORIGIN_TOUCH_START")
                }
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_TARGET_LONG_TOUCH_END:
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentAngleMeasurement || !this._currentAngleMeasurement.targetVisible) {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                       // console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END (no target found) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._currentAngleMeasurement.clickable = true;
                        this.angleMeasurementsPlugin.fire("measurementEnd", this._currentAngleMeasurement);
                        this._currentAngleMeasurement = null;
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                       // console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END  -> WAITING_FOR_ORIGIN_TOUCH_START")
                    }
                    enableCameraNavigation();
                    break;
            }

        }, {passive: true});

        this._active = true;
    }

    /**
     * Deactivates this AngleMeasurementsTouchControl, making it unresponsive to input.
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

        const canvas = this.plugin.viewer.scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._onCanvasTouchStart);
        canvas.removeEventListener("touchend", this._onCanvasTouchEnd);

        this._active = false;
        this.plugin.viewer.cameraControl.active = true;
    }

    /**
     * Resets this AngleMeasurementsTouchControl.
     *
     * Destroys any {@link AngleMeasurement} under construction.
     *
     * Does nothing if the AngleMeasurementsTouchControl is not active.
     */
    reset() {
        if (!this._active) {
            return;
        }
        if (this._currentAngleMeasurement) {
            this.angleMeasurementsPlugin.fire("measurementCancel", this._currentAngleMeasurement);
            this._currentAngleMeasurement.destroy();
            this._currentAngleMeasurement = null;
        }
    }

    /**
     * Gets the {@link AngleMeasurement} under construction by this AngleMeasurementsTouchControl, if any.
     *
     * @returns {null|AngleMeasurement}
     */
    get currentMeasurement() {
        return this._currentAngleMeasurement;
    }

    /**
     * Destroys this AngleMeasurementsTouchControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
