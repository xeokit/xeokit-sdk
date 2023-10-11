import {Component} from "../../viewer";

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
     * Gets whether snap-to-vertex is enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean}
     * @abstract
     */
    get snapToVertex() {
    }

    /**
     * Sets whether snap-to-vertex is enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @param {boolean} snapToVertex Whether to enable snap-to-vertex for this AngleMeasurementsControl.
     * @abstract
     */
    set snapToVertex(snapToVertex) {
    }

    /**
     * Gets whether snap-to-edge is enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean}
     * @abstract
     */
    get snapToEdge() {
    }

    /**
     * Sets whether snap-to-edge is enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @param snapToEdge {boolean} snapToEdge Whether to enable snap-to-edge for this AngleMeasurementsControl.
     * @abstract
     */
    set snapToEdge(snapToEdge) {
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
     * Destroys this AngleMeasurementsMouseControl.
     *
     * Destroys any {@link AngleMeasurement} under construction by this AngleMeasurementsControl.
     *
     * @abstract
     */
    destroy() {
    }
}