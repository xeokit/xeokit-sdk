import { Component } from "../Component";
import { Camera } from "./Camera";

/**
 * Defines its {@link Camera}'s perspective projection as a frustum-shaped view volume.
 */
export declare class Frustum extends Component {
  /**
   * The Camera this Frustum belongs to.
   *
   * @property camera
   * @type {Camera}
   * @final
   */
  camera: Camera;

  /**
   * The position of the Frustum's left plane on the View-space X-axis.
   *
   * Fires a {@link Frustum.left:emits} emits on change.
   */
  left: number;

  /**
   * The position of the Frustum's right plane on the View-space X-axis.
   *
   * Fires a {@link Frustum.right:emits} emits on change.
   */
  right: number;

  /**
   * The position of the Frustum's bottom plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.bottom:emits} emits on change.
   *
   * @emits {"bottom"} event with the value of this property whenever it changes.
   */
  bottom: number;

  /**
   * The position of the Frustum's top plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.top:emits} emits on change.
   */
  top: number;

  /**
   * The position of the Frustum's near plane on the positive View-space Z-axis.
   *
   * Fires a {@link Frustum.near:emits} emits on change.
   *
   * Default value is ````0.1````.
   */
  near: number;

  /**
   * The position of the Frustum's far plane on the positive View-space Z-axis.
   *
   * Fires a {@link Frustum.far:emits} emits on change.
   *
   * Default value is ````10000.0````.
   */
  far: number;

  /**
   * The Frustum's projection transform matrix.
   *
   * Fires a {@link Frustum.matrix:emits} emits on change.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   */
  readonly matrix: number[];

  /**
   * The inverse of {@link Frustum.matrix}.
   */
  readonly inverseMatrix: number[];

  /**
   * The transpose of {@link Frustum.matrix}.
   */
  readonly transposedMatrix: number[];

  /**
   * Un-projects the given Canvas-space coordinates, using this Frustum projection.
   *
   * @param {Number[]} canvasPos Inputs 2D Canvas-space coordinates.
   * @param {Number} screenZ Inputs Screen-space Z coordinate.
   * @param {Number[]} screenPos Outputs 3D Screen/Clip-space coordinates.
   * @param {Number[]} viewPos Outputs un-projected 3D View-space coordinates.
   * @param {Number[]} worldPos Outputs un-projected 3D World-space coordinates.
   */
  unproject(canvasPos: number[], screenZ: number, screenPos: number[], viewPos: number[], worldPos: number[]): number[];
}
