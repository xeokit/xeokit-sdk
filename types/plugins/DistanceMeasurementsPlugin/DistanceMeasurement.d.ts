import { Component } from "../../viewer/scene/Component";
import { DistanceMeasurementsPlugin } from "./DistanceMeasurementsPlugin";
import { Marker } from "../../viewer/scene/marker";

/**
 * @desc Measures the distance between two 3D points.
 */
export declare class DistanceMeasurement extends Component {
  /**
   * The {@link DistanceMeasurementsPlugin} that owns this DistanceMeasurement.
   * @type {DistanceMeasurementsPlugin}
   */
  plugin: DistanceMeasurementsPlugin;

  /**
   * Sets the axes basis for the measurement.
   * 
   * The value is a 4x4 matrix where each column-vector defines an axis and must have unit length.
   * 
   * This is the ```identity``` matrix by default, meaning the measurement axes are the same as the world axes.
   */
  set axesBasis(value: number[]);

  /**
   * Gets the axes basis for the measurement.
   * 
   * The value is a 4x4 matrix where each column-vector defines an axis and must have unit length.
   * 
   * This is the ```identity``` matrix by default, meaning the measurement axes are the same as the world axes.
   */
  get axesBasis(): number[];

  /**
   * Sets whether this DistanceMeasurement indicates that its measurement is approximate.
   *
   * This is ````true```` by default.
   *
   * @type {Boolean}
   */
  set approximate(arg: boolean);

  /**
   * Gets whether this DistanceMeasurement indicates that its measurement is approximate.
   *
   * This is ````true```` by default.
   *
   * @type {Boolean}
   */
  get approximate(): boolean;

  /**
   * Sets whether this DistanceMeasurement is visible or not.
   *
   * @type {Boolean}
   */
  set visible(arg: boolean);

  /**
   * Gets whether this DistanceMeasurement is visible or not.
   *
   * @type {Boolean}
   */
  get visible(): boolean;

  /**
   * Sets whether this DistanceMeasurement is highlighted or not.
   *
   * @type {Boolean}
   */
  set highlighted(arg: boolean);
  /**
   * Gets whether this DistanceMeasurement is highlighted or not.
   *
   * @type {Boolean}
   */
  get highlighted(): boolean;

  /**
   * Sets if the origin {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  set originVisible(arg: boolean);

  /**
   * Gets if the origin {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  get originVisible(): boolean;

  /**
   * Sets if the target {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  set targetVisible(arg: boolean);

  /**
   * Gets if the target {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  get targetVisible(): boolean;

  /**
     * Sets if the measurement is adjusted based on rotation
     *
     * @type {Boolean}
     */
  set useRotationAdjustment(arg: boolean);

  /**
   * Gets if the measurement is adjusted based on rotation
   *
   * @type {Boolean}
   */
  get useRotationAdjustment(): boolean;

  /**
   * Sets if the direct point-to-point wire between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target} is visible.
   *
   * @type {Boolean}
   */
  set wireVisible(arg: boolean);

  /**
   * Gets if the direct point-to-point wire between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target} is visible.
   *
   * @type {Boolean}
   */
  get wireVisible(): boolean;

  /**
   * Sets if the labels are visible
   *
   * @type {Boolean}
   */
  set labelsVisible(arg: boolean);

  /**
   * Sets if the labels are visible
   *
   * @type {Boolean}
   */
  get labelsVisible(): boolean;

  /**
   * Sets if the x label is visible.
   *
   * @type {Boolean}
   */
  set xLabelVisible(arg: boolean);

  /**
   * Gets if the x label is visible.
   *
   * @type {Boolean}
   */
  get xLabelVisible(): boolean;

  /**
   * Sets if the y label is visible.
   *
   * @type {Boolean}
   */
  set yLabelVisible(arg: boolean);

  /**
   * Gets if the y label is visible.
   *
   * @type {Boolean}
   */
  get yLabelVisible(): boolean;

  /**
   * Sets if the z label is visible.
   *
   * @type {Boolean}
   */
  set zLabelVisible(arg: boolean);

  /**
   * Gets if the z label is visible.
   *
   * @type {Boolean}
   */
  get zLabelVisible(): boolean;

  /**
   * Sets if the length label is visible.
   *
   * @type {Boolean}
   */
  set lengthLabelVisible(arg: boolean);

  /**
   * Gets if the length label is visible.
   *
   * @type {Boolean}
   */
  get lengthLabelVisible(): boolean;
  
  /**
   * Sets if the axis-aligned wires between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target} are visible.
   *
   * @type {Boolean}
   */
  set axisVisible(arg: boolean);

  /**
   * Gets if the axis-aligned wires between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target} are visible.
   *
   * @type {Boolean}
   */
  get axisVisible(): boolean;

  /**
   * Gets the origin {@link Marker}.
   *
   * @type {Marker}
   */
  get origin(): Marker;
  
  /**
   * Gets the target {@link Marker}.
   *
   * @type {Marker}
   */
  get target(): Marker;
  
  /**
   * Gets the World-space direct point-to-point distance between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target}.
   *
   * @type {Number}
   */
  get length(): number;

  /**
   * Sets the color.
   *
   * @type {String}
   */
  set color(arg: string);

  /**
   * Gets the color.
   *
   * @type {String}
   */
  get color(): string;

  /**
   * Sets if labels should be positioned on the wires.
   *
   * @type {Boolean}
   */
  set labelsOnWires(arg: boolean);

  /**
   * Gets if labels should be positioned on the wires.
   *
   * @type {Boolean}
   */
  get labelsOnWires() : boolean;

  /**
   * Sets the higlihted state on a measurement
   *
   * @type {String}
   */
  setHighlighted(highlighted: boolean): void;
}
