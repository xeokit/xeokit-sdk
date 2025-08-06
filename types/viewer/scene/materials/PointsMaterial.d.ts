import { Material } from "./Material";
import { Component } from "../Component";

export declare type PointsMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Point size in pixels. */
  pointSize?: number;
  /** Whether points are round (````true````) or square (````false````). */
  roundPoints?: boolean;
  /** Whether apparent point size reduces with distance when {@link Camera.projection} is set to "perspective". */
  perspectivePoints?: boolean;
  /** When ````perspectivePoints```` is ````true````, this is the minimum rendered size of each point in pixels. */
  minPerspectivePointSize?: number;
  /** When ````perspectivePoints```` is ````true````, this is the maximum rendered size of each point in pixels. */
  maxPerspectivePointSize?: number;
  /** When this is true, points are only rendered when their intensity value falls within the range given in {@link } */
  filterIntensity?: boolean;
  /** When ````filterIntensity```` is ````true````, points with intensity below this value will not be rendered. */
  minIntensity?: number;
  /** When ````filterIntensity```` is ````true````, points with intensity above this value will not be rendered. */
  maxIntensity?: number;
  /** Selects a preset PointsMaterial configuration - see {@link PointsMaterial.presets}. */
  preset?: string;
};

/**
 * Configures the size and shape of "points" geometry primitives.
 */
export declare class PointsMaterial extends Material {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {PointsMaterialConfiguration} [cfg] The PointsMaterial configuration
   */
  constructor(owner: Component, cfg?: PointsMaterialConfiguration);

  /**
   * Available PointsMaterial presets.
   *
   * @type {Object}
   */
  readonly presets: any;

  /**
   * Preset ````PointsMaterial```` configuration.
   *
   * Default value is ````"default"````.
   *
   * @type {String}
   */
  preset: string;

  /**
   * Point size.
   *
   * Default value is ````2.0```` pixels.
   *
   * @type {Number}
   */
  pointSize: number;

  /**
   * Whether points are round or square.
   *
   * Default is ````true```` to set points round.
   *
   * @type {Boolean}
   */
  roundPoints: boolean;

  /**
   * Whether rendered point size reduces with distance when {@link Camera.projection} is set to ````"perspective"````.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  perspectivePoints: boolean;

  /**
   * The minimum rendered size of points when {@link PointsMaterial.perspectivePoints} is ````true````.
   *
   * Default value is ````1.0```` pixels.
   *
   * @type {Number}
   */
  minPerspectivePointSize: number;

  /**
   * The maximum rendered size of points when {@link PointsMaterial.perspectivePoints} is ````true````.
   *
   * Default value is ````6```` pixels.
   *
   * @type {Number}
   */
  maxPerspectivePointSize: number;

  /**
   * Whether intensity filtering is enabled.
   *
   * Default is ````false````.
   *
   * @type {Boolean}
   */
  filterIntensity: boolean;

  /**
   * The minimum intensity when {@link PointsMaterial.filterIntensity} is ````true````.
   *
   * Default value is ````0````.
   *
   * @type {Number}
   */
  minIntensity: number;

  /**
   * The maximum intensity when {@link PointsMaterial.filterIntensity} is ````true````.
   *
   * Default value is ````1````.
   *
   * @type {Number}
   */
  maxIntensity: number;

  /**
   * Destroys this ````PointsMaterial````.
   */
  destroy(): void;
}
