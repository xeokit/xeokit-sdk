import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";


const TOUCH_FINDING_ORIGIN = 0;
const QUICK_TOUCH_FINDING_ORIGIN = 1;
const LONG_TOUCH_FINDING_ORIGIN = 2;
const TOUCH_FINDING_TARGET = 3;
const QUICK_TOUCH_FINDING_TARGET = 4;
const LONG_TOUCH_FINDING_TARGET = 5;
const TOUCH_CANCELING = 6;


const MOUSE_FIRST_CLICK_EXPECTED = 0;
const MOUSE_SECOND_CLICK_EXPECTED = 1;

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

        this._onCameraControlHoverSnapOrSurface = null;
        this._onCameraControlHoverSnapOrSurfaceOff = null;
        this._onInputMouseDown = null;
        this._onInputMouseUp = null;

        // Event handles from Canvas element
        this._onCanvasTouchStart = null;
        this._onCanvasTouchEnd = null;

        this._mobileModeLongPressTimeMs = 500;

        this._snapEdge = cfg.snapEdge !== false;
        this._snapVertex = cfg.snapVertex !== false;

        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;
        this._touchState = TOUCH_FINDING_ORIGIN;
    }

    /** Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets whether snap-to-vertex is enabled for this DistanceMeasurementsControl.
     * This is `true` by default.
     * @param snapVertex
     */
    set snapVertex(snapVertex) {
        this._snapVertex = snapVertex;
    }

    /**
     * Gets whether snap-to-vertex is enabled for this DistanceMeasurementsControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapVertex() {
        return this._snapVertex;
    }

    /**
     * Sets whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     * This is `true` by default.
     * @param snapEdge
     */
    set snapEdge(snapEdge) {
        this._snapEdge = snapEdge;
    }

    /**
     * Gets whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     * This is `true` by default.
     * @returns {*}
     */
    get snapEdge() {
        return this._snapEdge;
    }

    /**
     * Activates this DistanceMeasurementsControl, ready to respond to input.
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

        const pointerLens = plugin.pointerLens;

        let mouseHovering = false;
        const pointerWorldPos = math.vec3();
        const pointerCanvasPos = math.vec2();

        let pointerDownCanvasX;
        let pointerDownCanvasY;

        const clickTolerance = 20;


        this._mouseState = MOUSE_FIRST_CLICK_EXPECTED;


        //----------------------------------------------------------------------------------------------------
        // Mouse input
        //----------------------------------------------------------------------------------------------------

        {

            this._onCameraControlHoverSnapOrSurface = cameraControl.on("hoverSnapOrSurface", event => {
                mouseHovering = true;
                pointerWorldPos.set(event.worldPos);
                pointerCanvasPos.set(event.canvasPos);
                if (this._mouseState === MOUSE_FIRST_CLICK_EXPECTED) {
                    this.markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
                    this.markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
                    this.markerDiv.style.background = "pink";
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
                } else {
                    this.markerDiv.style.marginLeft = `-10000px`;
                    this.markerDiv.style.marginTop = `-10000px`;
                }
                canvas.style.cursor = "pointer";
                if (this._currentDistanceMeasurement) {
                    this._currentDistanceMeasurement.wireVisible = this._currentDistanceMeasurementInitState.wireVisible;
                    this._currentDistanceMeasurement.axisVisible = this._currentDistanceMeasurementInitState.axisVisible && this.plugin.defaultAxisVisible;
                    this._currentDistanceMeasurement.xAxisVisible = this._currentDistanceMeasurementInitState.xAxisVisible && this.plugin.defaultXAxisVisible;
                    this._currentDistanceMeasurement.yAxisVisible = this._currentDistanceMeasurementInitState.yAxisVisible && this.plugin.defaultYAxisVisible;
                    this._currentDistanceMeasurement.zAxisVisible = this._currentDistanceMeasurementInitState.zAxisVisible && this.plugin.defaultZAxisVisible;
                    this._currentDistanceMeasurement.targetVisible = this._currentDistanceMeasurementInitState.targetVisible;
                    this._currentDistanceMeasurement.target.worldPos = pointerWorldPos.slice();
                    this.markerDiv.style.marginLeft = `-10000px`;
                    this.markerDiv.style.marginTop = `-10000px`;
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
                        this.fire("measurementEnd", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                    } else {
                        this._currentDistanceMeasurement.destroy();
                        this.fire("measurementCancel", this._currentDistanceMeasurement);
                        this._currentDistanceMeasurement = null;
                    }
                } else {
                    if (mouseHovering) {
                        this._currentDistanceMeasurement = plugin.createMeasurement({
                            id: math.createUUID(),
                            origin: {
                                worldPos: pointerWorldPos.slice()
                            },
                            target: {
                                worldPos: pointerWorldPos.slice()
                            },
                            approximate: true
                        });
                        this._currentDistanceMeasurementInitState.axisVisible = this._currentDistanceMeasurement.axisVisible && this.plugin.defaultAxisVisible;
                        this._currentDistanceMeasurementInitState.xAxisVisible = this._currentDistanceMeasurement.xAxisVisible && this.plugin.defaultXAxisVisible;
                        this._currentDistanceMeasurementInitState.yAxisVisible = this._currentDistanceMeasurement.yAxisVisible && this.plugin.defaultYAxisVisible;
                        this._currentDistanceMeasurementInitState.zAxisVisible = this._currentDistanceMeasurement.zAxisVisible && this.plugin.defaultZAxisVisible;
                        this._currentDistanceMeasurementInitState.wireVisible = this._currentDistanceMeasurement.wireVisible;
                        this._currentDistanceMeasurementInitState.targetVisible = this._currentDistanceMeasurement.targetVisible;
                        this._currentDistanceMeasurement.clickable = false;
                        this.fire("measurementStart", this._currentDistanceMeasurement);
                    }
                }
            });

            this._onCameraControlHoverSnapOrSurfaceOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
                if (pointerLens) {
                    pointerLens.visible = true;
                    pointerLens.centerPos = event.cursorPos || event.canvasPos;
                    pointerLens.cursorPos = event.canvasPos;
                }
                mouseHovering = false;
                this.markerDiv.style.marginLeft = `-100px`;
                this.markerDiv.style.marginTop = `-100px`;
                if (this._currentDistanceMeasurement) {
                    this._currentDistanceMeasurement.wireVisible = false;
                    this._currentDistanceMeasurement.targetVisible = false;
                    this._currentDistanceMeasurement.axisVisible = false;
                }
                canvas.style.cursor = "default";
            });
        }

        //----------------------------------------------------------------------------------------------------
        // Touch input always assumes mobile devices
        //----------------------------------------------------------------------------------------------------

        {
            let longTouchTimeout = null;

            const disableCameraMouseControl = () => {
                this.plugin.viewer.cameraControl.active = false;
            }

            const enableCameraMouseControl = () => {
                this.plugin.viewer.cameraControl.active = true;
            }

            const scheduleSurfacePickIfNeeded = () => {
                if (!this.plugin.viewer.cameraControl._handlers[2]._active) {
                    this.plugin.viewer.cameraControl._controllers.pickController.schedulePickSurface = true;
                    this.plugin.viewer.cameraControl._controllers.pickController.update();
                }
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
                           // console.log("touchstart: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_CANCELING")
                            return;
                        }
                        longTouchTimeout = setTimeout(() => {

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
                                pointerLens.snapped = false;
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
                                    if (pointerLens) {
                                        pointerLens.cursorPos = pickResult.canvasPos;
                                        pointerLens.snapped = false;
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
                                    pointerLens.snapped = false;
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
                                        if (pointerLens) {
                                            pointerLens.cursorPos = pickResult.canvasPos;
                                            pointerLens.snapped = false;
                                        }
                                        pointerWorldPos.set(pickResult.worldPos);
                                        this._currentDistanceMeasurement.target.worldPos = pickResult.worldPos;
                                        this._currentDistanceMeasurement.targetVisible = true;
                                        this._currentDistanceMeasurement.wireVisible = true;
                                        this._currentDistanceMeasurement.labelsVisible = true;
                                        this.fire("measurementStart", this._currentDistanceMeasurement);
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
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
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
                                if (pointerLens) {
                                    pointerLens.cursorPos = null;
                                    pointerLens.snapped = false;
                                }
                            }
                        }
                        this._touchState = LONG_TOUCH_FINDING_ORIGIN;
                       // console.log("touchmove: this._touchState= LONG_TOUCH_FINDING_ORIGIN -> LONG_TOUCH_FINDING_ORIGIN")
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
                                if (pointerLens) {
                                    pointerLens.cursorPos = pickResult.canvasPos;
                                    pointerLens.snapped = false;
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
                       // console.log("touchend: this._touchState= TOUCH_CANCELING -> TOUCH_FINDING_ORIGIN")
                        break;

                    case TOUCH_FINDING_ORIGIN:
                        this._touchState = TOUCH_FINDING_ORIGIN;
                       // console.log("touchend: this._touchState= TOUCH_FINDING_ORIGIN -> TOUCH_FINDING_ORIGIN")
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
                            if (this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement.destroy();
                                this._currentDistanceMeasurement = null;
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
                                this._touchState = TOUCH_FINDING_TARGET;
                               // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (picked, begin measurement) -> TOUCH_FINDING_TARGET")
                                break;
                            } else {
                                if (this._currentDistanceMeasurement) { // Not likely needed, but safe
                                    this._currentDistanceMeasurement.destroy();
                                    this._currentDistanceMeasurement = null;
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
                        if (!this._currentDistanceMeasurement) {
                            if (pointerLens) {
                                pointerLens.snapped = false;
                                pointerLens.visible = false;
                            }
                            this._touchState = TOUCH_FINDING_ORIGIN;
                           // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (no measurement) -> TOUCH_FINDING_ORIGIN")
                        } else {
                            this._touchState = TOUCH_FINDING_TARGET;
                           // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_ORIGIN (picked, begin measurement) -> TOUCH_FINDING_TARGET")
                        }
                        break;

                    case QUICK_TOUCH_FINDING_TARGET:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + clickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - clickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + clickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - clickTolerance) {
                            if (this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement.destroy();
                                this._currentDistanceMeasurement = null;
                            }
                            this._touchState = TOUCH_FINDING_TARGET;
                           // console.log("touchend: (moved) this._touchState= QUICK_TOUCH_FINDING_TARGET -> TOUCH_FINDING_TARGET")
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
                                this._touchState = TOUCH_FINDING_ORIGIN;
                               // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_TARGET (picked, begin measurement) -> TOUCH_FINDING_ORIGIN")
                            } else {
                                if (this._currentDistanceMeasurement) {
                                    this._currentDistanceMeasurement.destroy();
                                    this._currentDistanceMeasurement = null;
                                }
                                this._touchState = TOUCH_FINDING_ORIGIN;
                               // console.log("touchend: this._touchState= QUICK_TOUCH_FINDING_ORIGIN (nothing picked, destroy measurement) -> TOUCH_FINDING_ORIGIN")

                            }
                        }
                        break;

                    case LONG_TOUCH_FINDING_TARGET:
                        if (pointerLens) {
                            pointerLens.visible = false;
                        }
                        if (!this._currentDistanceMeasurement || !this._currentDistanceMeasurement.targetVisible) {
                            if (this._currentDistanceMeasurement) {
                                this._currentDistanceMeasurement.destroy();
                                this._currentDistanceMeasurement = null;
                            }
                            this._touchState = TOUCH_FINDING_ORIGIN;
                           // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET (no target found) -> TOUCH_FINDING_ORIGIN")
                        } else {
                            this._currentDistanceMeasurement.clickable = true;
                            this.fire("measurementEnd", this._currentDistanceMeasurement);
                            this._currentDistanceMeasurement = null;
                            this._touchState = TOUCH_FINDING_ORIGIN;
                           // console.log("touchend: this._touchState= LONG_TOUCH_FINDING_TARGET  -> TOUCH_FINDING_ORIGIN")
                        }
                        break;

                    // case  TOUCH_CANCELING:
                    //      if (pointerLens) {
                    //          pointerLens.visible = false;
                    //      }
                    //      this._currentDistanceMeasurement = null;
                    //      this._touchState = TOUCH_FINDING_ORIGIN;
                    //     // console.log("touchend: this._touchState= default -> TOUCH_FINDING_ORIGIN")
                    //      break;
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

        if (this.plugin.pointerLens) {
            this.plugin.pointerLens.visible = false;
        }

        this.reset();

        const input = this.plugin.viewer.scene.input;
        input.off(this._onInputMouseDown);
        input.off(this._onInputMouseUp);

        const cameraControl = this.plugin.viewer.cameraControl;
        cameraControl.off(this._onCameraControlHoverSnapOrSurface);
        cameraControl.off(this._onCameraControlHoverSnapOrSurfaceOff);

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