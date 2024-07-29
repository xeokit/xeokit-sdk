import {Component} from "../../viewer/scene/Component";
import {DistanceMeasurement} from "./DistanceMeasurement";
import {DistanceMeasurementsPlugin} from "./DistanceMeasurementsPlugin";

/**
 * Creates {@link DistanceMeasurement}s from mouse and touch input.
 */
export declare class DistanceMeasurementsControl extends Component {

    /**
     * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsControl.
     * @type {DistanceMeasurementsPlugin}
     */
    plugin: DistanceMeasurementsPlugin;

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
    set snapping(snapping: boolean);

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this DistanceMeasurementsControl.
     */
    get snapping(): boolean;


    /** Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active(): boolean;

    /**
     * Activates this DistanceMeasurementsControl, ready to respond to input.
     */
    activate(): void;

    /**
     * Deactivates this DistanceMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     */
    deactivate(): void;

    /**
     * Gets the {@link DistanceMeasurement} under construction by this DistanceMeasurementsControl, if any.
     *
     * @returns {null|DistanceMeasurement}
     */
    get currentMeasurement() : DistanceMeasurement

    /**
     * Resets this DistanceMeasurementsControl.
     *
     * Destroys any {@link DistanceMeasurement} under construction.
     *
     * Does nothing if the DistanceMeasurementsControl is not active.
     */
    reset(): void;

    /**
     * Fires when the measurement is ended.
     * @param event The measurementEnd event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementEnd", callback: (measurement: DistanceMeasurement) => void, scope?: any): string

    /**
     * Fires when the measurement is cancelled.
     * @param event The measurementCancel event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementCancel", callback: (measurement: DistanceMeasurement) => void, scope?: any): string

    /**
     * Fires when the measurement is started.
     * @param event The measurementStart event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementStart", callback: (measurement: DistanceMeasurement) => void, scope?: any): string

    /**
     * Fires when the control is (de)activated
     * @param event The activation event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "activated", callback: (activated: boolean) => void, scope?: any): string
}

export declare class DistanceMeasurementEditControl extends Component {
    /**
     * Deactivates a {@link DistanceMeasurementEditControl}.
     */
    deactivate(): void;
}

export declare class DistanceMeasurementEditMouseControl extends DistanceMeasurementEditControl {

}

export declare class DistanceMeasurementEditTouchControl extends DistanceMeasurementEditControl {

}
