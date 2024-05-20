import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl";
import {DistanceMeasurementsPlugin} from "./DistanceMeasurementsPlugin";
import {PointerLens} from "../../extras/";
import {DistanceMeasurement} from "./DistanceMeasurement";

/**
 * Creates {@link DistanceMeasurement}s in a {@link DistanceMeasurementsPlugin} from touch input.
 *
 * @example
 * // Usage
 * const distanceMeasurementsControl = new DistanceMeasurementsTouchControl(distanceMeasurementsPlugin, {
 *     pointerLens: new PointerLens(viewer),
 *     snapping: true
 * });
 */
export class DistanceMeasurementsTouchControl extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsTouchControl bound to the given DistanceMeasurementsPlugin.
     *
     * @param {DistanceMeasurementsPlugin} distanceMeasurementsPlugin The DistanceMeasurementsPlugin to control.
     * @param {Object} cfg Configuration options.
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to provide a magnified view of the cursor when snapping is enabled.
     * @param {function} [cfg.canvasToPagePos] Optional function to map canvas-space coordinates to page coordinates.
     * @param {boolean} [cfg.snapping=true] Whether to enable snap-to-vertex and snap-to-edge for this DistanceMeasurementsTouchControl.
     */
    constructor(distanceMeasurementsPlugin: DistanceMeasurementsPlugin, cfg?: {
        pointerLens?: PointerLens;
        snapping?: boolean;
        canvasToPagePos? : Function;
    });

    /**
     * Gets if this DistanceMeasurementsTouchControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this DistanceMeasurementsTouchControl is active.
     */
    get active(): boolean;

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-to-edge for this DistanceMeasurementsTouchControl.
     */
    set snapping(snapping: boolean);

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsTouchControl.
     */
    get snapping(): boolean;

    /**
     * Activates this DistanceMeasurementsTouchControl, ready to respond to input.
     */
    activate(): void;

    /**
     * Deactivates this DistanceMeasurementsTouchControl, making it unresponsive to input.
     */
    deactivate(): void;

    /**
     * Resets this DistanceMeasurementsTouchControl.
     */
    reset(): void;

    /**
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsTouchControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     */
    get currentMeasurement() : DistanceMeasurement

    /**
     * Destroys this DistanceMeasurementsTouchControl.
     */
    destroy(): void;
}
