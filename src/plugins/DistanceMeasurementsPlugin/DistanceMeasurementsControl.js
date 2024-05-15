import {Component} from "../../viewer/scene/Component.js";

/**
 * Creates {@link DistanceMeasurement}s in a {@link DistanceMeasurementsPlugin} from user input.
 *
 * @interface
 * @abstract
 */
export class DistanceMeasurementsControl extends Component {

    /**
     * Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this DistanceMeasurementsControl is active.
     * @abstract
     */
    get active() {
    }

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * Internally, this deactivates then activates the DistanceMeasurementsControl when changed, which means that
     * it will destroy any DistanceMeasurements currently under construction, and incurs some overhead, since it unbinds
     * and rebinds various input handlers.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-edge for this DistanceMeasurementsControl.
     */
    set snapping(snapping) {
    }

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsControl.
     */
    get snapping() {
        return true;
    }

    /**
     * Activates this DistanceMeasurementsControl, ready to respond to input.
     *
     * @abstract
     */
    activate() {
    }

    /**
     * Deactivates this DistanceMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl.
     *
     * @abstract
     */
    deactivate() {
    }

    /**
     * Resets this DistanceMeasurementsControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl.
     *
     * Does nothing if the DistanceMeasurementsControl is not active.
     *
     * @abstract
     */
    reset() {
    }

    /**
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     *
     * @abstract
     */
    get currentMeasurement() {
        return null;
    }

    /**
     * Destroys this DistanceMeasurementsControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl.
     *
     * @abstract
     */
    destroy() {
    }
}