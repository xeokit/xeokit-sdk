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
    constructor(plugin) {

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
        this._currentDistanceMeasurementByMouse = null;

        this._currentDistanceMeasurementByMouseInittouchState = {
            wireVisible: null,
            axisVisible: null,
            xAxisVisible: null,
            yaxisVisible: null,
            zAxisVisible: null,
            targetVisible: null,
        }

        // Shows 2D canvas pos of touch start
        this._touchStartDot = new Dot(plugin._container,
            {
                fillColor: plugin.defaultColor,
                zIndex: plugin.zIndex + 1,
                visible: false
            });

        // Tracks 3D world pos of touch start, dynamically calculates 2D canvas pos
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
     * @param {Object} cfg
     * @param {Boolean} [cfg.snapToVertex=false]
     */
    activate(cfg) {

        if (this._active) {
            return;
        }

        const plugin = this.plugin;
        const scene = this.scene;
        const cameraControl = plugin.viewer.cameraControl;
        const canvas = scene.canvas.canvas;
        const input = scene.input;
        const startDot = this._touchStartDot;

        const pickSurfacePrecisionEnabled = scene.pickSurfacePrecisionEnabled;

        let mouseHoverEntity = null;
        const mouseWorldPos = math.vec3();
        const mouseCanvasPos = math.vec2();

        let lastMouseCanvasX;
        let lastMouseCanvasY;
        const mouseCanvasClickTolerance = 5;

        const FIRST_TOUCH_EXPECTED = 0;
        const SECOND_TOUCH_EXPECTED = 1;
        let touchState = FIRST_TOUCH_EXPECTED;
        const touchCanvasClickTolerance = 5;

        const touchStartCanvasPos = math.vec2();
        const touchEndCanvasPos = math.vec2();
        const touchStartWorldPos = math.vec3();

        this._onMouseHoverSurface = cameraControl.on("hoverSurface", event => {

            // This gets fired for both mouse and touch input, but we don't care when handling touch
            mouseHoverEntity = event.entity;

            let useSnapToVertex = false;

            if (cfg.snapToVertex)
            {
                useSnapToVertex = null !== event.snappedWorldPos && null !== event.snappedCanvasPos;
            }

            if (useSnapToVertex)
            {
                mouseWorldPos.set(event.snappedWorldPos);
                mouseCanvasPos.set(event.snappedCanvasPos);

                if (touchState == FIRST_TOUCH_EXPECTED)
                {
                    this.markerDiv.style.marginLeft = `${event.snappedCanvasPos[0]-5}px`;
                    this.markerDiv.style.marginTop = `${event.snappedCanvasPos[1]-5}px`;
        
                    this.markerDiv.style.background = "greenyellow";
                    this.markerDiv.style.border = "2px solid green";
                }
            }
            else
            {
                if (event.worldPos !== null && event.canvasPos !== null)
                {
                    mouseWorldPos.set(event.worldPos);
                    mouseCanvasPos.set(event.canvasPos);

                    if (touchState == FIRST_TOUCH_EXPECTED)
                    {
                        this.markerDiv.style.marginLeft = `${event.canvasPos[0]-5}px`;
                        this.markerDiv.style.marginTop = `${event.canvasPos[1]-5}px`;
            
                        this.markerDiv.style.background = "pink";
                        this.markerDiv.style.border = "2px solid red";
                    }
                }
            }

            if (touchState != FIRST_TOUCH_EXPECTED || !this.active) {
                this.markerDiv.style.marginLeft = `-10000px`;
                this.markerDiv.style.marginTop = `-10000px`;
            }

            canvas.style.cursor = "pointer";

            if (this._currentDistanceMeasurementByMouse) {
                this._currentDistanceMeasurementByMouse.wireVisible = this._currentDistanceMeasurementByMouseInittouchState.wireVisible;
                this._currentDistanceMeasurementByMouse.axisVisible = this._currentDistanceMeasurementByMouseInittouchState.axisVisible && this.plugin.defaultAxisVisible;
                this._currentDistanceMeasurementByMouse.xAxisVisible = this._currentDistanceMeasurementByMouseInittouchState.xAxisVisible && this.plugin.defaultXAxisVisible;
                this._currentDistanceMeasurementByMouse.yAxisVisible = this._currentDistanceMeasurementByMouseInittouchState.yAxisVisible && this.plugin.defaultYAxisVisible;
                this._currentDistanceMeasurementByMouse.zAxisVisible = this._currentDistanceMeasurementByMouseInittouchState.zAxisVisible && this.plugin.defaultZAxisVisible;
                this._currentDistanceMeasurementByMouse.targetVisible = this._currentDistanceMeasurementByMouseInittouchState.targetVisible;
                this._currentDistanceMeasurementByMouse.target.entity = mouseHoverEntity;
                this._currentDistanceMeasurementByMouse.target.worldPos = mouseWorldPos;
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
            if (this._currentDistanceMeasurementByMouse) {
                if (mouseHoverEntity) {
                    if (pickSurfacePrecisionEnabled) {
                        const pickResult = scene.pick({
                            canvasPos: mouseCanvasPos,
                            pickSurface: true,
                            pickSurfacePrecision: true
                        });
                        if (pickResult && pickResult.worldPos) {
                            this._currentDistanceMeasurementByMouse.target.worldPos = pickResult.worldPos;
                        }
                        this._currentDistanceMeasurementByMouse.approximate = false;
                    }
                    this._currentDistanceMeasurementByMouse.clickable = true;
                    this.fire("measurementEnd", this._currentDistanceMeasurementByMouse);
                    this._currentDistanceMeasurementByMouse = null;
                } else {
                    this._currentDistanceMeasurementByMouse.destroy();
                    this.fire("measurementCancel", this._currentDistanceMeasurementByMouse);
                    this._currentDistanceMeasurementByMouse = null;
                }
            } else {
                if (mouseHoverEntity) {
                    if (pickSurfacePrecisionEnabled) {
                        const pickResult = scene.pick({
                            canvasPos: mouseCanvasPos,
                            pickSurface: true,
                            pickSurfacePrecision: true
                        });
                        if (pickResult && pickResult.worldPos) {
                            mouseWorldPos.set(pickResult.worldPos);
                        }
                    }
                    this._currentDistanceMeasurementByMouse = plugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            entity: mouseHoverEntity,
                            worldPos: mouseWorldPos
                        },
                        target: {
                            entity: mouseHoverEntity,
                            worldPos: mouseWorldPos
                        },
                        approximate: true
                    });
                    this._currentDistanceMeasurementByMouseInittouchState.axisVisible = this._currentDistanceMeasurementByMouse.axisVisible && this.plugin.defaultAxisVisible;

                    this._currentDistanceMeasurementByMouseInittouchState.xAxisVisible = this._currentDistanceMeasurementByMouse.xAxisVisible && this.plugin.defaultXAxisVisible;
                    this._currentDistanceMeasurementByMouseInittouchState.yAxisVisible = this._currentDistanceMeasurementByMouse.yAxisVisible && this.plugin.defaultYAxisVisible;
                    this._currentDistanceMeasurementByMouseInittouchState.zAxisVisible = this._currentDistanceMeasurementByMouse.zAxisVisible && this.plugin.defaultZAxisVisible;

                    this._currentDistanceMeasurementByMouseInittouchState.wireVisible = this._currentDistanceMeasurementByMouse.wireVisible;
                    this._currentDistanceMeasurementByMouseInittouchState.targetVisible = this._currentDistanceMeasurementByMouse.targetVisible;
                    this._currentDistanceMeasurementByMouse.clickable = false;
                    this.fire("measurementStart", this._currentDistanceMeasurementByMouse);
                }
            }
        });

        this._onMouseHoverOff = cameraControl.on("hoverOff", event => {
            mouseHoverEntity = null;

            this.markerDiv.style.marginLeft = `-100px`;
            this.markerDiv.style.marginTop = `-100px`;

            if (this._currentDistanceMeasurementByMouse) {
                this._currentDistanceMeasurementByMouse.wireVisible = false;
                this._currentDistanceMeasurementByMouse.targetVisible = false;
                this._currentDistanceMeasurementByMouse.axisVisible = false;
            }
            canvas.style.cursor = "default";
        });

        this._onPickedNothing = cameraControl.on("pickedNothing", event => {
            if (this._currentDistanceMeasurementByMouse) {
                this.fire("measurementCancel", this._currentDistanceMeasurementByMouse);
                this._currentDistanceMeasurementByMouse.destroy();
                this._currentDistanceMeasurementByMouse = null;
            }
            startDot.setVisible(false);
            touchState = FIRST_TOUCH_EXPECTED;
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
                    pickSurfacePrecision: pickSurfacePrecisionEnabled
                });
                if (pickResult && pickResult.worldPos) {
                    switch (touchState) {
                        case FIRST_TOUCH_EXPECTED:
                            startDot.setVisible(true);
                            this._touchStartMarker.worldPos = pickResult.worldPos;
                            touchStartWorldPos.set(pickResult.worldPos);
                            touchState = SECOND_TOUCH_EXPECTED;
                            break;
                        case SECOND_TOUCH_EXPECTED:
                            startDot.setVisible(false);
                            this._touchStartMarker.worldPos = pickResult.worldPos;
                            const measurement = plugin.createMeasurement({
                                id: math.createUUID(),
                                origin: {
                                    entity: mouseHoverEntity,
                                    worldPos: touchStartWorldPos
                                },
                                target: {
                                    entity: mouseHoverEntity,
                                    worldPos: pickResult.worldPos
                                },
                                approximate: (!pickSurfacePrecisionEnabled)
                            });
                            measurement.clickable = true;
                            touchState = FIRST_TOUCH_EXPECTED;
                            this.fire("measurementEnd", measurement);
                            break;
                    }
                } else {
                    startDot.setVisible(false);
                    touchState = FIRST_TOUCH_EXPECTED;
                }
            }
            //  event.stopPropagation();
        }, {passive: true});

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

        if (this._currentDistanceMeasurementByMouse) {
            this.fire("measurementCancel", this._currentDistanceMeasurementByMouse);
            this._currentDistanceMeasurementByMouse.destroy();
            this._currentDistanceMeasurementByMouse = null;
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
        if (this._currentDistanceMeasurementByMouse) {
            this.fire("measurementCancel", this._currentDistanceMeasurementByMouse);
            this._currentDistanceMeasurementByMouse.destroy();
            this._currentDistanceMeasurementByMouse = null;
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
