import {math} from "../../viewer/scene/math/math.js";
import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";
import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";


const WAITING_FOR_ORIGIN_TOUCH_START = 0;
const WAITING_FOR_ORIGIN_QUICK_TOUCH_END = 1;
const WAITING_FOR_ORIGIN_LONG_TOUCH_END = 2;

const WAITING_FOR_TARGET_TOUCH_START = 3;
const WAITING_FOR_TARGET_QUICK_TOUCH_END = 4;
const WAITING_FOR_TARGET_LONG_TOUCH_END = 5;


/**
 * Creates {@link DistanceMeasurement}s from mouse and touch input.
 *
 * Belongs to a {@link DistanceMeasurementsPlugin}. Located at {@link DistanceMeasurementsPlugin#control}.
 *
 * Once the DistanceMeasurementControl is activated, the first click on any {@link Entity} begins constructing a {@link DistanceMeasurement}, fixing its origin to that Entity. The next click on any Entity will complete the DistanceMeasurement, fixing its target to that second Entity. The DistanceMeasurementControl will then wait for the next click on any Entity, to begin constructing another DistanceMeasurement, and so on, until deactivated.
 *
 * See {@link DistanceMeasurementsPlugin} for more info.
 *
 * @experimental
 */
export class DistanceMeasurementsLongTouchControl extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsLongTouchControl bound to the given DistanceMeasurementsPlugin.
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

        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;
        this._longTouchTimeoutMs = 300;
        this._snapToEdge = cfg.snapToEdge !== false;
        this._snapToVertex = cfg.snapToVertex !== false;
        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;

        this._attachPlugin(distanceMeasurementsPlugin, cfg);
    }

    _attachPlugin(distanceMeasurementsPlugin) {

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsLongTouchControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.distanceMeasurementsPlugin = distanceMeasurementsPlugin;

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsLongTouchControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = distanceMeasurementsPlugin;
    }

    /** Gets if this DistanceMeasurementsLongTouchControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex is enabled for this DistanceMeasurementsLongTouchControl.
     * This is `true` by default.
     * @param snapToVertex
     */
    set snapToVertex(snapToVertex) {
        this._snapToVertex = snapToVertex;
    }

    /**
     * Gets whether snap-to-vertex is enabled for this DistanceMeasurementsLongTouchControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapToVertex() {
        return this._snapToVertex;
    }

    /**
     * Sets whether snap-to-edge is enabled for this DistanceMeasurementsLongTouchControl.
     * This is `true` by default.
     * @param snapToEdge
     */
    set snapToEdge(snapToEdge) {
        this._snapToEdge = snapToEdge;
    }

    /**
     * Gets whether snap-to-edge is enabled for this DistanceMeasurementsLongTouchControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapToEdge() {
        return this._snapToEdge;
    }

    /**
     * Activates this DistanceMeasurementsLongTouchControl, ready to respond to input.
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

        const touchTolerance = 10;

        this._longTouchTimeout = null;

        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;

        const touchStartCanvasPos = math.vec2();
        const touchMoveCanvasPos = math.vec2();

        const disableCameraMouseControl = () => {
            this.plugin.viewer.cameraControl.active = false;
        }

        const enableCameraMouseControl = () => {
            this.plugin.viewer.cameraControl.active = true;
        }

        const cancel = () => {
            if (this._longTouchTimeout) {
                clearTimeout(this._longTouchTimeout);
                this._longTouchTimeout = null;
            }
            if (this._currentDistanceMeasurement) {
                this._currentDistanceMeasurement.destroy();
                this._currentDistanceMeasurement = null;
            }
            if (this.pointerLens) {
                this.pointerLens.visible = false;
            }
            enableCameraMouseControl();
            this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
        }

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

                case WAITING_FOR_ORIGIN_TOUCH_START:

                    if (currentNumTouches !== 1 && this._longTouchTimeout !== null) { // Two or more fingers down
                        cancel();
                        return;
                    }
                    const snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapToVertex,
                        snapToEdge: this._snapToEdge
                    });
                    if (snapPickResult && snapPickResult.snapped) {
                        pointerWorldPos.set(snapPickResult.worldPos);
                        this.pointerCircle.start(snapPickResult.snappedCanvasPos);
                    } else {
                        const pickResult = scene.pick({
                            canvasPos: touchMoveCanvasPos,
                            pickSurface: true
                        })
                        if (pickResult && pickResult.worldPos) {
                            pointerWorldPos.set(pickResult.worldPos);
                            this.pointerCircle.start(pickResult.canvasPos);
                        } else {
                            return;
                        }
                    }

                    this._longTouchTimeout = setTimeout(() => {
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
                                    worldPos: pointerWorldPos
                                },
                                target: {
                                    worldPos: pointerWorldPos
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
                        this._touchState = WAITING_FOR_ORIGIN_LONG_TOUCH_END;

                        // console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_LONG_TOUCH_END")

                        disableCameraMouseControl();

                    }, this._longTouchTimeoutMs);

                    this._touchState = WAITING_FOR_ORIGIN_QUICK_TOUCH_END;
                    //  console.log("touchstart: this._touchState= WAITING_FOR_ORIGIN_TOUCH_START -> WAITING_FOR_ORIGIN_QUICK_TOUCH_END")
                    break;

                case WAITING_FOR_TARGET_TOUCH_START:

                    if (currentNumTouches !== 1 && this._longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(this._longTouchTimeout);
                        this._longTouchTimeout = null;
                        return;
                    }
                    if (currentNumTouches === 1) { // One finger down
                        this._longTouchTimeout = setTimeout(() => {
                            this._longTouchTimeout = null;
                            if (currentNumTouches !== 1 ||
                                touchMoveCanvasPos[0] > touchStartCanvasPos[0] + touchTolerance ||
                                touchMoveCanvasPos[0] < touchStartCanvasPos[0] - touchTolerance ||
                                touchMoveCanvasPos[1] > touchStartCanvasPos[1] + touchTolerance ||
                                touchMoveCanvasPos[1] < touchStartCanvasPos[1] - touchTolerance) {
                                return;
                            }

                            if (this.pointerLens) {
                                this.pointerLens.visible = true;
                                this.pointerLens.canvasPos = touchStartCanvasPos;
                                this.pointerLens.snapped = false;
                            }

                            const snapPickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                snapToVertex: this._snapToVertex,
                                snapToEdge: this._snapToEdge
                            });
                            if (snapPickResult && snapPickResult.snapped) {
                                if (this.pointerLens) {
                                    this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    this.pointerLens.snapped = true;
                                }
                                this.pointerCircle.start(snapPickResult.snappedCanvasPos);
                                pointerWorldPos.set(snapPickResult.worldPos);
                                this._currentDistanceMeasurement.target.worldPos = snapPickResult.worldPos;
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
                                    this.pointerCircle.start(pickResult.canvasPos);
                                    pointerWorldPos.set(pickResult.worldPos);
                                    this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
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

                            disableCameraMouseControl();

                        }, this._longTouchTimeoutMs);

                        this._touchState = WAITING_FOR_TARGET_QUICK_TOUCH_END;
                        //  console.log("touchstart: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_TARGET_QUICK_TOUCH_END")
                    }

                    break;

                default:
                    cancel();
                    //    console.log("touchstart: this._touchState= default -> cancal()")
                    return;
            }

        }, {passive: true});


        canvas.addEventListener("touchmove", (event) => {

            this.pointerCircle.stop();

            const currentNumTouches = event.touches.length;

            if (currentNumTouches !== 1 || event.changedTouches.length !== 1) {
                return;
            }

            if (this._longTouchTimeout) {
                clearTimeout(this._longTouchTimeout);
                this._longTouchTimeout = null;
            }

            const touchX = event.touches[0].clientX;
            const touchY = event.touches[0].clientY;

            touchMoveCanvasPos.set([touchX, touchY]);

            let snapPickResult;
            let pickResult;

            switch (this._touchState) {

                case WAITING_FOR_ORIGIN_LONG_TOUCH_END:
                    if (this.pointerLens) {
                        this.pointerLens.canvasPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapToVertex,
                        snapToEdge: this._snapToEdge
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
                                    worldPos: snapPickResult.worldPos
                                },
                                target: {
                                    worldPos: snapPickResult.worldPos
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
                                        worldPos: pickResult.worldPos
                                    },
                                    target: {
                                        worldPos: pickResult.worldPos
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
                    break;

                case WAITING_FOR_TARGET_LONG_TOUCH_END:
                    if (currentNumTouches !== 1 && this._longTouchTimeout !== null) { // Two or more fingers down
                        cancel();
                        //  console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> cancel()")
                        return;
                    }
                    if (this.pointerLens) {
                        this.pointerLens.canvasPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapToVertex,
                        snapToEdge: this._snapToEdge
                    });
                    if (snapPickResult && snapPickResult.worldPos) {
                        if (this.pointerLens) {
                            this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            this.pointerLens.snapped = true;
                        }
                        this._currentDistanceMeasurement.target.worldPos = snapPickResult.worldPos;
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
                            this._currentDistanceMeasurement.targetVisible = true;
                            this._currentDistanceMeasurement.wireVisible = true;
                            this._currentDistanceMeasurement.labelsVisible = true;
                        }
                    }
                    break;

                default:
                    break;
            }
        }, {passive: true});

        canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {

            this.pointerCircle.stop();

            const currentNumTouches = event.changedTouches.length;

            if (currentNumTouches !== 1) {
                return;
            }

            if (this._longTouchTimeout) {
                clearTimeout(this._longTouchTimeout);
                this._longTouchTimeout = null;
            }

            const touchX = event.changedTouches[0].clientX;
            const touchY = event.changedTouches[0].clientY;

            switch (this._touchState) {

                case WAITING_FOR_ORIGIN_QUICK_TOUCH_END: {
                    if (currentNumTouches !== 1 ||
                        touchX > touchStartCanvasPos[0] + touchTolerance ||
                        touchX < touchStartCanvasPos[0] - touchTolerance ||
                        touchY > touchStartCanvasPos[1] + touchTolerance ||
                        touchY < touchStartCanvasPos[1] - touchTolerance) {
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        return;
                    }
                    // const pickResult = scene.pick({
                    //     canvasPos: touchMoveCanvasPos,
                    //     pickSurface: true
                    // });
                    // if (pickResult && pickResult.worldPos) {
                    this._currentDistanceMeasurement = plugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            worldPos: pointerWorldPos
                        },
                        target: {
                            worldPos: pointerWorldPos
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
                    // console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_QUICK_TOUCH_END -> WAITING_FOR_ORIGIN_TOUCH_START")
                    // } else {
                    //     if (this._currentDistanceMeasurement) {
                    //         this._currentDistanceMeasurement.destroy();
                    //     }
                    //     this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                    //     // console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_QUICK_TOUCH_END -> WAITING_FOR_ORIGIN_TOUCH_START")
                    // }
                    enableCameraMouseControl();
                    break;
                }

                case WAITING_FOR_ORIGIN_LONG_TOUCH_END: {
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentDistanceMeasurement) {
                        if (this.pointerLens) {
                            this.pointerLens.snapped = false;
                            this.pointerLens.visible = false;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        // console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (no measurement) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                        // console.log("touchend: this._touchState= WAITING_FOR_ORIGIN_LONG_TOUCH_END (picked, begin measurement) -> WAITING_FOR_TARGET_TOUCH_START")
                    }
                    enableCameraMouseControl();
                    break;
                }

                case WAITING_FOR_TARGET_QUICK_TOUCH_END: {
                    if (currentNumTouches !== 1 ||
                        touchX > touchStartCanvasPos[0] + touchTolerance ||
                        touchX < touchStartCanvasPos[0] - touchTolerance ||
                        touchY > touchStartCanvasPos[1] + touchTolerance ||
                        touchY < touchStartCanvasPos[1] - touchTolerance) {
                        this._touchState = WAITING_FOR_TARGET_TOUCH_START;
                        return;
                    }
                    this._currentDistanceMeasurement.target.worldPos = pointerWorldPos;
                    this._currentDistanceMeasurement.targetVisible = true;
                    this._currentDistanceMeasurement.wireVisible = true;
                    this._currentDistanceMeasurement.labelsVisible = true;
                    this._currentDistanceMeasurement = null;
                    this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                    // console.log("touchend: this._touchState= WAITING_FOR_TARGET_TOUCH_START -> WAITING_FOR_ORIGIN_TOUCH_START")
                    enableCameraMouseControl();
                    break;
                }

                case WAITING_FOR_TARGET_LONG_TOUCH_END: {
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentDistanceMeasurement || !this._currentDistanceMeasurement.targetVisible) {
                        if (this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement.destroy();
                            this._currentDistanceMeasurement = null;
                        }
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        // console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END (no target found) -> WAITING_FOR_ORIGIN_TOUCH_START")
                    } else {
                        this._currentDistanceMeasurement.clickable = true;
                        this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
                        // console.log("touchend: this._touchState= WAITING_FOR_TARGET_LONG_TOUCH_END  -> WAITING_FOR_ORIGIN_TOUCH_START")
                    }
                    enableCameraMouseControl();
                    break;
                }
            }
        }, {passive: true});
        this._active = true;
    }

    /**
     * Deactivates this DistanceMeasurementsLongTouchControl, making it unresponsive to input.
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
        if (this._longTouchTimeout) {
            clearTimeout(this._longTouchTimeout);
            this._longTouchTimeout = null;
        }
        this._touchState = WAITING_FOR_ORIGIN_TOUCH_START;
        const canvas = this.plugin.viewer.scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._onCanvasTouchStart);
        canvas.removeEventListener("touchend", this._onCanvasTouchEnd);
        if (this._currentDistanceMeasurement) {
            this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }
        this._active = false;
        this.plugin.viewer.cameraControl.active = true;
    }

    /**
     * Resets this DistanceMeasurementsLongTouchControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     *
     * Does nothing if the DistanceMeasurementsLongTouchControl is not active.
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
     * Destroys this DistanceMeasurementsLongTouchControl.
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }
}
