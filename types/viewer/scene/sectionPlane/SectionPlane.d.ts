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
   * Whether this SectionPlane is active or not.
   *
   * Default value is ````true````.
   */
  active: boolean;

  /**
   * The World-space position of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, 0]````.
   */
  pos: number[];

  /**
   * The quaternion of this SectionPlane's plane.
   *
   * Default value is ````[0, -1, 0, 0]````.
   */
  quaternion: number[];

  /**
   * The roll of this SectionPlane's plane.
   *
   * Default value is ````0````.
   */
  roll: number[];

  /**
   * The direction of this SectionPlane's plane.
   *
   * Default value is ````[0, 0, -1]````.
   */
  dir: number[];

  /**
   * This SectionPlane's distance to the origin of the World-space coordinate system.
   *
   * This is the dot product of {@link SectionPlane.pos} and {@link SectionPlane.dir} and is automatically re-calculated
   * each time either of two properties are updated.
   */
  readonly dist: number;

  /**
   * Inverts the direction of {@link SectionPlane.dir}.
   */
  flipDir(): void;

  /**
   * @destroy
   */
  destroy(): void;
}
