import { Component } from "../Component";
import { Camera } from "./Camera";

/**
 * Defines its {@link Camera}'s orthographic projection as a box-shaped view volume.
 */
export declare class Ortho extends Component {
  /**
   * The Camera this Ortho belongs to.
   *
   * @property camera
   * @type {Camera}
   * @final
   */
  camera: Camera;

  /**
   * Scale factor for this Ortho's extents on X and Y axis.
   *
   * Clamps to minimum value of ````0.01````.
   *
   * Fires a "scale" event on change.
   *
   * Default value is ````1.0````
   */
  scale: number;

  /**
   * The position of the Ortho's near plane on the positive View-space Z-axis.
   *
   * Fires a "near" emits on change.
   *
   * Default value is ````0.1````.
   */
  near: number;

  /**
   * The position of the Ortho's far plane on the positive View-space Z-axis.
   *
   * Fires a "far" event on change.
   *
   * Default value is ````2000.0````.
   */
  far: number;

  /**
   * The Ortho's projection transform matrix.
   *
   * Fires a "matrix" event on change.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   */
  readonly matrix: number[];

  /**
   * The inverse of {@link Ortho.matrix}.
   */
  readonly inverseMatrix: number[];

  /**
   * The transpose of {@link Ortho.matrix}.
   */
  readonly transposedMatrix: number[];

  /**
   * Un-projects the given Canvas-space coordinates, using this Ortho projection.
   *
   * @param {Number[]} canvasPos Inputs 2D Canvas-space coordinates.
   * @param {Number} screenZ Inputs Screen-space Z coordinate.
   * @param {Number[]} screenPos Outputs 3D Screen/Clip-space coordinates.
   * @param {Number[]} viewPos Outputs un-projected 3D View-space coordinates.
   * @param {Number[]} worldPos Outputs un-projected 3D World-space coordinates.
   */
  unproject(canvasPos: number[], screenZ: number, screenPos: number[], viewPos: number[], worldPos: number[]): number[];
}