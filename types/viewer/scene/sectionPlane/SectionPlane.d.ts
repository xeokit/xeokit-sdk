import { Component } from "../Component";

export declare type SectionPlaneConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Indicates whether or not this SectionPlane is active. */
  active?: boolean;
  /** World-space position of the SectionPlane. */
  pos?: number[];
  /** Vector perpendicular to the plane surface, indicating the SectionPlane plane orientation. */
  dir?: number[];
};

/**
 *  An arbitrarily-aligned World-space clipping plane.
 */
export declare class SectionPlane extends Component {
  /**
   * @constructor
   * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this SectionPlane as well.
   * @param {SectionPlaneConfiguration} [cfg]  SectionPlane configuration
   */
  constructor(owner?: Component, cfg?: SectionPlaneConfiguration);

  /**
   * Sets if this SectionPlane is active or not.
   *
   * Default value is ````true````.
   *
   * @param {Boolean} value Set ````true```` to activate else ````false```` to deactivate.
   */
  set active(arg: boolean);

  /**
   * Gets if this SectionPlane is active or not.
   *
   * Default value is ````true````.
   *
   * @returns {Boolean} Returns ````true```` if active.
   */
  get active(): boolean;

  /**
   * Sets the World-space position of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, 0]````.
   *
   * @param {Number[]} value New position.
   */
  set pos(arg: number[]);

  /**
   * Gets the World-space position of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, 0]````.
   *
   * @returns {Number[]} Current position.
   */
  get pos(): number[];

  /**
   * Sets the quaternion of this SectionPlane's plane.
   *
   * Default value is ````[0, -1, 0, 0]````.
   *
   * @param {Number[]} value New quaternion.
   */
  set quaternion(value: number[]);

  /**
   * Gets the quaternion of this SectionPlane's plane.
   *
   * Default value is ````[0, -1, 0, 0]````.
   *
   * @returns {Number[]} value Current quaternion.
   */
  get quaternion(): number[];

  /**
   * Sets the roll of this SectionPlane's plane.
   *
   * Default value is ````0````.
   *
   * @param {Number[]} value New roll.
   */
  set roll(value: number[]);

  /**
   * Gets the roll of this SectionPlane's plane.
   *
   * Default value is ````0````.
   *
   * @returns {Number[]} value Current roll.
   */
  get roll(): number[];

  /**
   * Sets the direction of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, -1]````.
   *
   * @param {Number[]} value New direction.
   */
  set dir(arg: number[]);

  /**
   * Gets the direction of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, -1]````.
   *
   * @returns {Number[]} value Current direction.
   */
  get dir(): number[];

  /**
   * Gets this SectionPlane's distance to the origin of the World-space coordinate system.
   *
   * This is the dot product of {@link SectionPlane.pos} and {@link SectionPlane.dir} and is automatically re-calculated
   * each time either of two properties are updated.
   *
   * @returns {Number}
   */
  get dist(): number;

  /**
   * Inverts the direction of {@link SectionPlane.dir}.
   */
  flipDir(): void;

  /**
   * @destroy
   */
  destroy(): void;
}
