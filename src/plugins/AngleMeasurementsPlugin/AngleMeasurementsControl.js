import {Dot} from "../lib/html/Dot";
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

        this.startDot = new Dot(this.plugin._container,
            {
                fillColor: this.plugin.defaultColor,
                zIndex: this.plugin.zIndex + 1
            });

        const plugin = this.plugin;
        const scene = this.scene;
        const cameraControl = plugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;
        const input = scene.input;

        const pickSurfacePrecisionEnabled = scene.pickSurfacePrecisionEnabled;

        let isMouseHoveringEntity = false;
        let mouseHoverEntity = null;
        let mouseWorldPos = math.vec3();
        const mouseHoverCanvasPos = math.vec2();

        let lastMouseCanvasX;
        let lastMouseCanvasY;
        const mouseCanvasClickTolerance = 5;

        const touchCanvasClickTolerance = 5;
        const touchStartCanvasPos = math.vec2();
        const touchEndCanvasPos = math.vec2();
        const touchStartWorldPos = math.vec3();

        this._onMouseHoverSurface = cameraControl.on("hoverSurface", event => {
            isMouseHoveringEntity = true;
            mouseHoverEntity = event.entity;
            mouseWorldPos.set(event.worldPos);
            mouseHoverCanvasPos.set(event.canvasPos);
            if (this._currentAngleMeasurement) {
                switch (this._state) {
                    case FINDING_CORNER:
                        this._currentAngleMeasurement.originWireVisible = true;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.cornerVisible = true;
                        this._currentAngleMeasurement.angleVisible = false;
                        this._currentAngleMeasurement.corner.entity = event.entity;
                        this._currentAngleMeasurement.corner.worldPos = event.worldPos;
                        canvas.style.cursor = "pointer";
                        break;
                    case FINDING_TARGET:
                        this._currentAngleMeasurement.targetWireVisible = true;
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this._currentAngleMeasurement.target.entity = event.entity;
                        this._currentAngleMeasurement.target.worldPos = event.worldPos;
                        canvas.style.cursor = "pointer";
                        break;
                }
            }
        });

        this._onInputMouseDown = input.on("mousedown", (coords) => {
            lastMouseCanvasX = coords[0];
            lastMouseCanvasY = coords[1];
        });

        this._onInputMouseUp = input.on("mouseup", (coords) => {
            if (coords[0] > lastMouseCanvasX + mouseCanvasClickTolerance ||
                coords[0] < lastMouseCanvasX - mouseCanvasClickTolerance ||
                coords[1] > lastMouseCanvasY + mouseCanvasClickTolerance ||
                coords[1] < lastMouseCanvasY - mouseCanvasClickTolerance) {
                return;
            }
            switch (this._state) {
                case FINDING_ORIGIN:
                    if (isMouseHoveringEntity) {
                        if (pickSurfacePrecisionEnabled) {
                            const pickResult = scene.pick({
                                canvasPos: mouseHoverCanvasPos,
                                pickSurface: true,
                                pickSurfacePrecision: pickSurfacePrecisionEnabled
                            });
                            if (pickResult && pickResult.worldPos) {
                                worldPos.set(pickResult.worldPos);
                            }
                        }
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
                        this._currentAngleMeasurement.originVisible = true;
                        this._currentAngleMeasurement.originWireVisible = true;
                        this._currentAngleMeasurement.cornerVisible = false;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = false;
                        this._currentAngleMeasurement.angleVisible = false;
                        this._state = FINDING_CORNER;
                        this.fire("measurementStart", this._currentAngleMeasurement);
                    }
                    break;
                case FINDING_CORNER:
                    if (isMouseHoveringEntity) {
                        if (pickSurfacePrecisionEnabled) {
                            const pickResult = scene.pick({
                                canvasPos: mouseHoverCanvasPos,
                                pickSurface: true,
                                pickSurfacePrecision: true
                            });
                            if (pickResult && pickResult.worldPos) {
                                this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                            }
                        }
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this._state = FINDING_TARGET;
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                            this._state = FINDING_ORIGIN
                            this.fire("measurementCancel", this._currentAngleMeasurement);
                        }
                    }
                    break;
                case FINDING_TARGET:
                    if (isMouseHoveringEntity) {
                        if (pickSurfacePrecisionEnabled) {
                            const pickResult = scene.pick({
                                canvasPos: mouseHoverCanvasPos,
                                pickSurface: true,
                                pickSurfacePrecision: true
                            });
                            if (pickResult && pickResult.worldPos) {
                                this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                                this._currentAngleMeasurement.approximate = false;
                            }
                        }
                        this._currentAngleMeasurement.targetVisible = true;
                        this._currentAngleMeasurement.angleVisible = true;
                        this.fire("measurementEnd", this._currentAngleMeasurement);
                        this._currentAngleMeasurement = null;
                        this._state = FINDING_ORIGIN;
                    } else {
                        if (this._currentAngleMeasurement) {
                            this._currentAngleMeasurement.destroy();
                            this._currentAngleMeasurement = null;
                            this._state = FINDING_ORIGIN;
                            this.fire("measurementCancel", this._currentAngleMeasurement);
                        }
                    }
                    break;
            }
        });

        this._onHoverNothing = cameraControl.on("hoverOff", event => {
            if (this.startDot) {
                this.startDot.setVisible(false);
            }
            isMouseHoveringEntity = false;
            if (this._currentAngleMeasurement) {
                switch (this._state) {
                    case FINDING_ORIGIN:
                        this._currentAngleMeasurement.originVisible = false;
                        break;
                    case FINDING_CORNER:
                        this._currentAngleMeasurement.cornerVisible = false;
                        this._currentAngleMeasurement.originWireVisible = false;
                        this._currentAngleMeasurement.targetVisible = false;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.angleVisible = false;
                        break;
                    case FINDING_TARGET:
                        this._currentAngleMeasurement.targetVisible = false;
                        this._currentAngleMeasurement.targetWireVisible = false;
                        this._currentAngleMeasurement.angleVisible = false;
                        break;

                }
                canvas.style.cursor = "default";
            }
        });

        canvas.addEventListener("touchstart", this._onCanvasTouchStart = (event) => {
            const touches = event.touches;
            const changedTouches = event.changedTouches;
            if (touches.length === 1 && changedTouches.length === 1) {
                getCanvasPosFromEvent(touches[0], touchStartCanvasPos);
            }
        }, {passive: true});

        canvas.addEventListener("touchend", this._onCanvasTouchEnd = (event) => {
            const touches = event.touches;
            const changedTouches = event.changedTouches;
            if (touches.length === 0 && changedTouches.length === 1) {
                getCanvasPosFromEvent(changedTouches[0], touchEndCanvasPos);
                if (touchEndCanvasPos[0] > touchStartCanvasPos[0] + touchCanvasClickTolerance ||
                    touchEndCanvasPos[0] < touchStartCanvasPos[0] - touchCanvasClickTolerance ||
                    touchEndCanvasPos[1] > touchStartCanvasPos[1] + touchCanvasClickTolerance ||
                    touchEndCanvasPos[1] < touchStartCanvasPos[1] - touchCanvasClickTolerance) {
                    return; // User is repositioning the camera or model
                }
                const pickResult = scene.pick({
                    canvasPos: touchEndCanvasPos,
                    pickSurface: true,
                    pickSurfacePrecision: false
                });
                if (pickResult && pickResult.worldPos) {
                    switch (this._state) {
                        case FINDING_ORIGIN:
                            this._currentAngleMeasurement = this.plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    entity: pickResult.entity,
                                    worldPos: pickResult.worldPos
                                },
                                corner: {
                                    entity: pickResult.entity,
                                    worldPos: pickResult.worldPos
                                },
                                target: {
                                    entity: pickResult.entity,
                                    worldPos: pickResult.worldPos
                                },
                                approximate: true
                            });
                            this._currentAngleMeasurement.originVisible = true;
                            this._currentAngleMeasurement.originWireVisible = true;
                            this._currentAngleMeasurement.cornerVisible = false;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = false;
                            this._currentAngleMeasurement.angleVisible = false;
                            this._state = FINDING_CORNER;
                            this.fire("measurementStart", this._currentAngleMeasurement);
                            break;
                        case FINDING_CORNER:
                            this._currentAngleMeasurement.corner.worldPos = pickResult.worldPos;
                            this._currentAngleMeasurement.targetWireVisible = false;
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                            this._state = FINDING_TARGET;
                            break;
                        case FINDING_TARGET:
                            this._currentAngleMeasurement.target.worldPos = pickResult.worldPos;
                            //  this._currentAngleMeasurement.approximate = false;
                            this._currentAngleMeasurement.targetVisible = true;
                            this._currentAngleMeasurement.angleVisible = true;
                            this.fire("measurementEnd", this._currentAngleMeasurement);
                            this._currentAngleMeasurement = null;
                            this._state = FINDING_ORIGIN;
                            break;
                    }
                } else {
                    if (this._currentAngleMeasurement) {
                        this._currentAngleMeasurement.destroy();
                        this._currentAngleMeasurement = null;
                        this._state = FINDING_ORIGIN;
                        this.fire("measurementCancel", this._currentAngleMeasurement);
                    }
                }
            }
            //  event.stopPropagation();
        }, {passive: true});

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

        if (this.startDot) {
            this.startDot.destroy();
            this.startDot = null;
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
