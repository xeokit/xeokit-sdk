import { Component } from "../../viewer/scene/Component";
import { AngleMeasurementsPlugin } from "./AngleMeasurementsPlugin";

/**
 * Creates {@link AngleMeasurement}s from mouse and touch input.
 *
 * Once the AngleMeasurementControl is activated, the first click on any {@link Entity} begins constructing a {@link AngleMeasurement}, fixing its origin to that Entity. The next click on any Entity will complete the AngleMeasurement, fixing its target to that second Entity. The AngleMeasurementControl will then wait for the next click on any Entity, to begin constructing another AngleMeasurement, and so on, until deactivated.
 */
export class AngleMeasurementsControl extends Component {
  /**
   * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurementsControl.
   * @type {AngleMeasurementsPlugin}
   */
  plugin: AngleMeasurementsPlugin;
  
  /** Gets if this AngleMeasurementsControl is currently active, where it is responding to input.
   *
   * @returns {boolean}
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
   * Resets this AngleMeasurementsControl.
   *
   * Destroys any {@link AngleMeasurement} under construction.
   *
   * Does nothing if the AngleMeasurementsControl is not active.
   */
  reset(): void;
}
