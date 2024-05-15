import {Component} from "../../viewer/scene/Component";
import {AngleMeasurement} from "./AngleMeasurement";
import {AngleMeasurementsPlugin} from "./AngleMeasurementsPlugin";

/**
 * Creates {@link AngleMeasurement}s from mouse and touch input.
 *
 * Once the AngleMeasurementControl is activated, the first click on any {@link Entity} begins constructing a {@link AngleMeasurement}, fixing its origin to that Entity. The next click on any Entity will complete the AngleMeasurement, fixing its target to that second Entity. The AngleMeasurementControl will then wait for the next click on any Entity, to begin constructing another AngleMeasurement, and so on, until deactivated.
 */
export declare class AngleMeasurementsControl extends Component {

    /**
     * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsControl.
     * @type {AngleMeasurementsPlugin}
     */
    plugin: AngleMeasurementsPlugin;

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
    set snapping(snapping: boolean);

    /**
     * Gets whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsControl.
     *
     * This is `true` by default.
     *
     * @returns {boolean} Whether snap-to-vertex and snap-to-edge are enabled for this AngleMeasurementsControl.
     */
    get snapping(): boolean;

    /** Gets if this AngleMeasurementsControl is currently active, where it is responding to input.
     *
     * @returns {Boolean}
     */
    get active(): boolean;

    /**
     * Activates this AngleMeasurementsControl, ready to respond to input.
     */
    activate(): void;

    /**
     * Deactivates this AngleMeasurementsControl, making it unresponsive to input.
     *
     * Destroys any {@link AngleMeasurement} under construction.
     */
    deactivate(): void;

    /**
     * Gets the {@link AngleMeasurement} under construction by this AngleMeasurementsControl, if any.
     *
     * @returns {null|AngleMeasurement}
     */
    get currentMeasurement() : AngleMeasurement
    
    /**
     * Resets this AngleMeasurementsControl.
     *
     * Destroys any {@link AngleMeasurement} under construction.
     *
     * Does nothing if the AngleMeasurementsControl is not active.
     */
    reset(): void;

    /**
     * Fires when the measurement is ended.
     * @param event The measurementEnd event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementEnd", callback: (measurement: AngleMeasurement) => void, scope?: any): string

    /**
     * Fires when the measurement is cancelled.
     * @param event The measurementCancel event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementCancel", callback: (measurement: AngleMeasurement) => void, scope?: any): string

    /**
     * Fires when the measurement is started.
     * @param event The measurementStart event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "measurementStart", callback: (measurement: AngleMeasurement) => void, scope?: any): string

    /**
     * Fires when the control is (de)activated
     * @param event The activation event
     * @param callback Called fired on the event
     * @param scope  Scope for the callback
     */
    on(event: "activated", callback: (activated: boolean) => void, scope?: any): string
}
