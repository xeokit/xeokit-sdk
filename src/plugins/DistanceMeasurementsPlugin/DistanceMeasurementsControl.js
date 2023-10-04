import {Dot} from "../lib/html/Dot.js";
import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";
import {Marker} from "../../viewer/index.js";

/**
 * Creates {@link DistanceMeasurement}s from mouse and touch input.
 *
 * Belongs to a {@link DistanceMeasurementsPlugin}. Located at {@link DistanceMeasurementsPlugin#control}.
 *
 * Once the DistanceMeasurementControl is activated, the first click on any {@link Entity} begins constructing a {@link DistanceMeasurement}, fixing its origin to that Entity. The next click on any Entity will complete the DistanceMeasurement, fixing its target to that second Entity. The DistanceMeasurementControl will then wait for the next click on any Entity, to begin constructing another DistanceMeasurement, and so on, until deactivated.
 *
 * See {@link DistanceMeasurementsPlugin} for more info.
 */
class DistanceMeasurementsControl extends Component {

    /**
     * @private
     */
    constructor(plugin, cfg = {}) {

        super(plugin.viewer.scene);

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._active = false;

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

        // Mouse input uses a combo of events that requires us to track
        // the current DistanceMeasurement under construction. This is not used for touch input, which
        // just uses touch-move-release to make a measurement.
        this._currentDistanceMeasurement = null;

        this._currentDistanceMeasurementDefaults = {
            wireVisible: null,
            axisVisible: null,
            xAxisVisible: null,
            yaxisVisible: null,
            zAxisVisible: null,
            targetVisible: null,
        }

        // Shows 2D canvas pos of touch INIT
        this._touchStartDot = new Dot(plugin._container, {
            fillColor: plugin.defaultColor,
            zIndex: plugin.zIndex + 1,
            visible: false
        });

        // Tracks 3D world pos of touch INIT, dynamically calculates 2D canvas pos
        this._touchStartMarker = new Marker(this, {
            id: "distanceMeasurementMarker"
        });

        // Routes 2D canvas pos from Marker to Dot
        this._touchStartMarker.on("canvasPos", (canvasPos) => {
            this._touchStartDot.setPos(canvasPos[0], canvasPos[1]);
        });

        // Event handles from CameraControl
        this._onMouseHoverSurface = null;
        this._onMouseHoverOff = null;
        this._onPickedNothing = null;

        // Event handles from Scene.input
        this._onInputMouseDown = null;
        this._onInputMouseUp = null;

        // Event handles from Canvas element
        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;

        this._mobileModeLongPressTimeMs = 500;
    }

