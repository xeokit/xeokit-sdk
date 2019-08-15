import {Component} from "../../viewer/scene/Component.js";
import {math} from "../../viewer/scene/math/math.js";

const HOVERING = 0;
const FINDING_ORIGIN = 1;
const FINDING_TARGET = 2;
const MOVING_ORIGIN = 3;
const MOVING_TARGET = 4;

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

        this._state = HOVERING;
        this._currentMeasurement = null;
        this._prevRuler = null;

        this._onhoverSurface = null;
        this._onPickedSurface = null;
        this._onHoverNothing = null;
        this._onPickedNothing = null;
    }

    /** Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {boolean}
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

        this._onhoverSurface = cameraControl.on("hoverSurface", e => {
            if (this._state === HOVERING) {
                document.body.style.cursor = "pointer";
                return;
            }
            if (this._currentMeasurement) {
                switch (this._state) {
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
            }
        });

        var bail = false;

        this._onInputMouseDown = this.plugin.viewer.scene.input.on("mousedown", () => {
            switch (this._state) {
                case FINDING_TARGET:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement.targetVisible = true;
                    this._currentMeasurement = null;
                    this._prevRuler = null;
                    this._state = HOVERING;
                    bail = true;
                    break;
                case MOVING_TARGET:
                    this._currentMeasurement.axisVisible = true;
                    this._currentMeasurement = null;
                    this._state = HOVERING;
                    this._prevRuler = null;
                    bail = true;
                    break;
            }
        });

        this._onPickedSurface = cameraControl.on("pickedSurface", e => {
            if (bail) {
                bail = false;
                return;
            }
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
            }
        });

        this._onHoverNothing = cameraControl.on("hoverOff", e => {
            if (this._currentMeasurement) {
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
            }
            document.body.style.cursor = "default";
        });

        this._onPickedNothing = cameraControl.on("pickedNothing", e => {
            if (this._currentMeasurement) {
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
            }
        });

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

        this.reset();

        const cameraControl = this.plugin.viewer.cameraControl;
        const input = this.plugin.viewer.scene.input;

        input.off(this._onInputMouseDown);

        cameraControl.off(this._onhoverSurface);
        cameraControl.off(this._onPickedSurface);
        cameraControl.off(this._onHoverNothing);
        cameraControl.off(this._onPickedNothing);

        this._currentMeasurement = null;
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

        if (this._currentMeasurement) {
            this._currentMeasurement.destroy();
            this._currentMeasurement = null;
        }
        this._prevRuler = null;
        this._state = HOVERING;
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