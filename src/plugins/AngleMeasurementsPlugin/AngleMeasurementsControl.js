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
        const cameraControl = plugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;
        const input = scene.input;

        let mouseHovering = false;
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

        this._onMouseHoverSurface = cameraControl.on("hoverSnapOrSurface", event => {
            mouseHovering = true;
            mouseHoverEntity = event.entity;
            mouseWorldPos.set(event.worldPos);
            mouseHoverCanvasPos.set(event.canvasPos);
            switch (this._state) {
                case FINDING_ORIGIN:
                    this.markerDiv.style.marginLeft = `${event.canvasPos[0] - 5}px`;
                    this.markerDiv.style.marginTop = `${event.canvasPos[1] - 5}px`;
                    this.markerDiv.style.background = "pink";
                    this.markerDiv.style.border = "2px solid red";
                    break;
                case FINDING_CORNER:
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
                case FINDING_TARGET:
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
            if (coords[0] > lastMouseCanvasX + mouseCanvasClickTolerance ||
                coords[0] < lastMouseCanvasX - mouseCanvasClickTolerance ||
                coords[1] > lastMouseCanvasY + mouseCanvasClickTolerance ||
                coords[1] < lastMouseCanvasY - mouseCanvasClickTolerance) {
                return;
            }
            switch (this._state) {
                case FINDING_ORIGIN:
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
                    if (mouseHovering) {
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
                    if (mouseHovering) {
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

        this._onMouseHoverOff = cameraControl.on("hoverSnapOrSurfaceOff", event => {
            mouseHovering = false;
            this.markerDiv.style.marginLeft = `-100px`;
            this.markerDiv.style.marginTop = `-100px`;
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
                    pickSurface: true
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
                            this._currentAngleMeasurement.clickable = false;
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
                            this._currentAngleMeasurement.clickable = true;
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
