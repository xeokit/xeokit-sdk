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
   * Sets the position of the Frustum's left plane on the View-space X-axis.
   *
   * Fires a {@link Frustum.left:emits} emits on change.
   *
   * @param {Number} value New left frustum plane position.
   */
  set left(arg: number);

  /**
   * Gets the position of the Frustum's left plane on the View-space X-axis.
   *
   * @return {Number} Left frustum plane position.
   */
  get left(): number;

  /**
   * Sets the position of the Frustum's right plane on the View-space X-axis.
   *
   * Fires a {@link Frustum.right:emits} emits on change.
   *
   * @param {Number} value New right frustum plane position.
   */
  set right(arg: number);

  /**
   * Gets the position of the Frustum's right plane on the View-space X-axis.
   *
   * Fires a {@link Frustum.right:emits} emits on change.
   *
   * @return {Number} Right frustum plane position.
   */
  get right(): number;

  /**
   * Sets the position of the Frustum's bottom plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.bottom:emits} emits on change.
   *
   * @emits {"bottom"} event with the value of this property whenever it changes.
   *
   * @param {Number} value New bottom frustum plane position.
   */
  set bottom(arg: number);

  /**
   * Gets the position of the Frustum's bottom plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.bottom:emits} emits on change.
   *
   * @return {Number} Bottom frustum plane position.
   */
  get bottom(): number;

  /**
   * Sets the position of the Frustum's top plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.top:emits} emits on change.
   *
   * @param {Number} value New top frustum plane position.
   */
  set top(arg: number);

  /**
   * Gets the position of the Frustum's top plane on the View-space Y-axis.
   *
   * Fires a {@link Frustum.top:emits} emits on change.
   *
   * @return {Number} Top frustum plane position.
   */
  get top(): number;

  /**
   * Sets the position of the Frustum's near plane on the positive View-space Z-axis.
   *
   * Fires a {@link Frustum.near:emits} emits on change.
   *
   * Default value is ````0.1````.
   *
   * @param {Number} value New Frustum near plane position.
   */
  set near(arg: number);

  /**
   * Gets the position of the Frustum's near plane on the positive View-space Z-axis.
   *
   * Fires a {@link Frustum.near:emits} emits on change.
   *
   * Default value is ````0.1````.
   *
   * @return {Number} Near frustum plane position.
   */
  get near(): number;

  /**
   * Sets the position of the Frustum's far plane on the positive View-space Z-axis.
   *
   * Fires a {@link Frustum.far:emits} emits on change.
   *
   * Default value is ````10000.0````.
   *
   * @param {Number} value New far frustum plane position.
   */
  set far(arg: number);

  /**
   * Gets the position of the Frustum's far plane on the positive View-space Z-axis.
   *
   * Default value is ````10000.0````.
   *
   * @return {Number} Far frustum plane position.
   */
  get far(): number;

  /**
   * Gets the Frustum's projection transform matrix.
   *
   * Fires a {@link Frustum.matrix:emits} emits on change.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @returns {Number[]} The Frustum's projection matrix matrix.
   */
  get matrix(): number[];

  /**
   * Gets the inverse of {@link Frustum.matrix}.
   *
   * @returns {Number[]} The inverse orthographic projection matrix.
   */
  get inverseMatrix(): number[];

  /**
   * Gets the transpose of {@link Frustum.matrix}.
   *
   * @returns {Number[]} The transpose of {@link Frustum.matrix}.
   */
  get transposedMatrix(): number[];

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
