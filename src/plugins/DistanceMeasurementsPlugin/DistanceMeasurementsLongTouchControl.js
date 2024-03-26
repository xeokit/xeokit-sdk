import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";
import {PointerCircle} from "../../extras/PointerCircle/PointerCircle.js";
import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";


const TOUCH_FINDING_ORIGIN = 0;
const LONG_TOUCH_FINDING_ORIGIN = 1;
const TOUCH_FINDING_TARGET = 2;
const LONG_TOUCH_FINDING_TARGET = 3;
const TOUCH_CANCELING = 4;

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
        this._touchState = TOUCH_FINDING_ORIGIN;

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

        const touchTolerance = 20;

        let longTouchTimeout = null;

        const disableCameraMouseControl = () => {
            this.plugin.viewer.cameraControl.active = false;
        }

        const enableCameraMouseControl = () => {
            this.plugin.viewer.cameraControl.active = true;
        }

        this._touchState = TOUCH_FINDING_ORIGIN;

        const touchStartCanvasPos = math.vec2();
        const touchMoveCanvasPos = math.vec2();
        const touchEndCanvasPos = math.vec2();

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
                        console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_CANCELING")
                        return;
                    }
                    const snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapToVertex,
                        snapToEdge: this._snapToEdge
                    });
                    if (snapPickResult && (snapPickResult.snappedToVertex || snapPickResult.snappedToEdge)) {
                        pointerWorldPos.set(snapPickResult.worldPos);
                        this.pointerCircle.start(snapPickResult.canvasPos);
                    } else {
                        const pickResult = scene.pick({
                            canvasPos: touchMoveCanvasPos,
                            pickSurface: true
                        })
                        if (pickResult && pickResult.worldPos) {
                            pointerWorldPos.set(pickResult.worldPos);
                            this.pointerCircle.start(pickResult.canvasPos);
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
                        disableCameraMouseControl();
                        if (this.pointerLens) {
                            this.pointerLens.visible = true;
                            this.pointerLens.centerPos = touchStartCanvasPos;
                            this.pointerLens.cursorPos = touchStartCanvasPos;
                        }
                        // if (this.pointerLens) {
                        //     this.pointerLens.centerPos = touchMoveCanvasPos;
                        //     this.pointerLens.snapped = false;
                        // }
                        // if (this.pointerLens) {
                        //     this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                        //     this.pointerLens.snapped = true;
                        // }
                     //   pointerWorldPos.set(snapPickResult.snappedWorldPos);
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
                        // if (this.pointerLens) {
                        //     this.pointerLens.cursorPos = pickResult.canvasPos;
                        //     this.pointerLens.snapped = false;
                        // }

                        this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                        console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
                    }, this._longTouchTimeoutMs);
                    console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> QUICK_TOUCH_FINDING_ORIGIN")
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
                                touchMoveCanvasPos[0] > touchStartCanvasPos[0] + touchTolerance ||
                                touchMoveCanvasPos[0] < touchStartCanvasPos[0] - touchTolerance ||
                                touchMoveCanvasPos[1] > touchStartCanvasPos[1] + touchTolerance ||
                                touchMoveCanvasPos[1] < touchStartCanvasPos[1] - touchTolerance) {
                                // Has moved
                                return;
                            }
                            // Long touch
                            disableCameraMouseControl();
                            if (this.pointerLens) {
                                this.pointerLens.visible = true;
                                this.pointerLens.centerPos = touchStartCanvasPos;
                                this.pointerLens.snapped = false;
                            }

                            const snapPickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                snapToVertex: this._snapToVertex,
                                snapToEdge: this._snapToEdge
                            });
                            if (snapPickResult && snapPickResult.snappedWorldPos) {
                                if (this.pointerLens) {
                                    this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    this.pointerLens.snapped = true;
                                }
                                pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                this._currentDistanceMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
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
                            this._touchState = LONG_TOUCH_FINDING_TARGET;
                            console.log("touchstart: this._touchState= TOUCH_FINDING_TARGET -> LONG_TOUCH_FINDING_TARGET")
                        }, this._longTouchTimeoutMs);
                    }
                    break;

                default:
                    if (longTouchTimeout !== null) {
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                    }
                    enableCameraMouseControl();
                    this._touchState = TOUCH_CANCELING;
                    console.log("touchstart: this._touchState= default -> TOUCH_CANCELING")
                    return;
            }

        }, {passive: true});


        canvas.addEventListener("touchmove", (event) => {

            this.pointerCircle.stop();

            const currentNumTouches = event.touches.length;

            if (currentNumTouches !== 1 || event.changedTouches.length !== 1) {
                return;
            }

            if (longTouchTimeout) {
                clearTimeout(longTouchTimeout);
                longTouchTimeout = null;
            }

            const touchX = event.touches[0].clientX;
            const touchY = event.touches[0].clientY;

            touchMoveCanvasPos.set([touchX, touchY]);

            let snapPickResult;
            let pickResult;

            switch (this._touchState) {

                case TOUCH_CANCELING:
                    if (longTouchTimeout) {
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                    }
                    if (this._currentDistanceMeasurement) {
                        this._currentDistanceMeasurement.destroy();
                        this._currentDistanceMeasurement = null;
                    }
                    break;

                case TOUCH_FINDING_ORIGIN:
                    this._touchState = TOUCH_FINDING_ORIGIN;
                    console.log("touchmove: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_ORIGIN")
                    break;

                case LONG_TOUCH_FINDING_ORIGIN:
                    if (this.pointerLens) {
                        this.pointerLens.centerPos = touchMoveCanvasPos;
                    }
                    snapPickResult = scene.pick({
                        canvasPos: touchMoveCanvasPos,
                        snapToVertex: this._snapToVertex,
                        snapToEdge: this._snapToEdge
                    });
                    if (snapPickResult && (snapPickResult.snappedToVertex || snapPickResult.snappedToEdge)) {
                        if (this.pointerLens) {
                            this.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                    this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                    console.log("touchmove: this._touchState= LONG_TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
                    break;

                case TOUCH_FINDING_TARGET:
                    this._touchState = TOUCH_FINDING_TARGET;
                    console.log("touchmove: this._touchState= TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
                    break;

                case LONG_TOUCH_FINDING_TARGET:
                    if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                        if (this.pointerLens) {
                            this.pointerLens.visible = false;
                        }
                        enableCameraMouseControl();
                        this._touchState = TOUCH_CANCELING;
                        console.log("touchmove: this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_CANCELING")
                        return;
                    }
                    if (this.pointerLens) {
                        this.pointerLens.centerPos = touchMoveCanvasPos;
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
                    this._touchState = LONG_TOUCH_FINDING_TARGET;
                    break;

                default:
                    this._touchState = TOUCH_FINDING_ORIGIN;
                    console.log("touchmove: this._touchState= default -> TOUCH_FINDING_ORIGIN")
                    break;
            }
        }, {passive: true});

        canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {

            this.pointerCircle.stop();

            const currentNumTouches = event.changedTouches.length;

            if (currentNumTouches !== 1) {
                return;
            }

            enableCameraMouseControl();

            if (longTouchTimeout) {
                clearTimeout(longTouchTimeout);
                longTouchTimeout = null;
            }

            const touchX = event.changedTouches[0].clientX;
            const touchY = event.changedTouches[0].clientY;

            touchEndCanvasPos.set([touchX, touchY]);

            switch (this._touchState) {

                case TOUCH_CANCELING:
                    if (longTouchTimeout) {
                        clearTimeout(longTouchTimeout);
                        longTouchTimeout = null;
                    }
                    if (this._currentDistanceMeasurement) {
                        this._currentDistanceMeasurement.destroy();
                        this._currentDistanceMeasurement = null;
                    }
                    this._touchState = TOUCH_FINDING_ORIGIN;
                    console.log("touchend: this._touchState= TOUCH_CANCELING -> TOUCH_FINDING_ORIGIN")
                    break;

                case TOUCH_FINDING_ORIGIN:
                    this._touchState = TOUCH_FINDING_ORIGIN;
                    console.log("touchend: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_ORIGIN")
                    break;

                case TOUCH_FINDING_TARGET:
                    this._touchState = TOUCH_FINDING_TARGET;
                    console.log("touchend: this._touchState= TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
                    break;

                case LONG_TOUCH_FINDING_ORIGIN:
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentDistanceMeasurement) {
                        if (this.pointerLens) {
                            this.pointerLens.snapped = false;
                            this.pointerLens.visible = false;
                        }
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (no measurement) -> TOUCH_FINDING_ORIGIN")
                    } else {
                        this._touchState = TOUCH_FINDING_TARGET;
                        console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (picked, begin measurement) -> TOUCH_FINDING_TARGET")
                    }
                    break;

                case LONG_TOUCH_FINDING_TARGET:
                    if (this.pointerLens) {
                        this.pointerLens.visible = false;
                    }
                    if (!this._currentDistanceMeasurement || !this._currentDistanceMeasurement.targetVisible) {
                        if (this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement.destroy();
                            this._currentDistanceMeasurement = null;
                        }
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET (no target found) -> TOUCH_FINDING_ORIGIN")
                    } else {
                        this._currentDistanceMeasurement.clickable = true;
                        this.distanceMeasurementsPlugin.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                        this._touchState = TOUCH_FINDING_ORIGIN;
                        console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET  -> TOUCH_FINDING_ORIGIN")
                    }
                    break;

                // case  TOUCH_CANCELING:
                //      if (this.pointerLens) {
                //          this.pointerLens.visible = false;
                //      }
                //      this._currentDistanceMeasurement = null;
                //      this._touchState = TOUCH_FINDING_ORIGIN;
                //     console.log("touchend: this._touchState= default -> TOUCH_FINDING_ORIGIN")
                //      break;
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
        const canvas = this.plugin.viewer.scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._onCanvasTouchStart);
        canvas.removeEventListener("touchend", this._onCanvasTouchEnd);
        if (this._currentDistanceMeasurement) {
            this.distanceMeasurementsPlugin.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }
        this._active = false;
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
