import { Component } from "../Component";
import { Camera } from "./Camera";

/**
 * Defines a custom projection for a {@link Camera} as a custom 4x4 matrix..
 */
export declare class CustomProjection extends Component {
  /**
   * The Camera this CustomProjection belongs to.
   */
  camera: Camera;

  /**
   * Sets the CustomProjection's projection transform matrix.
   *
   * Fires a "matrix" event on change.

    * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
    *
    * @param {Number[]} matrix New value for the CustomProjection's matrix.
    */
  set matrix(arg: number[]);

  /**
   * Gets the CustomProjection's projection transform matrix.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @return {Number[]} New value for the CustomProjection's matrix.
   */
  get matrix(): number[];

  /**
   * Gets the inverse of {@link CustomProjection.matrix}.
   *
   * @returns {Number[]} The inverse of {@link CustomProjection.matrix}.
   */
  get inverseMatrix(): number[];

  /**
   * Gets the transpose of {@link CustomProjection.matrix}.
   *
   * @returns {Number[]} The transpose of {@link CustomProjection.matrix}.
   */
  get transposedMatrix(): number[];

  /**
   * Un-projects the given Canvas-space coordinates, using this CustomProjection.
   *
   * @param {Number[]} canvasPos Inputs 2D Canvas-space coordinates.
   * @param {Number} screenZ Inputs Screen-space Z coordinate.
   * @param {Number[]} screenPos Outputs 3D Screen/Clip-space coordinates.
   * @param {Number[]} viewPos Outputs un-projected 3D View-space coordinates.
   * @param {Number[]} worldPos Outputs un-projected 3D World-space coordinates.
   */
  unproject(canvasPos: number[], screenZ: number, screenPos: number[], viewPos: number[], worldPos: number[]): number[];
}
