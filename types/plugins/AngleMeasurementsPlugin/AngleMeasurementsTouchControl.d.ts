import { AngleMeasurementsControl } from "./AngleMeasurementsControl";
import {AngleMeasurementsPlugin} from "./AngleMeasurementsPlugin";
import {PointerLens} from "../../extras/";
import {AngleMeasurement} from "./AngleMeasurement";

/**
 * Creates {@link AngleMeasurement}s in an {@link AngleMeasurementsPlugin} from touch input.
 *
 * @example
 * import { Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsTouchControl, PointerLens } from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.039];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "Duplex.xkt"
 * });
 *
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const pointerLens = new PointerLens(viewer); // Create a PointerLens instance
 *
 * const angleMeasurementsTouchControl = new AngleMeasurementsTouchControl(angleMeasurements, {
 *     pointerLens: pointerLens,
 *     snapping: true
 * });
 *
 * angleMeasurementsTouchControl.activate();
 */
export class AngleMeasurementsTouchControl extends AngleMeasurementsControl {

    /**
     * Creates a new AngleMeasurementsTouchControl.
     *
     * @param {AngleMeasurementsPlugin} angleMeasurementsPlugin The AngleMeasurementsPlugin to control.
     * @param {Object} [cfg] Configuration options.
     * @param {PointerLens} [cfg.pointerLens] A PointerLens to use for providing a magnified view of the cursor when snapping is enabled.
     * @param {function} [cfg.canvasToPagePos] Optional function to map canvas-space coordinates to page coordinates.
     * @param {boolean} [cfg.snapping=true] Whether to initially enable snap-to-vertex and snap-to-edge for this AngleMeasurementsTouchControl.
     */
    constructor(angleMeasurementsPlugin: AngleMeasurementsPlugin, cfg?: {
        pointerLens?: PointerLens;
        snapping?: boolean;
        canvasToPagePos? : Function;
    });

    /**
     * Gets whether this AngleMeasurementsTouchControl is currently active, responding to input.
     *
     * @returns {boolean} True if active, false otherwise.
     */
    get active(): boolean;

    /**
     * Sets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsTouchControl.
     *
     * @param {boolean} snapping True to enable snap-to-vertex and snap-to-edge, false to disable.
     */
    set snapping(snapping: boolean);

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsTouchControl.
     *
     * @returns {boolean} True if snap-to-vertex and snap-to-edge are enabled, false otherwise.
     */
    get snapping(): boolean;

    /**
     * Activates this AngleMeasurementsTouchControl, making it responsive to input.
     */
    activate(): void;

    /**
     * Deactivates this AngleMeasurementsTouchControl, making it unresponsive to input.
     */
    deactivate(): void;

    /**
     * Resets this AngleMeasurementsTouchControl, destroying any AngleMeasurement under construction.
     */
    reset(): void;

    /**
     * Gets the {@link AngleMeasurement} under construction by this AngleMeasurementsTouchControl, if any.
     *
     * @returns {null|AngleMeasurement}
     */
    get currentMeasurement() : AngleMeasurement

    /**
     * Destroys this AngleMeasurementsTouchControl.
     */
    destroy(): void;
}
