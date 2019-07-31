import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";

const HOVERING = 0;
const FINDING_ORIGIN = 1;
const FINDING_TARGET = 2;
const MOVING_ORIGIN = 3;
const MOVING_TARGET = 4;

/**
 * Creates and edits simple distance rulers using mouse and touch input.
 *
 * See {@link DistanceMeasurementsPlugin} for more info.
 */
class DistanceMeasurementsControl extends Component {

    /**
     * @private
     */
    constructor(plugin) {

        super(plugin.viewer.scene);

        this.plugin = plugin;
        this._active = false;

        this._state = HOVERING;
        this._currentMeasurement = null;
        this._prevRuler = null;

        this._onMouseDownRuler = null;
        this._onMouseDownRulerOrigin = null;
        this._onMouseDownRulerTarget = null;
        this._onhoverSurface = null;
        this._onPickedSurface = null;
        this._onHoverNothing = null;
        this._onPickedNothing = null;
    }

    /** Gets if this DistanceMeasureCcontrol is currently active, where it is responding to mouse and touch input.
     * @returns {boolean}
     */
    get active() {
        return this._active;
    }

    /**
     * Activates this DistanceMeasurementPlugin, making it respond to mouse and touch input.
     */
    activate() {

        if (this._active) {
            return;
        }

        //=============================================================================================================
        // TODO: Replace these handlers with mouseEventListeners?
        // FIXME: After choosing target position, we can still move the target around until "pickSurface" fires, which snaps it back to where we clicks, which is ugly.
        // TODO: Configurable units
        // TODO: Scene scale factor (how many real world units (meter/inch/centimeter etc) per world-space unit)
        //=============================================================================================================

        const cameraControl = this.plugin.viewer.cameraControl;

        this._onhoverSurface = cameraControl.on("hoverSurface", e => {
            switch (this._state) {
                case HOVERING:
                    document.body.style.cursor = "pointer";
                    break;
                case FINDING_ORIGIN:
                    this._currentMeasurement.wireVisible = true;
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.origin.entity = e.entity;
                    this._currentMeasurement.origin.worldPos = e.worldPos;
                    document.body.style.cursor = "pointer";
                    break;
                case MOVING_ORIGIN:
                    this._currentMeasurement.originVisible = true;
                    this._currentMeasurement.wireVisible = true;
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.origin.entity = e.entity;
                    this._currentMeasurement.origin.worldPos = e.worldPos;
                    document.body.style.cursor = "move";
                    break;
                case FINDING_TARGET:
                    this._currentMeasurement.wireVisible = true;
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.target.entity = e.entity;
                    this._currentMeasurement.target.worldPos = e.worldPos;
                    document.body.style.cursor = "pointer";
                    break;
                case MOVING_TARGET:
                    this._currentMeasurement.targetVisible = true;
                    this._currentMeasurement.wireVisible = true;
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.target.entity = e.entity;
                    this._currentMeasurement.target.worldPos = e.worldPos;
                    document.body.style.cursor = "move";
                    break;
            }
        });

        this._onPickedSurface = cameraControl.on("pickedSurface", e => {
            switch (this._state) {
                case HOVERING:
                    if (this._prevRuler) {
                        this._prevRuler.originVisible = true;
                        this._prevRuler.targetVisible = true;
                        this._prevRuler.axisVisible = true;
                    }
                    this._currentMeasurement = this.plugin.createMeasurement({
                        id: math.createUUID(),
                        origin: {
                            entity: e.entity,
                            worldPos: e.worldPos
                        },
                        target: {
                            entity: e.entity,
                            worldPos: e.worldPos
                        }
                    });
                    this._currentMeasurement.axisVisible = false;
                    this._currentMeasurement.targetVisible = true;
                    this._prevRuler = this._currentMeasurement;
                    this._state = FINDING_TARGET;
                    break;
                case FINDING_ORIGIN:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.targetVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
                case MOVING_ORIGIN:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
                case FINDING_TARGET:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.targetVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
                case MOVING_TARGET:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
            }
        });

        this._onHoverNothing = cameraControl.on("hoverOff", e => {
            switch (this._state) {
                case HOVERING:
                    break;
                case FINDING_ORIGIN:
                case MOVING_ORIGIN:
                    this._currentMeasurement.wireVisible = false;
                    this._currentMeasurement.originVisible = false;
                    this._currentMeasurement.axisVisible = false;
                    break;
                case FINDING_TARGET:
                case MOVING_TARGET:
                    this._currentMeasurement.wireVisible = false;
                    this._currentMeasurement.targetVisible = false;
                    this._currentMeasurement.axisVisible = false;
                    break;
            }
            document.body.style.cursor = "default";
        });

        this._onPickedNothing = cameraControl.on("pickedNothing", e => {
            switch (this._state) {
                case FINDING_ORIGIN:
                case FINDING_TARGET:
                    if (this._currentMeasurement) {
                        this._currentMeasurement.destroy();
                        this._currentMeasurement = null;
                        this._prevRuler = null;
                        this._state = HOVERING
                    }
                    break;
                case MOVING_ORIGIN:
                case MOVING_TARGET:
                    if (this._currentMeasurement) {
                        this._currentMeasurement.axisVisible = true;
                        this._currentMeasurement.originVisible = true;
                        this._currentMeasurement.targetVisible = true;
                    }
                    this._currentMeasurement = null;
                    this._prevRuler = null;
                    this._state = HOVERING;
                    break;
            }
        });

        this._onMouseDownRuler = this.plugin.on("mouseDownRuler", e => {

            //switch (state) {
            //    case HOVERING:
            //        currentRuler = _rulerId;
            //        state = MOVING_ORIGIN;
            //        viewer.hideRulerAxis(currentRuler);
            //        break;
            //    case MOVING_ORIGIN:
            //        viewer.showRulerAxis(currentRuler);
            //        viewer.showRulerOrigin(currentRuler);
            //        currentRuler = null;
            //        state = HOVERING;
            //        break;
            //    case FINDING_TARGET:
            //        break;
            //}

            this._currentMeasurement.originVisible = true;
            this._currentMeasurement.targetVisible = true;
            this._currentMeasurement.wireVisible = true;
            this._currentMeasurement.axisVisible = true;
        });

        this._onMouseDownRulerOrigin = this.plugin.on("mouseDownRulerOrigin", e => {
            switch (this._state) {
                case HOVERING:
                    this._currentMeasurement = e.ruler;
                    this._state = MOVING_ORIGIN;
                    //   this._currentMeasurement.axisVisible = false;
                    break;
                case MOVING_ORIGIN:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.originVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
                case FINDING_TARGET:
                    break;
            }
        });

        this._onMouseDownRulerTarget = this.plugin.on("mouseDownRulerTarget", e => {
            switch (this._state) {
                case HOVERING:
                    this._currentMeasurement = e.ruler;
                    //this._currentMeasurement.axisVisible = false;
                    this._state = MOVING_TARGET;
                    break;
                case FINDING_ORIGIN:
                    break;
                case MOVING_TARGET:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.targetVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    break;
            }
        });

        this._active = true;
    }

    /**
     * Deactivates this DistanceMeasurementPlugin, making it unresponsive to mouse and touch input.
     */
    deactivate() {

        if (!this._active) {
            return;
        }

        const cameraControl = this.plugin.viewer.cameraControl;
        const plugin = this.plugin;

        plugin.off(this._onMouseDownRuler);
        plugin.off(this._onMouseDownRulerOrigin);
        plugin.off(this._onMouseDownRulerTarget);

        cameraControl.off(this._onhoverSurface);
        cameraControl.off(this._onPickedSurface);
        cameraControl.off(this._onHoverNothing);
        cameraControl.off(this._onPickedNothing);

        this._currentMeasurement = null;
    }

    /**
     * Resets this DistanceMeasurementPlugin.
     */
    reset() {
    }

    /**
     * @private
     */
    destroy() {
        this.deactivate();
        super.destroy();
    }

}

export {DistanceMeasurementsControl};