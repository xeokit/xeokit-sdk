import { Component } from "../Component";
import { Camera } from "./Camera";

/**
 * @desc Defines its {@link Camera}'s perspective projection using a field-of-view angle.
 */
export declare class Perspective extends Component {
  /**
   * The Camera this Perspective belongs to.
   *
   * @property camera
   * @type {Camera}
   * @final
   */
  camera: Camera;

  /**
   * The Perspective's field-of-view angle (FOV).
   *
   * Fires an "fov" event on change.
   *
   * Default value is ````60.0````.
   */
  fov: number;

  /**
   * The Perspective's FOV axis.
   *
   * Options are ````"x"````, ````"y"```` or ````"min"````, to use the minimum axis.
   *
   * Fires an "fovAxis" event on change.
   *
   * Default value is ````"min"````.
   */
  fovAxis: string;

  /**
   * The position of the Perspective's near plane on the positive View-space Z-axis.
   *
   * Fires a "near" event on change.
   *
   * Default value is ````0.1````.
   */
  near: number;

  /**
   * The position of this Perspective's far plane on the positive View-space Z-axis.
   *
   * Fires a "far" event on change.
   */
  far: number;

  /**
   * The Perspective's projection transform matrix.
   *
   * Fires a "matrix" event on change.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   */
  readonly matrix: number[];

  /**
   * The inverse of {@link Perspective.matrix}.
   */
  readonly inverseMatrix: number[];

  /**
   * The transpose of {@link Perspective.matrix}.
   */
  readonly transposedMatrix: number[];

  /**
   * Un-projects the given Canvas-space coordinates and Screen-space depth, using this Perspective projection.
   *
   * @param {Number[]} canvasPos Inputs 2D Canvas-space coordinates.
   * @param {Number} screenZ Inputs Screen-space Z coordinate.
   * @param {Number[]} screenPos Outputs 3D Screen/Clip-space coordinates.
   * @param {Number[]} viewPos Outputs un-projected 3D View-space coordinates.
   * @param {Number[]} worldPos Outputs un-projected 3D World-space coordinates.
   */
  unproject(canvasPos: number[], screenZ: number, screenPos: number[], viewPos: number[], worldPos: number[]): number[];
}
