import {Component} from "../../viewer/scene/Component.js";

/**
 * Creates {@link AngleMeasurement}s in an {@link AngleMeasurementsPlugin} from user input.
 *
 * @interface
 * @abstract
 */
export class AngleMeasurementsControl extends Component {

    /**
     * Gets if this AngleMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this AngleMeassurementsControl is active.
     * @abstract
     */
    get active() {
    }

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * Internally, this deactivates then activates the AngleMeasurementsControl when changed, which means that
     * it will destroy any AngleMeasurements currently under construction, and incurs some overhead, since it unbinds
     * and rebinds various input handlers.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-edge for this AngleMeasurementsControl.
     */
    set snapping(snapping) {
    }

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsControl.
     */
    get snapping() {
        return true;
    }

    /**
     * Activates this AngleMeasurementsMouseControl, ready to respond to input.
     *
     * @abstract
     */
    activate() {
    }

    /**
     * Deactivates this AngleMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsControl.
     *
     * @abstract
     */
    deactivate() {
    }

    /**
     * Resets this AngleMeasurementsControl.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsControl.
     *
     * Does nothing if the AngleMeasurementsControl is not active.
     *
     * @abstract
     */
    reset() {
    }

    /**
     * Gets the {@link AngleMeasurement} under construction by this AngleMeasurementsControl, if any.
     *
     * @returns {null|AngleMeasurement}
     * @abstract
     */
    get currentMeasurement() {
        return null;
    }

    /**
     * Destroys this AngleMeasurementsMouseControl.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsControl.
     *
     * @abstract
     */
    destroy() {
    }
}