    /** Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Activates this DistanceMeasurementsControl, ready to respond to input.
     *
     */
    activate() {

        if (this._active) {
            return;
        }

        const plugin = this.plugin;
        const scene = this.scene;
        const cameraControl = plugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;
        const input = scene.input;
        const startDot = this._touchStartDot;

        const pointerLens = plugin.pointerLens;

        const pickSurfacePrecisionEnabled = scene.pickSurfacePrecisionEnabled;

        let mouseHovering = false;
        const pointerWorldPos = math.vec3();
        const pointerCanvasPos = math.vec2();

        let pointerDownCanvasX;
        let pointerDownCanvasY;

        const mouseCanvasClickTolerance = 20;

        const FIRST_TOUCH_EXPECTED = 0;
        const SECOND_TOUCH_EXPECTED = 1;
        let touchState = FIRST_TOUCH_EXPECTED;
        const touchCanvasClickTolerance = 5;

        const touchStartCanvasPos = math.vec2();
        const touchEndCanvasPos = math.vec2();
        const touchStartWorldPos = math.vec3();

        // this._onMouseHoverSurface = cameraControl.on("hoverSnapOrSurface", event => {
        //     mouseHovering = true;
        //     pointerWorldPos.set(event.worldPos);
        //     pointerCanvasPos.set(event.canvasPos);
        //     if (touchState === FIRST_TOUCH_EXPECTED) {
        //         this.markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
        //         this.markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
        //         this.markerDiv.style.background = "pink";
        //         if (event.snappedToVertex || event.snappedToEdge) {
        //             this.markerDiv.style.background = "greenyellow";
        //             this.markerDiv.style.border = "2px solid green";
        //         } else {
        //             this.markerDiv.style.background = "pink";
        //             this.markerDiv.style.border = "2px solid red";
        //         }
        //     } else {
        //         this.markerDiv.style.marginLeft = `-10000px`;
        //         this.markerDiv.style.marginTop = `-10000px`;
        //     }
        //     canvas.style.cursor = "pointer";
        //     if (this._currentDistanceMeasurement) {
        //         this._currentDistanceMeasurement.wireVisible = this._currentDistanceMeasurement.wireVisible;
        //         this._currentDistanceMeasurement.axisVisible = this._currentDistanceMeasurement.axisVisible && this.plugin.defaultAxisVisible;
        //         this._currentDistanceMeasurement.xAxisVisible = this._currentDistanceMeasurement.xAxisVisible && this.plugin.defaultXAxisVisible;
        //         this._currentDistanceMeasurement.yAxisVisible = this._currentDistanceMeasurement.yAxisVisible && this.plugin.defaultYAxisVisible;
        //         this._currentDistanceMeasurement.zAxisVisible = this._currentDistanceMeasurement.zAxisVisible && this.plugin.defaultZAxisVisible;
        //         this._currentDistanceMeasurement.targetVisible = this._currentDistanceMeasurement.targetVisible;
        //         this._currentDistanceMeasurement.target.worldPos = pointerWorldPos;
        //         this.markerDiv.style.marginLeft = `-10000px`;
        //         this.markerDiv.style.marginTop = `-10000px`;
        //     }
        // });
        //
        // this._onInputMouseDown = input.on("mousedown", (coords) => {
        //     pointerDownCanvasX = coords[0];
        //     pointerDownCanvasY = coords[1];
        // });
        //
        // this._onInputMouseUp = input.on("mouseup", (coords) => {
        //     if (coords[0] > pointerDownCanvasX + mouseCanvasClickTolerance ||
        //         coords[0] < pointerDownCanvasX - mouseCanvasClickTolerance ||
        //         coords[1] > pointerDownCanvasY + mouseCanvasClickTolerance ||
        //         coords[1] < pointerDownCanvasY - mouseCanvasClickTolerance) {
        //         return;
        //     }
        //     if (this._currentDistanceMeasurement) {
        //         if (mouseHovering) {
        //             this._currentDistanceMeasurement.clickable = true;
        //             this.fire("measurementEnd", this._currentDistanceMeasurement);
        //             this._currentDistanceMeasurement = null;
        //         } else {
        //             this._currentDistanceMeasurement.destroy();
        //             this.fire("measurementCancel", this._currentDistanceMeasurement);
        //             this._currentDistanceMeasurement = null;
        //         }
        //     } else {
        //         if (mouseHovering) {
        //             this._currentDistanceMeasurement = plugin.createMeasurement({
        //                 id: math.createUUID(),
        //                 origin: {
        //                     worldPos: pointerWorldPos.slice()
        //                 },
        //                 target: {
        //                     worldPos: pointerWorldPos.slice()
        //                 },
        //                 approximate: true
        //             });
        //             this._currentDistanceMeasurement.axisVisible = this._currentDistanceMeasurement.axisVisible && this.plugin.defaultAxisVisible;
        //             this._currentDistanceMeasurement.xAxisVisible = this._currentDistanceMeasurement.xAxisVisible && this.plugin.defaultXAxisVisible;
        //             this._currentDistanceMeasurement.yAxisVisible = this._currentDistanceMeasurement.yAxisVisible && this.plugin.defaultYAxisVisible;
        //             this._currentDistanceMeasurement.zAxisVisible = this._currentDistanceMeasurement.zAxisVisible && this.plugin.defaultZAxisVisible;
        //             this._currentDistanceMeasurement.wireVisible = this._currentDistanceMeasurement.wireVisible;
        //             this._currentDistanceMeasurement.targetVisible = this._currentDistanceMeasurement.targetVisible;
        //             this._currentDistanceMeasurement.clickable = false;
        //             this.fire("measurementStart", this._currentDistanceMeasurement);
        //         }
        //     }
        // });
        //
        // this._onMouseHoverOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
        //     mouseHovering = false;
        //     this.markerDiv.style.marginLeft = `-100px`;
        //     this.markerDiv.style.marginTop = `-100px`;
        //     if (this._currentDistanceMeasurement) {
        //         this._currentDistanceMeasurement.wireVisible = false;
        //         this._currentDistanceMeasurement.targetVisible = false;
        //         this._currentDistanceMeasurement.axisVisible = false;
        //     }
        //     canvas.style.cursor = "default";
        // });

        //----------------------------------------------------------------------------------------------------
        // Touch input always assumes mobile devices
        //
        //----------------------------------------------------------------------------------------------------

        {


            let longTouchTimeout = null;

            const disableCameraMouseControl = () => {
                this.plugin.viewer.cameraControl.active = false;
                this.plugin.viewer.cameraControl._handlers[1]._active = false;
                this.plugin.viewer.cameraControl._handlers[5]._active = false;
            }

            const enableCameraMouseControl = () => {
                this.plugin.viewer.cameraControl.active = true;
                this.plugin.viewer.cameraControl._handlers[1]._active = true;
                this.plugin.viewer.cameraControl._handlers[5]._active = true;
            }

            const scheduleSurfacePickIfNeeded = () => {
                if (!this.plugin.viewer.cameraControl._handlers[2]._active) {
                    this.plugin.viewer.cameraControl._controllers.pickController.schedulePickSurface = true;
                    this.plugin.viewer.cameraControl._controllers.pickController.update();
                }
            }


            const FINDING_START = 0;
            const QUICK_TOUCH_FINDING_START = 1;
            const LONG_TOUCH_FINDING_START = 2;
            const FINDING_END = 3;
            const QUICK_TOUCH_FINDING_END = 4;
            const LONG_TOUCH_FINDING_END = 5;
            const CANCELING = 6;

            let state = FINDING_START;

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

                switch (state) {

                    case FINDING_START:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            state = CANCELING;
                            // console.log("touchstart: state= FINDING_START -> CANCELING")
                            return;
                        }
                        if (currentNumTouches === 1) { // One finger down
                            longTouchTimeout = setTimeout(() => {
                                longTouchTimeout = null;
                                if (currentNumTouches !== 1 ||
                                    touchMoveCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                                    return;   // Has moved
                                }
                                // Long touch
                                disableCameraMouseControl();
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.active = true;
                                    this.plugin.pointerLens.centerPos = touchStartCanvasPos;
                                    this.plugin.pointerLens.pointerPos = touchStartCanvasPos;
                                }

                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                                }
                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (this.plugin.pointerLens) {
                                        this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    }
                                    pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                    if (!this._currentDistanceMeasurement) {
                                        this._currentDistanceMeasurement = plugin.createMeasurement({
                                            id: math.createUUID(),
                                            origin: {
                                                worldPos: snapPickResult.snappedWorldPos
                                            },
                                            target: {
                                                worldPos: snapPickResult.snappedWorldPos
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
                                        this._currentDistanceMeasurement.origin.worldPos = snapPickResult.snappedWorldPos;
                                    }
                                    this.fire("measurementStart", this._currentDistanceMeasurement);
                                } else {
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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

                                        this.fire("measurementStart", this._currentDistanceMeasurement);
                                    } else {
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = null;
                                        }
                                    }
                                }
                                state = LONG_TOUCH_FINDING_START;
                                // console.log("touchstart: state= FINDING_START -> LONG_TOUCH_FINDING_START")
                            }, this._mobileModeLongPressTimeMs);
                            state = QUICK_TOUCH_FINDING_START;
                            // console.log("touchstart: state= FINDING_START -> QUICK_TOUCH_FINDING_START")
                        }
                        break;

