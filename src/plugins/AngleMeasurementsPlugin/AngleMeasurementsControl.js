import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";

const FINDING_ORIGIN = 0;
const FINDING_CORNER = 1;
const FINDING_TARGET = 2;

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
    constructor(plugin) {

        super(plugin.viewer.scene);

        /**
         * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsControl.
         * @type {AngleMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._active = false;
        this._state = FINDING_ORIGIN;
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

    }

    /** Gets if this AngleMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active() {
        return this._active;
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
       const canvas = scene.canvas.canvas;

        const mouseCanvasClickTolerance = 15;


        // this._onMouseHoverSurface = cameraControl.on("hoverSnapOrSurface", event => {
        //     mouseHovering = true;
        //     mouseHoverEntity = event.entity;
        //     mouseWorldPos.set(event.worldPos);
        //     mouseHoverCanvasPos.set(event.canvasPos);
        //     switch (this._state) {
        //         case FINDING_ORIGIN:
        //             this.markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
        //             this.markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
        //             this.markerDiv.style.background = "pink";
        //             this.markerDiv.style.border = "2px solid red";
        //             break;
        //         case FINDING_CORNER:
        //             if (this._currentAngleMeasurement) {
        //                 this._currentAngleMeasurement.originWireVisible = true;
        //                 this._currentAngleMeasurement.targetWireVisible = false;
        //                 this._currentAngleMeasurement.cornerVisible = true;
        //                 this._currentAngleMeasurement.angleVisible = false;
        //                 this._currentAngleMeasurement.corner.worldPos = event.worldPos;
        //             }
        //             this.markerDiv.style.marginLeft = `-10000px`;
        //             this.markerDiv.style.marginTop = `-10000px`;
        //             canvas.style.cursor = "pointer";
        //             break;
        //         case FINDING_TARGET:
        //             if (this._currentAngleMeasurement) {
        //                 this._currentAngleMeasurement.targetWireVisible = true;
        //                 this._currentAngleMeasurement.targetVisible = true;
        //                 this._currentAngleMeasurement.angleVisible = true;
        //                 this._currentAngleMeasurement.target.worldPos = event.worldPos;
        //             }
        //             this.markerDiv.style.marginLeft = `-10000px`;
        //             this.markerDiv.style.marginTop = `-10000px`;
        //             canvas.style.cursor = "pointer";
        //             break;
        //     }
        // });
        //
        // this._onInputMouseDown = input.on("mousedown", (coords) => {
        //     lastMouseCanvasX = coords[0];
        //     lastMouseCanvasY = coords[1];
        // });
        //
        // this._onInputMouseUp = input.on("mouseup", (coords) => {
        //     if (coords[0] > lastMouseCanvasX + mouseCanvasClickTolerance ||
        //         coords[0] < lastMouseCanvasX - mouseCanvasClickTolerance ||
        //         coords[1] > lastMouseCanvasY + mouseCanvasClickTolerance ||
        //         coords[1] < lastMouseCanvasY - mouseCanvasClickTolerance) {
        //         return;
        //     }
        //     switch (this._state) {
        //         case FINDING_ORIGIN:
        //             if (mouseHovering) {
        //                 this._currentAngleMeasurement = this.plugin.createMeasurement({
        //                     id: math.createUUID(),
        //                     origin: {
        //                         entity: mouseHoverEntity,
        //                         worldPos: mouseWorldPos
        //                     },
        //                     corner: {
        //                         entity: mouseHoverEntity,
        //                         worldPos: mouseWorldPos
        //                     },
        //                     target: {
        //                         entity: mouseHoverEntity,
        //                         worldPos: mouseWorldPos
        //                     },
        //                     approximate: true
        //                 });
        //                 this._currentAngleMeasurement.originVisible = true;
        //                 this._currentAngleMeasurement.originWireVisible = true;
        //                 this._currentAngleMeasurement.cornerVisible = false;
        //                 this._currentAngleMeasurement.targetWireVisible = false;
        //                 this._currentAngleMeasurement.targetVisible = false;
        //                 this._currentAngleMeasurement.angleVisible = false;
        //                 this._state = FINDING_CORNER;
        //                 this.fire("measurementStart", this._currentAngleMeasurement);
        //             }
        //             break;
        //         case FINDING_CORNER:
        //             if (mouseHovering) {
        //                 this._currentAngleMeasurement.targetWireVisible = false;
        //                 this._currentAngleMeasurement.targetVisible = true;
        //                 this._currentAngleMeasurement.angleVisible = true;
        //                 this._state = FINDING_TARGET;
        //             } else {
        //                 if (this._currentAngleMeasurement) {
        //                     this._currentAngleMeasurement.destroy();
        //                     this._currentAngleMeasurement = null;
        //                     this._state = FINDING_ORIGIN
        //                     this.fire("measurementCancel", this._currentAngleMeasurement);
        //                 }
        //             }
        //             break;
        //         case FINDING_TARGET:
        //             if (mouseHovering) {
        //                 this._currentAngleMeasurement.targetVisible = true;
        //                 this._currentAngleMeasurement.angleVisible = true;
        //                 this.fire("measurementEnd", this._currentAngleMeasurement);
        //                 this._currentAngleMeasurement = null;
        //                 this._state = FINDING_ORIGIN;
        //             } else {
        //                 if (this._currentAngleMeasurement) {
        //                     this._currentAngleMeasurement.destroy();
        //                     this._currentAngleMeasurement = null;
        //                     this._state = FINDING_ORIGIN;
        //                     this.fire("measurementCancel", this._currentAngleMeasurement);
        //                 }
        //             }
        //             break;
        //     }
        // });
        //
        // this._onMouseHoverOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
        //     mouseHovering = false;
        //     this.markerDiv.style.marginLeft = `-100px`;
        //     this.markerDiv.style.marginTop = `-100px`;
        //     if (this._currentAngleMeasurement) {
        //         switch (this._state) {
        //             case FINDING_ORIGIN:
        //                 this._currentAngleMeasurement.originVisible = false;
        //                 break;
        //             case FINDING_CORNER:
        //                 this._currentAngleMeasurement.cornerVisible = false;
        //                 this._currentAngleMeasurement.originWireVisible = false;
        //                 this._currentAngleMeasurement.targetVisible = false;
        //                 this._currentAngleMeasurement.targetWireVisible = false;
        //                 this._currentAngleMeasurement.angleVisible = false;
        //                 break;
        //             case FINDING_TARGET:
        //                 this._currentAngleMeasurement.targetVisible = false;
        //                 this._currentAngleMeasurement.targetWireVisible = false;
        //                 this._currentAngleMeasurement.angleVisible = false;
        //                 break;
        //
        //         }
        //         canvas.style.cursor = "default";
        //     }
        // });
        //
        // canvas.addEventListener("touchstart", this._onCanvasTouchStart = (event) => {
        //     const touches = event.touches;
        //     const changedTouches = event.changedTouches;
        //     if (touches.length === 1 && changedTouches.length === 1) {
        //         getCanvasPosFromEvent(touches[0], touchStartCanvasPos);
        //     }
        // }, {passive: true});
        //
        // canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {
        //     const touches = event.touches;
        //     const changedTouches = event.changedTouches;
        //     if (touches.length === 0 && changedTouches.length === 1) {
        //         getCanvasPosFromEvent(changedTouches[0], touchEndCanvasPos);
        //         if (touchEndCanvasPos[0] > touchStartCanvasPos[0] + touchCanvasClickTolerance ||
        //             touchEndCanvasPos[0] < touchStartCanvasPos[0] - touchCanvasClickTolerance ||
        //             touchEndCanvasPos[1] > touchStartCanvasPos[1] + touchCanvasClickTolerance ||
        //             touchEndCanvasPos[1] < touchStartCanvasPos[1] - touchCanvasClickTolerance) {
        //             return; // User is repositioning the camera or model
        //         }
        //         const pickResult = scene.pick({
        //             canvasPos: touchEndCanvasPos,
        //             pickSurface: true
        //         });
        //         if (pickResult && pickResult.worldPos) {
        //             switch (this._state) {
        //                 case FINDING_ORIGIN:
        //                     this._currentAngleMeasurement = this.plugin.createMeasurement({
        //                         id: math.createUUID(),
        //                         origin: {
        //                             entity: pickResult.entity,
        //                             worldPos: pickResult.worldPos
        //                         },
        //                         corner: {
        //                             entity: pickResult.entity,
        //                             worldPos: pickResult.worldPos
        //                         },
        //                         target: {
        //                             entity: pickResult.entity,
        //                             worldPos: pickResult.worldPos
        //                         },
        //                         approximate: true
        //                     });
        //                     this._currentAngleMeasurement.originVisible = true;
        //                     this._currentAngleMeasurement.originWireVisible = true;
        //                     this._currentAngleMeasurement.cornerVisible = false;
        //                     this._currentAngleMeasurement.targetWireVisible = false;
        //                     this._currentAngleMeasurement.targetVisible = false;
        //                     this._currentAngleMeasurement.angleVisible = false;
        //                     this._currentAngleMeasurement.clickable = false;
        //                     this._state = FINDING_CORNER;
        //                     this.fire("measurementStart", this._currentAngleMeasurement);
        //                     break;
        //                 case FINDING_CORNER:
        //                     this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
        //                     this._currentAngleMeasurement.originWireVisible = true;
        //                     this._currentAngleMeasurement.targetWireVisible = false;
        //                     this._currentAngleMeasurement.targetVisible = true;
        //                     this._currentAngleMeasurement.angleVisible = true;
        //                     this._currentAngleMeasurement.cornerVisible = true;
        //                     this._state = FINDING_TARGET;
        //                     break;
        //                 case FINDING_TARGET:
        //                     this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
        //                     //  this._currentAngleMeasurement.approximate = false;
        //                     this._currentAngleMeasurement.targetVisible = true;
        //                     this._currentAngleMeasurement.targetWireVisible = true;
        //                     this._currentAngleMeasurement.angleVisible = true;
        //                     this._currentAngleMeasurement.clickable = true;
        //                     this.fire("measurementEnd", this._currentAngleMeasurement);
        //                     this._currentAngleMeasurement = null;
        //                     this._state = FINDING_ORIGIN;
        //                     break;
        //             }
        //         } else {
        //             if (this._currentAngleMeasurement) {
        //                 this._currentAngleMeasurement.destroy();
        //                 this._currentAngleMeasurement = null;
        //                 this._state = FINDING_ORIGIN;
        //                 this.fire("measurementCancel", this._currentAngleMeasurement);
        //             }
        //         }
        //     }
        //     //  event.stopPropagation();
        // }, {passive: true});


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
            const FINDING_CORNER = 3;
            const QUICK_TOUCH_FINDING_CORNER = 4;
            const LONG_TOUCH_FINDING_CORNER = 5;
            const FINDING_END = 6;
            const QUICK_TOUCH_FINDING_END = 7;
            const LONG_TOUCH_FINDING_END = 8;
            const CANCELING = 9;

            let state = FINDING_START;

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
                                    this.plugin.pointerLens.cursorPos = touchStartCanvasPos;
                                }
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                                }
                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos,
                                    snapMode: this._snapMode
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (this.plugin.pointerLens) {
                                        this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                    const pickResult = scene.pick({
                                        canvasPos: touchMoveCanvasPos,
                                        pickSurface: true
                                    })
                                    if (pickResult && pickResult.worldPos) {
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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

                    case FINDING_CORNER:
                        if (currentNumTouches !== 1 && longTouchTimeout !== null) { // Two or more fingers down
                            clearTimeout(longTouchTimeout);
                            longTouchTimeout = null;
                            state = CANCELING;
                            // console.log("touchstart: state= FINDING_CORNER -> CANCELING")
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
                                    this.plugin.pointerLens.cursorPos = touchStartCanvasPos;
                                }

                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                                }
                                const snapPickResult = scene.snapPick({
                                    canvasPos: touchMoveCanvasPos,
                                    snapMode: this._snapMode
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (this.plugin.pointerLens) {
                                        this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = null;
                                        }
                                    }
                                }
                                state = LONG_TOUCH_FINDING_CORNER;
                                // console.log("touchstart: state= FINDING_CORNER -> LONG_TOUCH_FINDING_CORNER")
                            }, this._mobileModeLongPressTimeMs);
                            state = QUICK_TOUCH_FINDING_CORNER;
                            // console.log("touchstart: state= FINDING_CORNER -> QUICK_TOUCH_FINDING_CORNER")
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
                                    canvasPos: touchMoveCanvasPos,
                                    snapMode: this._snapMode
                                });
                                if (snapPickResult && snapPickResult.snappedWorldPos) {
                                    if (this.plugin.pointerLens) {
                                        this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                        if (this.plugin.pointerLens) {
                                            this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos,
                            snapMode: this._snapMode
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = null;
                                }
                            }
                        }
                        state = LONG_TOUCH_FINDING_START;
                        // console.log("touchmove: state= LONG_TOUCH_FINDING_START -> LONG_TOUCH_FINDING_START")
                        break;

                    case FINDING_CORNER:
                        state = FINDING_CORNER;
                        // console.log("touchmove: state= FINDING_CORNER -> FINDING_CORNER")
                        break;

                    case QUICK_TOUCH_FINDING_CORNER:
                        state = QUICK_TOUCH_FINDING_CORNER;
                        // console.log("touchmove: state= QUICK_TOUCH_FINDING_CORNER -> QUICK_TOUCH_FINDING_CORNER")
                        break;

                    case LONG_TOUCH_FINDING_CORNER:
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.centerPos = touchMoveCanvasPos;
                        }
                        snapPickResult = scene.snapPick({
                            canvasPos: touchMoveCanvasPos,
                            snapMode: this._snapMode
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = null;
                                }
                            }
                        }
                        state = LONG_TOUCH_FINDING_CORNER;
                        // console.log("touchmove: state= LONG_TOUCH_FINDING_CORNER -> LONG_TOUCH_FINDING_CORNER")
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
                            canvasPos: touchMoveCanvasPos,
                            snapMode: this._snapMode
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
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
                longTouchTimeout = null;

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

                    case FINDING_CORNER:
                        state = FINDING_CORNER;
                        // console.log("touchend: state= FINDING_START -> FINDING_CORNER")
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
                            if (this._currentAngleMeasurement) {
                                this._currentAngleMeasurement.destroy();
                                this._currentAngleMeasurement = null;
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
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = false;
                                this._currentAngleMeasurement.cornerVisible = false;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false
                                this.fire("measurementStart", this._currentAngleMeasurement);
                                //      enableCameraMouseControl();
                                state = FINDING_CORNER;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_START (picked, begin measurement) -> FINDING_CORNER")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) { // Not likely needed, but safe
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
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
                        if (!this._currentAngleMeasurement) {
                            this._currentAngleMeasurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    worldPos: touchEndCanvasPos
                                },
                                corner: {
                                    worldPos: touchEndCanvasPos
                                },
                                target: {
                                    worldPos: touchEndCanvasPos
                                }
                            });
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = false;
                            this._currentAngleMeasurement.cornerVisible = false;
                            this._currentAngleMeasurement.cornerWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false
                        }
                        this.fire("measurementStart", this._currentAngleMeasurement);
                        //  enableCameraMouseControl();
                        state = FINDING_CORNER;
                        // console.log("touchend: state= LONG_TOUCH_FINDING_START (picked, begin measurement) -> FINDING_CORNER")
                        break;

                    case QUICK_TOUCH_FINDING_CORNER:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                            // if (this._currentAngleMeasurement) {
                            //     this._currentAngleMeasurement.destroy();
                            //     this._currentAngleMeasurement = null;
                            // }
                            state = FINDING_CORNER;
                            // console.log("touchend: (moved) state= QUICK_TOUCH_FINDING_CORNER -> FINDING_CORNER")
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
                                this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false;
                                state = FINDING_END;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_CORNER (picked, begin measurement) -> FINDING_END")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_START (nothing picked, destroy measurement) -> FINDING_START")
                                break;
                            }
                        }

                    case LONG_TOUCH_FINDING_CORNER: {
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.active = false;
                        }
                        const snapPickResult = scene.snapPick({
                            canvasPos: touchEndCanvasPos,
                            snapMode: this._snapMode
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
                            }
                            this._currentAngleMeasurement.corner.worldPos = snapPickResult.snappedWorldPos;
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.cornerVisible = true;
                            this._currentAngleMeasurement.cornerWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                        } else {
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
                                this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = false;
                                this._currentAngleMeasurement.targetVisible = false;
                                this._currentAngleMeasurement.targetWireVisible = false;
                                this._currentAngleMeasurement.angleVisible = false;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_CORNER (nothing picked, destroy measurement) -> FINDING_START")
                                break;
                            }
                        }
                        state = FINDING_END;
                        // console.log("touchend: state= LONG_TOUCH_FINDING_CORNER -> FINDING_END")
                        break;
                    }

                    case QUICK_TOUCH_FINDING_END:
                        if (currentNumTouches !== 1 ||
                            touchEndCanvasPos[0] > touchStartCanvasPos[0] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[0] < touchStartCanvasPos[0] - mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] > touchStartCanvasPos[1] + mouseCanvasClickTolerance ||
                            touchEndCanvasPos[1] < touchStartCanvasPos[1] - mouseCanvasClickTolerance) {
                            // if (this._currentAngleMeasurement) {
                            //     this._currentAngleMeasurement.destroy();
                            //     this._currentAngleMeasurement = null;
                            // }
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
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_END (picked, begin measurement) -> FINDING_START")
                                break;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
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
                            canvasPos: touchEndCanvasPos,
                            snapMode: this._snapMode
                        });
                        if (snapPickResult && snapPickResult.snappedWorldPos) {
                            if (this.plugin.pointerLens) {
                                this.plugin.pointerLens.cursorPos = snapPickResult.snappedCanvasPos;
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
                            const pickResult = scene.pick({
                                canvasPos: touchEndCanvasPos,
                                pickSurface: true
                            })
                            if (pickResult && pickResult.worldPos) {
                                if (this.plugin.pointerLens) {
                                    this.plugin.pointerLens.cursorPos = pickResult.canvasPos;
                                }
                                this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.originVisible = true;
                                this._currentAngleMeasurement.originWireVisible = true;
                                this._currentAngleMeasurement.cornerVisible = true;
                                this._currentAngleMeasurement.cornerWireVisible = true;
                                this._currentAngleMeasurement.targetVisible = true;
                                this._currentAngleMeasurement.targetWireVisible = true;
                                this._currentAngleMeasurement.angleVisible = true;
                            } else {
                                if (this._currentAngleMeasurement) {
                                    this._currentAngleMeasurement.destroy();
                                    this._currentAngleMeasurement = null;
                                }
                                state = FINDING_START;
                                // console.log("touchend: state= QUICK_TOUCH_FINDING_END (nothing picked, destroy measurement) -> FINDING_START")
                                break;
                            }
                        }
                        this._currentAngleMeasurement.clickable = true;
                        this.fire("measurementEnd", this._currentAngleMeasurement);
                        this._currentAngleMeasurement = null;
                        state = FINDING_START;
                        // console.log("touchend: state= LONG_TOUCH_FINDING_END -> FINDING_START")
                        break;

                    default:
                        if (this.plugin.pointerLens) {
                            this.plugin.pointerLens.active = false;
                        }
                        this._currentAngleMeasurement = null;
                        state = FINDING_START;
                        // console.log("touchend: state= default -> FINDING_START")
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

        this._state = FINDING_ORIGIN;
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
