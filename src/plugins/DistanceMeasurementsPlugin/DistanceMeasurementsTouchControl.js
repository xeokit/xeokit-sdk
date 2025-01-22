import {math} from "../../viewer/scene/math/math.js";
import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";
import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";
import {transformToNode} from "../lib/ui/index.js";

const WAITING_FOR_ORIGIN_TOUCH_START = 0;
const WAITING_FOR_ORIGIN_QUICK_TOUCH_END = 1;
const WAITING_FOR_ORIGIN_LONG_TOUCH_END = 2;

const WAITING_FOR_TARGET_TOUCH_START = 3;
const WAITING_FOR_TARGET_QUICK_TOUCH_END = 4;
const WAITING_FOR_TARGET_LONG_TOUCH_END = 5;

const TOUCH_CANCELING = 7;

const tmpVec2 = math.vec2();

/**
 * Creates {@link DistanceMeasurement}s from touch input.
 *
 * See {@link DistanceMeasurementsPlugin} for more info.
 *
 */
export class DistanceMeasurementsTouchControl extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsTouchControl bound to the given DistanceMeasurementsPlugin.
     */
    constructor(distanceMeasurementsPlugin, cfg = {}) {

        super(distanceMeasurementsPlugin.viewer.scene);

        this.pointerLens = cfg.pointerLens;
        this.pointerCircle = new PointerCircle(distanceMeasurementsPlugin.viewer);

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

        this._currentDistanceMeasurement = null;

        this._currentDistanceMeasurementInitState = {
            wireVisible: null,
            axisVisible: null,
            xAxisVisible: null,
            yaxisVisible: null,
            zAxisVisible: null,
            targetVisible: null,
        }

        this._longTouchTimeoutMs = 300;
        this._snapping = cfg.snapping !== false;

        this._attachPlugin(distanceMeasurementsPlugin, cfg);
    }

    _attachPlugin(distanceMeasurementsPlugin) {

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsTouchControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.distanceMeasurementsPlugin = distanceMeasurementsPlugin;

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsTouchControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = distanceMeasurementsPlugin;
    }

    /** Gets if this DistanceMeasurementsTouchControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     *
     * This is `true` by default.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-edge for this DistanceMeasurementsTouchControl.
     */
    set snapping(snapping) {
        this._snapping = snapping;
    }

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     */
    get snapping() {
        return this._snapping;
    }

    /**
     * Activates this DistanceMeasurementsTouchControl, ready to respond to input.
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
            if (this._currentDistanceMeasurement) {
                this._currentDistanceMeasurement.destroy();
                this._currentDistanceMeasurement = null;
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
                        snapping: this._snapping,
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
                        // pointerWorldPos.set(snapPickResult.snappedWorldPos);
                        if (!this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    worldPos: pointerWorldPos,
                                    entity: snapPickResult.entity
                                },
                                target: {
                                    worldPos: pointerWorldPos,
                                    entity: snapPickResult.entity
                                }
                            });
                            this._currentDistanceMeasurement.labelsVisible = false;
                            this._currentDistanceMeasurement.xAxisVisible = false;
                            this._currentDistanceMeasurement.yAxisVisible = false;
                            this._currentDistanceMeasurement.zAxisVisible = false;
                            this._currentDistanceMeasurement.wireVisible = false;
                            this._currentDistanceMeasurement.originVisible = true;
                            this._currentDistanceMeasurement.targetVisible = false;
                            this._currentDistanceMeasurement.clickable = false;
                        } else {
                            this._currentDistanceMeasurement.origin.worldPos = pointerWorldPos;
                        }
                        this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
                        // if (this.pointerLens) {
                        //     this.pointerLens.cursorPos = pickResult.canvasPos;
                        //     this.pointerLens.snapped = false;
                        // }
                        this._touchState = WAITING_FOR_ORIGIN_LONG_TOUCH_END;
                        // console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_LONG_TOUCH_END")
                        disableCameraNavigation();
                    }, this._longTouchTimeoutMs);
                    this._touchState = WAITING_FOR_ORIGIN_QUICK_TOUCH_END;
                    // console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_QUICK_TOUCH_END")

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
                                this._currentDistanceMeasurement.target.worldPos = snapPickResult.worldPos;
                                this._currentDistanceMeasurement.target.entity = snapPickResult.entity;
                                this._currentDistanceMeasurement.targetVisible = true;
                                this._currentDistanceMeasurement.wireVisible = true;
                                this._currentDistanceMeasurement.labelsVisible = true;
                                this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
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
                                    this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                                    this._currentDistanceMeasurement.target.entity = pickResult.entity;
                                    this._currentDistanceMeasurement.targetVisible = true;
                                    this._currentDistanceMeasurement.wireVisible = true;
                                    this._currentDistanceMeasurement.labelsVisible = true;
                                    this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
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
                    // console.log("touchstart: this._touchState= default -> TOUCH_CANCELING")
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
                        if (!this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    worldPos: snapPickResult.worldPos,
                                    entity: snapPickResult.entity
                                },
                                target: {
                                    worldPos: snapPickResult.worldPos,
                                    entity: snapPickResult.entity
                                }
                            });
                            this._currentDistanceMeasurement.labelsVisible = false;
                            this._currentDistanceMeasurement.xAxisVisible = false;
                            this._currentDistanceMeasurement.yAxisVisible = false;
                            this._currentDistanceMeasurement.zAxisVisible = false;
                            this._currentDistanceMeasurement.wireVisible = false;
                            this._currentDistanceMeasurement.originVisible = true;
                            this._currentDistanceMeasurement.targetVisible = false;
                            this._currentDistanceMeasurement.clickable = false;
                        } else {
                            this._currentDistanceMeasurement.origin.worldPos = snapPickResult.worldPos;
                        }

                        this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
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
                            if (!this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement = plugin.createMeasurement({
                                    id: math.createUUID(),
                                    origin: {
                                        worldPos: pickResult.worldPos,
                                        entity: pickResult.entity
                                    },
                                    target: {
                                        worldPos: pickResult.worldPos,
                                        entity: pickResult.entity
                                    }
                                });
                                this._currentDistanceMeasurement.labelsVisible = false;
                                this._currentDistanceMeasurement.xAxisVisible = false;
                                this._currentDistanceMeasurement.yAxisVisible = false;
                                this._currentDistanceMeasurement.zAxisVisible = false;
                                this._currentDistanceMeasurement.wireVisible = false;
                                this._currentDistanceMeasurement.originVisible = true;
                                this._currentDistanceMeasurement.targetVisible = false;
                                this._currentDistanceMeasurement.clickable = false;
                            } else {
                                this._currentDistanceMeasurement.origin.worldPos = pickResult.worldPos;
                            }

                            this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
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

                // case WAITING_FOR_TARGET_TOUCH_START:
                //     this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                //     console.log("touchmove: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_TARGET_TOUCH_START")
                //     break;

                case WAITING_FOR_TARGET_LONG_TOUCH_END:
                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        if (this.pointerLens) {
                            this.pointerLens.visible = false;
                        }
                        this._touchState = TOUCH_CANCELING;
                        // console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_CANCELING")
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
                        this._currentDistanceMeasurement.target.worldPos = snapPickResult.worldPos;
                        this._currentDistanceMeasurement.target.entity = snapPickResult.entity;
                        this._currentDistanceMeasurement.targetVisible = true;
                        this._currentDistanceMeasurement.wireVisible = true;
                        this._currentDistanceMeasurement.labelsVisible = true;
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
                            this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                            this._currentDistanceMeasurement.target.entity = pickResult.entity;
                            this._currentDistanceMeasurement.targetVisible = true;
                            this._currentDistanceMeasurement.wireVisible = true;
                            this._currentDistanceMeasurement.labelsVisible = true;

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
                        this._currentDistanceMeasurement = plugin.createMeasurement({
                            id: math.createUUID(),
                            origin: {
                                worldPos: pickResult.worldPos,
                                entity: pickResult.entity
                            },
                            target: {
                                worldPos: pickResult.worldPos,
                                entity: pickResult.entity
                            }
                        });
                        this._currentDistanceMeasurement.labelsVisible = false;
                        this._currentDistanceMeasurement.xAxisVisible = false;
                        this._currentDistanceMeasurement.yAxisVisible = false;
                        this._currentDistanceMeasurement.zAxisVisible = false;
                        this._currentDistanceMeasurement.wireVisible = false;
                        this._currentDistanceMeasurement.originVisible = true;
                        this._currentDistanceMeasurement.targetVisible = false;
                        this._currentDistanceMeasurement.clickable = false;
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                        this.distanceMeasurementsPlugin.fire("measurementStart", this._currentDistanceMeasurement);
                        //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_QUICK_TOUCH_END -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        if (this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement.destroy();
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
                    if (!this._currentDistanceMeasurement) {
                        if (this.pointerLens) {
                            this.pointerLens.snapped = false;
                            this.pointerLens.visible = false;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (no measurement) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                        //  console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (picked, begin measurement) -> WAITING_FOR_TARGET_TOUCH_START")
                    }
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
                        this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                        this._currentDistanceMeasurement.target.entity = pickResult.entity;
                        this._currentDistanceMeasurement.targetVisible = true;
                        this._currentDistanceMeasurement.wireVisible = true;
                        this._currentDistanceMeasurement.labelsVisible = true;
                        this._currentDistanceMeasurement.xAxisVisible = true;
                        this._currentDistanceMeasurement.yAxisVisible = true;
                        this._currentDistanceMeasurement.zAxisVisible = true;
                        this._currentDistanceMeasurement.clickable = true;
                        this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                    } else {
                        if (this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement.destroy();
                            this._currentDistanceMeasurement = null;
                        }
                    }
                    this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                    //  console.log("touchend: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_ORIGIN_TOUCH_START")
                }
                    enableCameraNavigation();
                    break;

                case WAITING_FOR_TARGET_LONG_TOUCH_END:
                    console.log('long touch');
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentDistanceMeasurement || !this._currentDistanceMeasurement.targetVisible) {
                        if (this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement.destroy();
                            this._currentDistanceMeasurement = null;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        //  console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END (no target found) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._currentDistanceMeasurement.clickable = true;
                        this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        //  console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END  -> WAITING_FOR_ORIGIN_TOUCH_START")
                    }
                    enableCameraNavigation();
                    break;
            }

        }, {passive: true});

        this._active = true;
    }

    /**
     * Deactivates this DistanceMeasurementsTouchControl, making it unresponsive to input.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
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
     * Resets this DistanceMeasurementsTouchControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     *
     * Does nothing if the DistanceMeasurementsTouchControl is not active.
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
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsTouchControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     */
    get currentMeasurement() {
        return this._currentDistanceMeasurement;
    }

    /**
     * Destroys this DistanceMeasurementsTouchControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