                    case FINDING_END:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            return;
                        }
                        if (currentNumTouches === 1) { // One finger down
                            longTouchTimeout = setTimeout(() => {
                                longTouchTimeout = null;
                                if (currentNumTouches !== 1 ||
                                    touchMoveCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                                    touchMoveCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                                    // Has moved
                                    return;
                                }
                                // Long touch
                                disableCameraMouseControl();
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.active = true;
                                    this.plugin.pointerLens.centerPos = touchStartCanvasPos;
                                }

                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (this.plugin.pointerLens) {
                                        this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                                    }
                                    pointerWorldPos.set(snapPickResult.snappedWorldPos);
                                    this._currentDistanceMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
                                    this._currentDistanceMeasurement.targetVisible = true;
                                    this._currentDistanceMeasurement.wireVisible = true;
                                    this._currentDistanceMeasurement.labelsVisible = true;
                                    this.fire("measurementStart", this._currentDistanceMeasurement);
                                } else {
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                        }
                                        pointerWorldPos.set(pickResult.worldPos);
                                        this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                                        this._currentDistanceMeasurement.targetVisible = true;
                                        this._currentDistanceMeasurement.wireVisible = true;
                                        this._currentDistanceMeasurement.labelsVisible = true;
                                        this.fire("measurementStart", this._currentDistanceMeasurement);
                                    } else {
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = null;
                                        }
                                    }
                                }
                                state = LONG_TOUCH_FINDING_END;
                                // console.log("touchstart: state= FINDING_END -> LONG_TOUCH_FINDING_END")
                            }, this._mobileModeLongPressTimeMs);
                            state = QUICK_TOUCH_FINDING_END;
                            // console.log("touchstart: state= FINDING_END -> QUICK_TOUCH_FINDING_END")
                        }
                        break;

                    default:
                        if (longTouchTimeout !== null) {
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                        }
                        enableCameraMouseControl();
                        state = CANCELING;
                        // console.log("touchstart: state= default -> CANCELING")

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

                switch (state) {

                    case CANCELING:
                        break;

                    case FINDING_START:
                        state = FINDING_START;
                        // console.log("touchmove: state= FINDING_START -> FINDING_START")
                        break;

                    case QUICK_TOUCH_FINDING_START:
                        state = QUICK_TOUCH_FINDING_START;
                        // console.log("touchmove: state= QUICK_TOUCH_FINDING_START -> QUICK_TOUCH_FINDING_START")
                        break;

                    case LONG_TOUCH_FINDING_START:
                        // if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                        //     clearTimeout(longTouchTimeout);
                        //     longTouchTimeout = null;
                        //     if (this.plugin.pointerLens) {
                        //         this.plugin.pointerLens.active = false;
                        //     }
                        //     enableCameraMouseControl();
                        //     state = CANCELING;
                        //
                        //     // console.log("touchmove: state= QUICK_TOUCH_FINDING_START -> CANCELING")
                        //     return;
                        // }
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            }
                            pointerWorldPos.set(snapPickResult.snappedWorldPos);
                            if (!this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement = plugin.createMeasurement({
                                    id: math.createUUID(),
                                    origin: {
                                        worldPos: snapPickResult.snappedWorldPos
                                    },
                                    target: {
                                        worldPos: snapPickResult.snappedWorldPos
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
                                this._currentDistanceMeasurement.origin.worldPos = snapPickResult.snappedWorldPos;
                            }

                            this.fire("measurementStart", this._currentDistanceMeasurement);
                        } else {
                            pickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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

                                this.fire("measurementStart", this._currentDistanceMeasurement);
                            } else {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = null;
                                }
                            }
                        }
                        state = LONG_TOUCH_FINDING_START;
                        // console.log("touchmove: state= LONG_TOUCH_FINDING_START -> LONG_TOUCH_FINDING_START")
                        break;

                    case FINDING_END:
                        state = FINDING_END;
                        // console.log("touchmove: state= FINDING_END -> FINDING_END")
                        break;

                    case QUICK_TOUCH_FINDING_END:
                        state = FINDING_END;
                        // console.log("touchmove: state= QUICK_TOUCH_FINDING_END -> QUICK_TOUCH_FINDING_END")
                        break;

                    case LONG_TOUCH_FINDING_END:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.active = false;
                            }
                            enableCameraMouseControl();
                            state = CANCELING;
                            // console.log("touchmove: state= QUICK_TOUCH_FINDING_END -> CANCELING")
                            return;
                        }
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            }
                            this._currentDistanceMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
                            this._currentDistanceMeasurement.targetVisible = true;
                            this._currentDistanceMeasurement.wireVisible = true;
                            this._currentDistanceMeasurement.labelsVisible = true;
                        } else {
                            pickResult = scene.pick({
                                canvasPos: touchMoveCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
                                this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentDistanceMeasurement.targetVisible = true;
                                this._currentDistanceMeasurement.wireVisible = true;
                                this._currentDistanceMeasurement.labelsVisible = true;

                            }
                        }
                        state = LONG_TOUCH_FINDING_END;
                        break;

                    default:
                        state = FINDING_START;
                        // console.log("touchmove: state= default -> FINDING_START")
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

                const touchX = event.changedTouches[0].clientX;
                const touchY = event.changedTouches[0].clientY;

                touchEndCanvasPos.set([touchX, touchY]);

                switch (state) {

                    case CANCELING:
                        state = FINDING_START;
                        // console.log("touchend: state= CANCELING -> FINDING_START")
                        break;

                    case FINDING_START:
                        state = FINDING_START;
                        // console.log("touchend: state= FINDING_START -> FINDING_START")
                        break;

                    case FINDING_END:
                        state = FINDING_END;
                        // console.log("touchend: state= FINDING_END -> FINDING_END")
                        break;

                    case QUICK_TOUCH_FINDING_START:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                            if (this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement.destroy();
                                this._currentDistanceMeasurement = null;
                            }
                            state = FINDING_START;
                            // console.log("touchend: state= QUICK_TOUCH_FINDING_START (pointer moved, destroy measurement) -> FINDING_START")
                            break;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
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
                                this._currentDistanceMeasurement.originVisible = true;
                                this._currentDistanceMeasurement.targetVisible = false;
                                this._currentDistanceMeasurement.clickable = false;
                                this._currentDistanceMeasurement.wireVisible = false;
                                this.fire("measurementStart", this._currentDistanceMeasurement);
                          //      enableCameraMouseControl();
                                state = FINDING_END;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_START (picked, begin measurement) -> FINDING_END")
                                break;
                            } else {
                                if (this._currentDistanceMeasurement) { // Not likely needed, but safe
                                    this._currentDistanceMeasurement.destroy();
                                    this._currentDistanceMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_START (nothing picked)  -> FINDING_START")
                                break;
                            }
                        }

                    case LONG_TOUCH_FINDING_START:
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.active = false;
                        }
                        if (!this._currentDistanceMeasurement) {
                            this._currentDistanceMeasurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    worldPos: touchEndCanvasPos
                                },
                                target: {
                                    worldPos: touchEndCanvasPos
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
                        }
                        this.fire("measurementStart", this._currentDistanceMeasurement);
                      //  enableCameraMouseControl();
                        state = FINDING_END;
                        // console.log("touchend: state= LONG_TOUCH_FINDING_START (picked, begin measurement) -> FINDING_END")
                        break;

                    case QUICK_TOUCH_FINDING_END:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                            if (this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement.destroy();
                                this._currentDistanceMeasurement = null;
                            }
                            state = FINDING_END;
                            // console.log("touchend: (moved) state= QUICK_TOUCH_FINDING_END -> FINDING_END")
                            break;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
                                this._currentDistanceMeasurement.xAxisVisible = false;
                                this._currentDistanceMeasurement.yAxisVisible = false;
                                this._currentDistanceMeasurement.zAxisVisible = false;
                                this._currentDistanceMeasurement.wireVisible = true;
                                this._currentDistanceMeasurement.originVisible = true;
                                this._currentDistanceMeasurement.targetVisible = true;
                                this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentDistanceMeasurement.labelsVisible = true;
                                this._currentDistanceMeasurement.clickable = false;
                                this.fire("measurementEnd", this._currentDistanceMeasurement);
                                this._currentDistanceMeasurement = null;
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_END (picked, begin measurement) -> FINDING_START")
                                break;
                            } else {
                                if (this._currentDistanceMeasurement) {
                                    this._currentDistanceMeasurement.destroy();
                                    this._currentDistanceMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_START (nothing picked, destroy measurement) -> FINDING_START")
                                break;
                            }
                        }

                    case LONG_TOUCH_FINDING_END:
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.active = false;
                        }
                        const snapPickResult = scene.snapPick({
                            canvasPos: touchEndCanvasPos
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            }
                            this._currentDistanceMeasurement.xAxisVisible = false;
                            this._currentDistanceMeasurement.yAxisVisible = false;
                            this._currentDistanceMeasurement.zAxisVisible = false;
                            this._currentDistanceMeasurement.wireVisible = true;
                            this._currentDistanceMeasurement.labelsVisible = true;
                            this._currentDistanceMeasurement.originVisible = true;
                            this._currentDistanceMeasurement.targetVisible = true;
                            this._currentDistanceMeasurement.target.worldPos = snapPickResult.snappedWorldPos;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
                                this._currentDistanceMeasurement.xAxisVisible = false;
                                this._currentDistanceMeasurement.yAxisVisible = false;
                                this._currentDistanceMeasurement.zAxisVisible = false;
                                this._currentDistanceMeasurement.wireVisible = true;
                                this._currentDistanceMeasurement.labelsVisible = true;
                                this._currentDistanceMeasurement.originVisible = true;
                                this._currentDistanceMeasurement.targetVisible = true;
                                this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                            } else {
                                if (this._currentDistanceMeasurement) {
                                    this._currentDistanceMeasurement.destroy();
                                    this._currentDistanceMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_END (nothing picked, destroy measurement) -> FINDING_START")
                                break;
                            }
                        }

                        this._currentDistanceMeasurement.clickable = true;
                        this.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                        state = FINDING_START;
                        // console.log("touchend: state= LONG_TOUCH_FINDING_END -> FINDING_START")
                        break;

                    default:
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.active = false;
                        }
                        this._currentDistanceMeasurement = null;
                        state = FINDING_START;
                        // console.log("touchend: state= default -> FINDING_START")
                        break;
                }

            }, {passive: true});
        }

        this._active = true;
    }

    /**
     * Deactivates this DistanceMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     */
    deactivate() {

        if (!this._active) {
            return;
        }

        this._touchStartDot.setVisible(false);

        this.reset();

        const input = this.plugin.viewer.scene.input;
        input.off(this._onInputMouseDown);
        input.off(this._onInputMouseUp);

        const cameraControl = this.plugin.viewer.cameraControl;
        cameraControl.off(this._onMouseHoverSurface);
        cameraControl.off(this._onMouseHoverOff);
        cameraControl.off(this._onPickedNothing);

        const canvas = this.plugin.viewer.scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._onCanvasTouchStart);
        canvas.removeEventListener("touchend", this._onCanvasTouchEnd);

        if (this._currentDistanceMeasurement) {
            this.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }

        this._active = false;
    }

    /**
     * Resets this DistanceMeasurementsControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     *
     * Does nothing if the DistanceMeasurementsControl is not active.
     */
    reset() {
        if (!this._active) {
            return;
        }
        if (this._currentDistanceMeasurement) {
            this.fire("measurementCancel", this._currentDistanceMeasurement);
            this._currentDistanceMeasurement.destroy();
            this._currentDistanceMeasurement = null;
        }
    }

    /**
     * @private
     */
    destroy() {
        this._touchStartDot.destroy();
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

export {DistanceMeasurementsControl};