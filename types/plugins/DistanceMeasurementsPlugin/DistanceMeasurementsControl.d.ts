import { Component } from "../../viewer/scene/Component";
import { DistanceMeasurement } from "./DistanceMeasurement";
import { DistanceMeasurementsPlugin } from "./DistanceMeasurementsPlugin";

/**
 * Creates {@link DistanceMeasurement}s from mouse and touch input.
 */
export declare class DistanceMeasurementsControl extends Component {
  /**
   * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurementsControl.
   * @type {DistanceMeasurementsPlugin}
   */
  plugin: DistanceMeasurementsPlugin;
  
  /** Gets if this DistanceMeasurementsControl is currently active, where it is responding to input.
   *
   * @returns {boolean}
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
}
