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
   * Sets the Perspective's field-of-view angle (FOV).
   *
   * Fires an "fov" event on change.

    * Default value is ````60.0````.
    *
    * @param {Number} value New field-of-view.
    */
  set fov(arg: number);

  /**
   * Gets the Perspective's field-of-view angle (FOV).
   *
   * Default value is ````60.0````.
   *
   * @returns {Number} Current field-of-view.
   */
  get fov(): number;

  /**
   * Sets the Perspective's FOV axis.
   *
   * Options are ````"x"````, ````"y"```` or ````"min"````, to use the minimum axis.
   *
   * Fires an "fovAxis" event on change.

    * Default value ````"min"````.
    *
    * @param {String} value New FOV axis value.
    */
  set fovAxis(arg: string);

  /**
   * Gets the Perspective's FOV axis.
   *
   * Options are ````"x"````, ````"y"```` or ````"min"````, to use the minimum axis.
   *
   * Fires an "fovAxis" event on change.

    * Default value is ````"min"````.
    *
    * @returns {String} The current FOV axis value.
    */
  get fovAxis(): string;

  /**
   * Sets the position of the Perspective's near plane on the positive View-space Z-axis.
   *
   * Fires a "near" event on change.
   *
   * Default value is ````0.1````.
   *
   * @param {Number} value New Perspective near plane position.
   */
  set near(arg: number);

  /**
   * Gets the position of the Perspective's near plane on the positive View-space Z-axis.
   *
   * Fires an "emits" emits on change.
   *
   * Default value is ````0.1````.
   *
   * @returns The Perspective's near plane position.
   */
  get near(): number;

  /**
   * Sets the position of this Perspective's far plane on the positive View-space Z-axis.
   *
   * Fires a "far" event on change.
   *
   * @param {Number} value New Perspective far plane position.
   */
  set far(arg: number);

  /**
   * Gets the position of this Perspective's far plane on the positive View-space Z-axis.
   *
   * @return {Number} The Perspective's far plane position.
   */
  get far(): number;

  /**
   * Gets the Perspective's projection transform matrix.
   *
   * Fires a "matrix" event on change.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @returns {Number[]} The Perspective's projection matrix.
   */
  get matrix(): number[];

  /**
   * Gets the inverse of {@link Perspective.matrix}.
   *
   * @returns {Number[]} The inverse of {@link Perspective.matrix}.
   */
  get inverseMatrix(): number[];

  /**
   * Gets the transpose of {@link Perspective.matrix}.
   *
   * @returns {Number[]} The transpose of {@link Perspective.matrix}.
   */
  get transposedMatrix(): number[];

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
