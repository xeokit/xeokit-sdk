import {Dot} from "../lib/html/Dot.js";
import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";

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
    constructor(plugin) {

        super(plugin.viewer.scene);

        /**
         * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsControl.
         * @type {DistanceMeasurementsPlugin}
         */
        this.plugin = plugin;

        this._active = false;

        this._currentDistMeasurement = null;
        // Keep initial measurement state values to do not force values but put the default ones.
        this._currentDistMeasurementInitState = {
            wireVisible: null,
            axisVisible: null,
            targetVisible: null,
        }

        this._onHoverSurface = null;
        this._onHoverOff = null;
        this._onPickedNothing = null;

        this._onInputMouseDown = null;
        this._onInputMouseUp = null;
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
     */
    activate() {

        if (this._active) {
            return;
        }

        const cameraControl = this.plugin.viewer.cameraControl;

        let hoveredEntity = null;
        const worldPos = math.vec3();
        const hoverCanvasPos = math.vec2();

        const pickSurfacePrecisionEnabled = this.plugin.viewer.scene.pickSurfacePrecisionEnabled;

        this.startDot = new Dot(this.plugin._container,
            {
                fillColor: this.plugin.defaultColor,
                zIndex: this.plugin.zIndex + 1
            });

        this._onHoverSurface = cameraControl.on("hoverSurface", e => {

            hoveredEntity = e.entity;
            worldPos.set(e.worldPos);
            hoverCanvasPos.set(e.canvasPos);

            this.plugin.viewer.scene.canvas.canvas.style.cursor = "pointer";

            if (this._currentDistMeasurement) {
                this._currentDistMeasurement.wireVisible = this._currentDistMeasurementInitState.wireVisible;
                this._currentDistMeasurement.axisVisible = this._currentDistMeasurementInitState.axisVisible;
                this._currentDistMeasurement.targetVisible = this._currentDistMeasurementInitState.targetVisible;
                this._currentDistMeasurement.target.entity = hoveredEntity;
                this._currentDistMeasurement.target.worldPos = worldPos;
            } else if (this.startDot) {
                this.startDot.setVisible(true);
                this.startDot.setPos(e.canvasPos[0], e.canvasPos[1]);
            }
        });

        let lastX;
        let lastY;
        const tolerance = 5;

        this._onInputMouseDown = this.plugin.viewer.scene.input.on("mousedown", (coords) => {
            lastX = coords[0];
            lastY = coords[1];
        });

        this._onInputMouseUp = this.plugin.viewer.scene.input.on("mouseup", (coords) => {

            if (coords[0] > lastX + tolerance || coords[0] < lastX - tolerance || coords[1] > lastY + tolerance || coords[1] < lastY - tolerance) {
                return;
            }

            if (this.startDot) {
                this.startDot.destroy();
                this.startDot = null;
            }

            if (this._currentDistMeasurement) {
                if (hoveredEntity) {
                    if (pickSurfacePrecisionEnabled) {
                        const pickResult = this.plugin.viewer.scene.pick({
                            canvasPos: hoverCanvasPos,
                            pickSurface: true,
                            pickSurfacePrecision: true
                        });
                        if (pickResult && pickResult.worldPos) {
                            this._currentDistMeasurement.target.worldPos = pickResult.worldPos;
                        }
                        this._currentDistMeasurement.approximate = false;
                    }

                    this.fire("measurementEnd", this._currentDistMeasurement);
                    this._currentDistMeasurement = null;
                } else {
                    this._currentDistMeasurement.destroy();
                    this.fire("measurementCancel", this._currentDistMeasurement);
                    this._currentDistMeasurement = null;
                }
            } else {
                if (hoveredEntity) {
                    if (pickSurfacePrecisionEnabled) {
                        const pickResult = this.plugin.viewer.scene.pick({
                            canvasPos: hoverCanvasPos,
                            pickSurface: true,
                            pickSurfacePrecision: true
                        });
                        if (pickResult && pickResult.worldPos) {
                            worldPos.set(pickResult.worldPos);
                        }
                    }
                    this._currentDistMeasurement = this.plugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            entity: hoveredEntity,
                            worldPos: worldPos
                        },
                        target: {
                            entity: hoveredEntity,
                            worldPos: worldPos
                        },
                        approximate: true
                    });

                    this._currentDistMeasurementInitState.axisVisible = this._currentDistMeasurement.axisVisible;
                    this._currentDistMeasurementInitState.wireVisible = this._currentDistMeasurement.wireVisible;
                    this._currentDistMeasurementInitState.targetVisible = this._currentDistMeasurement.targetVisible;

                    this.fire("measurementStart", this._currentDistMeasurement);
                }
            }
        });

        this._onHoverOff = cameraControl.on("hoverOff", e => {
            if (this.startDot) {
                this.startDot.setVisible(false);
            }
            hoveredEntity = null;
            if (this._currentDistMeasurement) {
                this._currentDistMeasurement.wireVisible = false;
                this._currentDistMeasurement.targetVisible = false;
                this._currentDistMeasurement.axisVisible = false;
            }
            this.plugin.viewer.scene.canvas.canvas.style.cursor = "default";
        });

        this._onPickedNothing = cameraControl.on("pickedNothing", e => {
            if (this._currentDistMeasurement) {
                this._currentDistMeasurement.destroy();
                this._currentDistMeasurement = null;
            }
        });

        //-------------------------------------------------------------------------------------------------------------

        // const canvas = this.scene.canvas.canvas;
        // const tapStartCanvasPos = math.vec2();
        // const tapCanvasPos0 = math.vec2();
        // const tapCanvasPos1 = math.vec2();
        // const touch0Vec = math.vec2();
        // const lastCanvasTouchPosList = [];
        // let numTouches = 0;
        // let waitForTick = false;
        //
        // this._onTick = scene.on("tick", () => {
        //     waitForTick = false;
        // });
        //
        // canvas.addEventListener("touchstart", this._canvasTouchStartHandler = (event) => {
        //     event.preventDefault();
        //     const touches = event.touches;
        //     const changedTouches = event.changedTouches;
        //     if (touches.length === 1 && changedTouches.length === 1) {
        //         getCanvasPosFromEvent(touches[0], tapStartCanvasPos);
        //
        //         if (pickSurfacePrecisionEnabled) {
        //             const pickResult = this.plugin.viewer.scene.pick({
        //                 canvasPos: tapStartCanvasPos,
        //                 pickSurface: true,
        //                // pickSurfacePrecision: true
        //             });
        //             if (pickResult && pickResult.worldPos) {
        //                // this._currentDistMeasurement.target.worldPos = pickResult.worldPos;
        //             }
        //        //     this._currentDistMeasurement.approximate = false;
        //         }
        //
        //         // TODO: Create start of measurement
        //     }
        //     while (lastCanvasTouchPosList.length < touches.length) {
        //         lastCanvasTouchPosList.push(math.vec2());
        //     }
        //     for (let i = 0, len = touches.length; i < len; ++i) {
        //         getCanvasPosFromEvent(touches[i], lastCanvasTouchPosList[i]);
        //     }
        //     numTouches = touches.length;
        // });
        //
        // canvas.addEventListener("touchmove", this._canvasTouchMoveHandler = (event) => {
        //     event.stopPropagation();
        //     event.preventDefault();
        //     if (waitForTick) {  // Limit changes detection to one per frame
        //         return;
        //     }
        //     waitForTick = true;
        //     const touches = event.touches;
        //     if (event.touches.length !== numTouches) {
        //         // Two fingers were pressed, then one of them is removed
        //         return;
        //     }
        //     if (numTouches === 1) {
        //         getCanvasPosFromEvent(touches[0], tapCanvasPos0);
        //         // TODO: update end of distance measurement
        //     }
        //     for (let i = 0; i < numTouches; ++i) {
        //         getCanvasPosFromEvent(touches[i], lastCanvasTouchPosList[i]);
        //     }
        // });

        //-------------------------------------------------------------------------------------------------------------

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

        if (this.startDot) {
            this.startDot.destroy();
            this.startDot = null;
        }

        this.reset();

        const input = this.plugin.viewer.scene.input;

        input.off(this._onInputMouseDown);
        input.off(this._onInputMouseUp);

        const cameraControl = this.plugin.viewer.cameraControl;

        cameraControl.off(this._onHoverSurface);
        cameraControl.off(this._onHoverOff);
        cameraControl.off(this._onPickedNothing);

        this._currentDistMeasurement = null;

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

        if (this._currentDistMeasurement) {
            this._currentDistMeasurement.destroy();
            this._currentDistMeasurement = null;
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