import {DistanceMeasurementsControl} from "./DistanceMeasurementsControl.js";

import {DistanceMeasurementsPlugin} from "./DistanceMeasurementsPlugin";
import {PointerLens} from "../../extras/PointerLens/PointerLens";
import {DistanceMeasurement} from "./DistanceMeasurement";

/**
 * Creates {@link DistanceMeasurement}s in a {@link DistanceMeasurementsPlugin} from mouse input.
 *
 * @example
 * // Usage
 * const distanceMeasurementsControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
 *     pointerLens: new PointerLens(viewer),
 *     snapping: true
 * });
 */
export class DistanceMeasurementsMouseControl extends DistanceMeasurementsControl {

    /**
     * Creates a DistanceMeasurementsMouseControl bound to the given DistanceMeasurementsPlugin.
     *
     * @param {DistanceMeasurementsPlugin} distanceMeasurementsPlugin The DistanceMeasurementsPlugin to control.
     * @param {Object} cfg Configuration options.
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to provide a magnified view of the cursor when snapping is enabled.
     * @param {function} [cfg.canvasToPagePos] Optional function to map canvas-space coordinates to page coordinates.
     * @param {boolean} [cfg.snapping=true] Whether to enable snap-to-vertex and snap-to-edge for this DistanceMeasurementsMouseControl.
     */
    constructor(distanceMeasurementsPlugin: DistanceMeasurementsPlugin, cfg?: {
        pointerLens?: PointerLens;
        snapping?: boolean;
        canvasToPagePos? : Function;
    });

    /**
     * Gets if this DistanceMeasurementsMouseControl is currently active, where it is responding to input.
     *
     * @returns {boolean} True if this DistanceMeasurementsMouseControl is active.
     */
    get active(): boolean;

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsMouseControl.
     *
     * @param {boolean} snapping Whether to enable snap-to-vertex and snap-to-edge for this DistanceMeasurementsMouseControl.
     */
    set snapping(snapping: boolean);

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsMouseControl.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsMouseControl.
     */
    get snapping(): boolean;

    /**
     * Activates this DistanceMeasurementsMouseControl, ready to respond to input.
     */
    activate(): void;

    /**
     * Deactivates this DistanceMeasurementsMouseControl, making it unresponsive to input.
     */
    deactivate(): void;

    /**
     * Resets this DistanceMeasurementsMouseControl.
     */
    reset(): void;

    /**
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsMouseControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     */
    get currentMeasurement() : DistanceMeasurement

    /**
     * Destroys this DistanceMeasurementsMouseControl.
     */
    destroy(): void;
}
