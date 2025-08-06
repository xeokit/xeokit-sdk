import { Entity } from "../Entity";

/**
 * Pick result returned by {@link Scene.pick}.
 */
export declare class PickResult {
  /**
   * Picked entity.
   * Null when no entity was picked.
   * @type {Entity|*}
   */
  entity: Entity | null;

  /**
   * Type of primitive that was picked - usually "triangle".
   * Null when no primitive was picked.
   * @type {String}
   */
  primitive: string;

  /**
   * Index of primitive that was picked.
   * -1 when no entity was picked.
   * @type {number}
   */
  primIndex: number;

  /**
   * True when the picked surface position is full precision.
   * When false, the picked surface position should be regarded as approximate.
   * Full-precision surface picking is performed with the {@link Scene.pick} method's ````pickSurfacePrecision```` option.
   * @type {Boolean}
   */
  pickSurfacePrecision: boolean;

  /**
   * True when picked from touch input, else false when from mouse input.
   * @type {boolean}
   */
  touchInput: boolean;

  /**
   * Canvas coordinates when picking with a 2D pointer.
   */
  readonly canvasPos: number[];

  /**
   * World-space 3D ray origin when raypicked.
   */
  readonly origin: number[];

  /**
   * World-space 3D ray direction when raypicked.
   */
  readonly direction: number[];

  /**
   * Picked triangle's vertex indices.
   * Only defined when an entity and triangle was picked.
   */
  readonly indices: Int32Array;

  /**
   * Picked Local-space point on surface.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly localPos: number[];

  /**
   * Canvas cursor coordinates, snapped when snap picking, otherwise same as {@link PickResult#pointerPos}.
   */
  readonly snappedCanvasPos: number[];

  /**
   * Picked World-space point on surface.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly worldPos: number[];

  /**
   * Picked View-space point on surface.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly viewPos: number[];

  /**
   * Barycentric coordinate within picked triangle.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly bary: number[];

  /**
   * Normal vector at picked position on surface.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly worldNormal: number[];

  /**
   * UV coordinates at picked position on surface.
   * Only defined when an entity and a point on its surface was picked.
   */
  readonly uv: number[];

  /**
   * True if snapped to edge or vertex.
   */
  readonly snapped: boolean;

  /**
   * True when snapped to the nearest vertex position.
   */
  snappedToVertex: boolean;

  /**
   * True when snapped to the nearest edge.
   * @type {boolean}
   */
  snappedToEdge: boolean;
}
