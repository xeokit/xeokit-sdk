import { Component } from "../Component";
import { Entity } from "../Entity";

export declare type MarkerConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Entity to associate this Marker with. When the Marker has an Entity, then {@link Marker.visible} will always be ````false```` if {@link Entity.visible} is false. */
  entity?: Entity
  /** Indicates whether or not this Marker is hidden (ie. {@link Marker.visible} is ````false```` whenever occluded by {@link Entity}s in the {@link Scene}. */
  occludable?: boolean;
  /** World-space 3D Marker position. */
  worldPos?: number[];
};

/**
 * @desc Tracks the World, View and Canvas coordinates, and visibility, of a position within a {@link Scene}.
 */
export declare class Marker extends Component {
  /**
   * @constructor
   * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this Marker as well.
   * @param {MarkerConfiguration} [cfg]  Marker configuration
   */
  constructor(owner?: Component, cfg?: MarkerConfiguration);
  
  /**
   * Sets the {@link Entity} this Marker is associated with.
   *
   * An Entity is optional. When the Marker has an Entity, then {@link Marker.visible} will always be ````false````
   * if {@link Entity.visible} is false.
   *
   * @type {Entity}
   */
  set entity(arg: Entity);
  
  /**
   * Gets the {@link Entity} this Marker is associated with.
   *
   * @type {Entity}
   */
  get entity(): Entity;

  /**
   * Sets the World-space 3D position of this Marker.
   *
   * Fires a "worldPos" event with new World position.
   *
   * @type {Number[]}
   */
  set worldPos(arg: number[]);

  /**
   * Gets the World-space 3D position of this Marker.
   *
   * @type {Number[]}
   */
  get worldPos(): number[];

  /**
   * Sets whether occlusion testing is performed for this Marker.
   *
   * When this is ````true````, then {@link Marker.visible} will be ````false```` whenever the Marker is occluded by an {@link Entity} in the 3D view.
   *
   * The {@link Scene} periodically occlusion-tests all Markers on every 20th "tick" (which represents a rendered frame). We
   * can adjust that frequency via property {@link Scene.ticksPerOcclusionTest}.
   *
   * @type {Boolean}
   */
  set occludable(arg: boolean);

  /**
   * Gets whether occlusion testing is performed for this Marker.
   *
   * When this is ````true````, then {@link Marker.visible} will be ````false```` whenever the Marker is occluded by an {@link Entity} in the 3D view.
   *
   * @type {Boolean}
   */
  get occludable(): boolean;

  /**
   * Gets the RTC center of this Marker.
   *
   * This is automatically calculated from {@link Marker.worldPos}.
   *
   * @type {Number[]}
   */
  get origin(): number[];

  /**
   * Gets the RTC position of this Marker.
   *
   * This is automatically calculated from {@link Marker.worldPos}.
   *
   * @type {Number[]}
   */
  get rtcPos(): number[];

  /**
   * View-space 3D coordinates of this Marker.
   *
   * This property is read-only and is automatically calculated from {@link Marker.worldPos} and the current {@link Camera} position.
   *
   * The Marker fires a "viewPos" event whenever this property changes.
   *
   * @type {Number[]}
   */
  get viewPos(): number[];

  /**
   * Canvas-space 2D coordinates of this Marker.
   *
   * This property is read-only and is automatically calculated from {@link Marker.worldPos} and the current {@link Camera} position and projection.
   *
   * The Marker fires a "canvasPos" event whenever this property changes.
   *
   * @type {Number[]}
   */
  get canvasPos(): number[];

  /**
   * Indicates if this Marker is currently visible.
   *
   * This is read-only and is automatically calculated.
   *
   * The Marker is **invisible** whenever:
   *
   * * {@link Marker.canvasPos} is currently outside the canvas,
   * * {@link Marker.entity} is set to an {@link Entity} that has {@link Entity.visible} ````false````, or
   * * or {@link Marker.occludable} is ````true```` and the Marker is currently occluded by an Entity in the 3D view.
   *
   * The Marker fires a "visible" event whenever this property changes.
   *
   * @type {Boolean}
   */
  get visible(): boolean;

  /**
   * Destroys this Marker.
   */
  destroy(): void;
}
