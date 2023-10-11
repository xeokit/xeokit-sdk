import {Component} from "../../viewer";

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
     * Gets whether snap-to-vertex is enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean}  Whether snap-to-vertex is enabled for this DistanceMeasurementsControl.
     * @abstract
     */
    get snapToVertex() {
    }

    /**
     * Sets whether snap-to-vertex is enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @param {boolean} snapToVertex Whether to enable snap-to-vertex for this DistanceMeasurementsControl.
     * @abstract
     */
    set snapToVertex(snapToVertex) {
    }

    /**
     * Gets whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     * @abstract
     */
    get snapToEdge() {
    }

    /**
     * Sets whether snap-to-edge is enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @param snapToEdge {boolean} snapToEdge Whether to enable snap-to-edge for this DistanceMeasurementsControl.
     * @abstract
     */
    set snapToEdge(snapToEdge) {
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
     * Destroys this DistanceMeasurementsControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl.
     *
     * @abstract
     */
    destroy() {
    }
}