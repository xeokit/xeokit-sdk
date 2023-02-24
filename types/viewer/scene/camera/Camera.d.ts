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
   * Sets an optional matrix to premultiply into {@link Camera.matrix} matrix.
   *
   * This is intended to be used for stereo rendering with WebVR etc.
   *
   * @param {Number[]} matrix The matrix.
   */
  set deviceMatrix(arg: number[]);

  /**
   * Gets an optional matrix to premultiply into {@link Camera.matrix} matrix.
   *
   * @returns {Number[]} The matrix.
   */
  get deviceMatrix(): number[];

  /**
   * Sets the position of the Camera's eye.
   *
   * Default value is ````[0,0,10]````.
   *
   * @emits "eye" event on change, with the value of this property.
   * @type {Number[]} New eye position.
   */
  set eye(arg: number[]);

  /**
   * Gets the position of the Camera's eye.
   *
   * Default vale is ````[0,0,10]````.
   *
   * @type {Number[]} New eye position.
   */
  get eye(): number[];

  /**
   * Sets the position of this Camera's point-of-interest.
   *
   * Default value is ````[0,0,0]````.
   *
   * @emits "look" event on change, with the value of this property.
   *
   * @param {Number[]} look Camera look position.
   */
  set look(arg: number[]);

  /**
   * Gets the position of this Camera's point-of-interest.
   *
   * Default value is ````[0,0,0]````.
   *
   * @returns {Number[]} Camera look position.
   */
  get look(): number[];

  /**
   * Sets the direction of this Camera's {@link Camera.up} vector.
   *
   * @emits "up" event on change, with the value of this property.
   *
   * @param {Number[]} up Direction of "up".
   */
  set up(arg: number[]);

  /**
   * Gets the direction of this Camera's {@link Camera.up} vector.
   *
   * @returns {Number[]} Direction of "up".
   */
  get up(): number[];

  /**
   * Sets the up, right and forward axis of the World coordinate system.
   *
   * Has format: ````[rightX, rightY, rightZ, upX, upY, upZ, forwardX, forwardY, forwardZ]````
   *
   * Default axis is ````[1, 0, 0, 0, 1, 0, 0, 0, 1]````
   *
   * @param {Number[]} axis The new Wworld coordinate axis.
   */
  set worldAxis(arg: number[]);

  /**
   * Gets the up, right and forward axis of the World coordinate system.
   *
   * Has format: ````[rightX, rightY, rightZ, upX, upY, upZ, forwardX, forwardY, forwardZ]````
   *
   * Default axis is ````[1, 0, 0, 0, 1, 0, 0, 0, 1]````
   *
   * @returns {Number[]} The current World coordinate axis.
   */
  get worldAxis(): number[];

  /**
   * Sets whether to lock yaw rotation to pivot about the World-space "up" axis.
   *
   * Fires a {@link Camera.gimbalLock:event} event on change.
   *
   * @params {Boolean} gimbalLock Set true to lock gimbal.
   */
  set gimbalLock(arg: boolean);

  /**
   * Gets whether to lock yaw rotation to pivot about the World-space "up" axis.
   *
   * @returns {Boolean} Returns ````true```` if gimbal is locked.
   */
  get gimbalLock(): boolean;

  /**
   * Sets the active projection type.
   *
   * Accepted values are ````"perspective"````, ````"ortho"````, ````"frustum"```` and ````"customProjection"````.
   *
   * Default value is ````"perspective"````.
   *
   * @param {String} value Identifies the active projection type.
   */
  set projection(arg: "perspective" | "ortho" | "frustum" | "customProjection");

  /**
   * Gets the active projection type.
   *
   * Possible values are ````"perspective"````, ````"ortho"````, ````"frustum"```` and ````"customProjection"````.
   *
   * Default value is ````"perspective"````.
   *
   * @returns {String} Identifies the active projection type.
   */
  get projection(): "perspective" | "ortho" | "frustum" | "customProjection";

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
   * Gets the direction of World-space "up".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[0,1,0]````.
   *
   * @returns {Number[]} The "up" vector.
   */
  get worldUp(): number[];

  /**
   * Gets if the World-space X-axis is "up".
   * @returns {Boolean}
   */
  get xUp(): boolean;

  /**
   * Gets if the World-space Y-axis is "up".
   * @returns {Boolean}
   */
  get yUp(): boolean;

  /**
   * Gets if the World-space Z-axis is "up".
   * @returns {Boolean}
   */
  get zUp(): boolean;

  /**
   * Gets the direction of World-space "right".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[1,0,0]````.
   *
   * @returns {Number[]} The "up" vector.
   */
  get worldRight(): number[];

  /**
   * Gets the direction of World-space "forwards".
   *
   * This is set by {@link Camera.worldAxis}.
   *
   * Default value is ````[0,0,1]````.
   *
   * @returns {Number[]} The "up" vector.
   */
  get worldForward(): number[];

  /**
   * Gets whether to prevent camera from being pitched upside down.
   *
   * The camera is upside down when the angle between {@link Camera.up} and {@link Camera.worldUp} is less than one degree.
   *
   * Default value is ````false````.
   *
   * @returns {Boolean} ````true```` if pitch rotation is currently constrained.
   */
  get constrainPitch(): boolean;

  /**
   * Sets whether to prevent camera from being pitched upside down.
   *
   * The camera is upside down when the angle between {@link Camera.up} and {@link Camera.worldUp} is less than one degree.
   *
   * Fires a {@link Camera.constrainPitch:event} event on change.
   *
   * Default value is ````false````.
   *
   * @param {Boolean} value Set ````true```` to contrain pitch rotation.
   */
  set constrainPitch(arg: boolean);

  /**
   * Gets distance from {@link Camera.look} to {@link Camera.eye}.
   *
   * @returns {Number} The distance.
   */
  get eyeLookDist(): boolean;

  /**
   * Gets the Camera's viewing transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   *
   * @returns {Number[]} The viewing transform matrix.
   */
  get matrix(): number[];

  /**
   * Gets the Camera's viewing transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   *
   * @returns {Number[]} The viewing transform matrix.
   */
  get viewMatrix(): number[];

  /**
   * The Camera's viewing normal transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   *
   * @returns {Number[]} The viewing normal transform matrix.
   */
  get normalMatrix(): number[];

  /**
   * The Camera's viewing normal transformation matrix.
   *
   * Fires a {@link Camera.matrix:event} event on change.
   *
   * @returns {Number[]} The viewing normal transform matrix.
   */
  get viewNormalMatrix(): number[];

  /**
   * Gets the inverse of the Camera's viewing transform matrix.
   *
   * This has the same value as {@link Camera.normalMatrix}.
   *
   * @returns {Number[]} The inverse viewing transform matrix.
   */
  get inverseViewMatrix(): number[];

  /**
   * Gets the Camera's projection transformation projMatrix.
   *
   * Fires a {@link Camera.projMatrix:event} event on change.
   *
   * @returns {Number[]} The projection matrix.
   */
  get projMatrix(): number[];

  /**
   * Gets the Camera's perspective projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````perspective````.
   *
   * @returns {Perspective} The Perspective component.
   */
  get perspective(): Perspective;

  /**
   * Gets the Camera's orthographic projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````ortho````.
   *
   * @returns {Ortho} The Ortho component.
   */
  get ortho(): Ortho;

  /**
   * Gets the Camera's frustum projection.
   *
   * The Camera uses this while {@link Camera.projection} equals ````frustum````.
   *
   * @returns {Frustum} The Ortho component.
   */
  get frustum(): Frustum;

  /**
   * Gets the Camera's custom projection.
   *
   * This is used while {@link Camera.projection} equals "customProjection".
   *
   * @returns {CustomProjection} The custom projection.
   */
  get customProjection(): CustomProjection;

  /**
   * Gets the currently active projection for this Camera.
   *
   * The currently active project is selected with {@link Camera.projection}.
   *
   * @returns {Perspective|Ortho|Frustum|CustomProjection} The currently active projection is active.
   */
  get project(): Perspective | Ortho | Frustum | CustomProjection;
}
