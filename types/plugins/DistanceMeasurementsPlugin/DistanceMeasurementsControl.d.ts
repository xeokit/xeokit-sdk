import { Component } from "../../viewer/scene/Component";
import { DistanceMeasurementsPlugin } from "./DistanceMeasurementsPlugin";

/**
 * Creates {@link DistanceMeasurement}s from mouse and touch input.
 */
export class DistanceMeasurementsControl extends Component {
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
}
