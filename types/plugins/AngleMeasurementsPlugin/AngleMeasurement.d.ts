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
   * Whether this AngleMeasurement indicates that its measurement is approximate.
   *
   * This is ````true```` by default.
   */
  approximate: boolean;
  /**
   * Whether this AngleMeasurement is visible or not.
   */
  visible: boolean;

  /**
   * Whether this AngleMeasurement is highlighted or not.
   */
  highlighted: boolean;

  /**
   * Whether the origin {@link Marker} is visible.
   */
  originVisible: boolean;
  /**
   * Whether the corner {@link Marker} is visible.
   */
  cornerVisible: boolean;
  /**
   * Whether the target {@link Marker} is visible.
   */
  targetVisible: boolean;
  /**
   * Whether the wire between the origin and the corner is visible.
   */
  originWireVisible: boolean;
  /**
   * Whether the wire between the target and the corner is visible.
   */
  targetWireVisible: boolean;
  /**
   * Whether the angle label is visible.
   */
  angleVisible: boolean;
  
  /**
   * The origin {@link Marker}.
   */
  readonly origin: Marker;

  /**
   * The corner {@link Marker}.
   */
  readonly corner: Marker;

  /**
   * The target {@link Marker}.
   */
  readonly target: Marker;

  /**
   * The angle between two connected 3D line segments, given
   * as three positions on the surface(s) of one or more {@link Entity}s.
   */
  readonly angle: number;
}