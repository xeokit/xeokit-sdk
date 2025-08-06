import { Component } from "../Component";
import { Perspective } from "./Perspective";
import { Ortho } from "./Ortho";
import { Frustum } from "./Frustum";
import { CustomProjection } from "./CustomProjection";

/**
 * Manages viewing and projection transforms for its {@link Scene}.
 */
export declare class Camera extends Component {
  /**
   * An optional matrix to premultiply into {@link Camera.matrix} matrix.
   *
   * This is intended to be used for stereo rendering with WebVR etc.
   */
  deviceMatrix: number[];

  /**
   * The position of the Camera's eye.
   *
   * Default value is ````[0,0,10]````.
   *
   * @emits "eye" event on change, with the value of this property.
   */
  eye: number[];

  /**
   * The position of this Camera's point-of-interest.
   *
   * Default value is ````[0,0,0]````.
   *
   * @emits "look" event on change, with the value of this property.
   */
  look: number[];

  /**
   * The direction of this Camera's {@link Camera.up} vector.
   *
   * @emits "up" event on change, with the value of this property.
   */
  up: number[];

  /**
   * The up, right and forward axis of the World coordinate system.
   *
   * Has format: ````[rightX, rightY, rightZ, upX, upY, upZ, forwardX, forwardY, forwardZ]````
   *
   * Default axis is ````[1, 0, 0, 0, 1, 0, 0, 0, 1]````
   */
  worldAxis: number[];

  /**
   * Whether to lock yaw rotation to pivot about the World-space "up" axis.
   *
   * Fires a {@link Camera.gimbalLock:event} event on change.
   */
  gimbalLock: boolean;

  /**
   * The active projection type.
   *
   * Accepted values are ````"perspective"````, ````"ortho"````, ````"frustum"```` and ````"customProjection"````.
   *
   * Default value is ````"perspective"````.
   */
  projection: "perspective" | "ortho" | "frustum" | "customProjection";

  /**
   * Rotates {@link Camera.eye} about {@link Camera.look}, around the {@link Camera.up} vector
   *
   * @param {Number} angleInc Angle of rotation in degrees
   */
  orbitYaw(angleInc: number): void;

  /**
   * Rotates {@link Camera.eye} about {@link Camera.look} around the right axis (orthogonal to {@link Camera.up} and "look").
   *
   * @param {Number} angleInc Angle of rotation in degrees
   */
  orbitPitch(angleInc: number): void;

  /**
   * Rotates {@link Camera.look} about {@link Camera.eye}, around the {@link Camera.up} vector.
   *
   * @param {Number} angleInc Angle of rotation in degrees
   */
  yaw(angleInc: number): void;

  /**
   * Rotates {@link Camera.look} about {@link Camera.eye}, around the right axis (orthogonal to {@link Camera.up} and "look").
   *
   * @param {Number} angleInc Angle of rotation in degrees
   */
  pitch(angleInc: number): void;

  /**
     * Pans the Camera along its local X, Y and Z axis.
     *
     * @param {Number[]}pan The pan vector
     */
  pan(pan: number[]): void;

  /**
   * Increments/decrements the Camera's zoom factor, which is the distance between {@link Camera.eye} and {@link Camera.look}.
   *
   * @param {Number} delta Zoom factor increment.
   */
  zoom(delta: number): void;

  /**
   * The direction of World-space "up".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[0,1,0]````.
   */
  readonly worldUp: number[];

  /**
   * Whether the World-space X-axis is "up".
   */
  readonly xUp: boolean;

  /**
   * Whether the World-space Y-axis is "up".
   */
  readonly yUp: boolean;

  /**
   * Whether the World-space Z-axis is "up".
   */
  readonly zUp: boolean;

  /**
   * The direction of World-space "right".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[1,0,0]````.
   */
  readonly worldRight: number[];

  /**
   * The direction of World-space "forwards".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[0,0,1]````.
   */
  readonly worldForward: number[];

  /**
   * Whether to prevent camera from being pitched upside down.
   *
   * The camera is upside down when the angle between {@link Camera.up} and {@link Camera.worldUp} is less than one degree.
   *
   * Fires a {@link Camera.constrainPitch:event} event on change.
   *
   * Default value is ````false````.
   */
  constrainPitch: boolean;

  /**
   * Distance from {@link Camera.look} to {@link Camera.eye}.
   */
  readonly eyeLookDist: number;

  /**
   * The Camera's viewing transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   */
  readonly matrix: number[];

  /**
   * The Camera's viewing transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   */
  readonly viewMatrix: number[];

  /**
   * The Camera's viewing normal transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   */
  readonly normalMatrix: number[];

  /**
   * The Camera's viewing normal transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   */
  readonly viewNormalMatrix: number[];

  /**
   * The inverse of the Camera's viewing transform matrix.
   *
   * This has the same value as {@link Camera.normalMatrix}.
   */
  readonly inverseViewMatrix: number[];

  /**
   * The Camera's projection transformation projMatrix.
   *
   * Fires a {@link Camera.projMatrix:event} event on change.
   */
  readonly projMatrix: number[];

  /**
   * The Camera's perspective projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````perspective````.
   */
  readonly perspective: Perspective;

  /**
   * The Camera's orthographic projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````ortho````.
   */
  readonly ortho: Ortho;

  /**
   * The Camera's frustum projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````frustum````.
   */
  readonly frustum: Frustum;

  /**
   * The Camera's custom projection.
   *
   * This is used while {@link Camera.projection} equals "customProjection".
   */
  readonly customProjection: CustomProjection;

  /**
   * The currently active projection for this Camera.
   *
   * The currently active project is selected with {@link Camera.projection}.
   */
  readonly project: Perspective | Ortho | Frustum | CustomProjection;
}
