import { Component } from "../../viewer/scene/Component";
import { AngleMeasurementsPlugin } from "./AngleMeasurementsPlugin";
import { Marker } from "../../viewer/scene/marker";

/**
 * @desc Measures the angle indicated by three 3D points.
 */
export declare class AngleMeasurement extends Component {
  /**
   * The {@link AngleMeasurementsPlugin} that owns this AngleMeasurement.
   * @type {AngleMeasurementsPlugin}
   */
  plugin: AngleMeasurementsPlugin;
  
  /**
   * Sets whether this AngleMeasurement indicates that its measurement is approximate.
   *
   * This is ````true```` by default.
   *
   * @type {Boolean}
   */
  set approximate(arg: boolean);
  /**
   * Gets whether this AngleMeasurement indicates that its measurement is approximate.
   *
   * This is ````true```` by default.
   *
   * @type {Boolean}
   */
  get approximate(): boolean;
  /**
   * Sets whether this AngleMeasurement is visible or not.
   *
   * @type {Boolean}
   */
  set visible(arg: boolean);
  /**
   * Gets whether this AngleMeasurement is visible or not.
   *
   * @type {Boolean}
   */
  get visible(): boolean;

  /**
   * Sets whether this AngleMeasurement is highlighted or not.
   *
   * @type {Boolean}
   */
  set highlighted(arg: boolean);
  /**
   * Gets whether this AngleMeasurement is highlighted or not.
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
   * Sets if the corner {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  set cornerVisible(arg: boolean);
  /**
   * Gets if the corner {@link Marker} is visible.
   *
   * @type {Boolean}
   */
  get cornerVisible(): boolean;
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
   * Sets if the wire between the origin and the corner is visible.
   *
   * @type {Boolean}
   */
  set originWireVisible(arg: boolean);
  /**
   * Gets if the wire between the origin and the corner is visible.
   *
   * @type {Boolean}
   */
  get originWireVisible(): boolean;
  /**
   * Sets if the wire between the target and the corner is visible.
   *
   * @type {Boolean}
   */
  set targetWireVisible(arg: boolean);
  /**
   * Gets if the wire between the target and the corner is visible.
   *
   * @type {Boolean}
   */
  get targetWireVisible(): boolean;
  /**
   * Sets if the angle label is visible.
   *
   * @type {Boolean}
   */
  set angleVisible(arg: boolean);
  /**
   * Gets if the angle label is visible.
   *
   * @type {Boolean}
   */
  get angleVisible(): boolean;
  
  /**
   * Gets the origin {@link Marker}.
   *
   * @type {Marker}
   */
  get origin(): Marker;

  /**
   * Gets the corner {@link Marker}.
   *
   * @type {Marker}
   */
  get corner(): Marker;

  /**
   * Gets the target {@link Marker}.
   *
   * @type {Marker}
   */
  get target(): Marker;

  /**
   * Gets the angle between two connected 3D line segments, given
   * as three positions on the surface(s) of one or more {@link Entity}s.
   *
   * @type {Number}
   */
  get angle(): number;
}