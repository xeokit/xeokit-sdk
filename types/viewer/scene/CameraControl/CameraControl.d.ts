import { Component } from "../Component";
import { Entity } from "../Entity";
import { Material } from "../materials";
import { PickResult } from "../webgl/PickResult";

/**
 * Controls the {@link Camera} with user input, and fires events when the user interacts with pickable {@link Entity}s.
 */
export declare class CameraControl extends Component {
  PAN_LEFT: number;
  PAN_RIGHT: number;
  PAN_UP: number;
  PAN_DOWN: number;
  PAN_FORWARDS: number;
  PAN_BACKWARDS: number;
  ROTATE_X_POS: number;
  ROTATE_X_NEG: number;
  ROTATE_Y_POS: number;
  ROTATE_Y_NEG: number;
  DOLLY_FORWARDS: number;
  DOLLY_BACKWARDS: number;
  AXIS_VIEW_RIGHT: number;
  AXIS_VIEW_BACK: number;
  AXIS_VIEW_LEFT: number;
  AXIS_VIEW_FRONT: number;
  AXIS_VIEW_TOP: number;
  AXIS_VIEW_BOTTOM: number;
  MOUSE_PAN: number;
  MOUSE_ROTATE: number;
  MOUSE_DOLLY: number;

  /**
   * Fires when the model is loaded
   * @param event The loaded event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "rightClick", callback: (e: {event: MouseEvent; pagePos: number[]; canvasPos: number[]; }) => void, scope?: any): string

  /**
   * Event fired when the pointer moves while hovering over an Entity.
   * @param event The hover event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "hover", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when the pointer moves while hovering over empty space.
   * @param event The hoverOff event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "hoverOff", callback: (e: {canvasPos: number[]; }) => void, scope?: any): string
  
  /**
   * Event fired when the pointer moves onto an Entity.
   * @param event The hoverEnter event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "hoverEnter", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when the pointer moves off an Entity.
   * @param event The hoverOut event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "hoverOut", callback: (e: {entity: Entity; }) => void, scope?: any): string
  
  /**
   * Event fired when we left-click or tap on an Entity.
   * @param event The picked event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "picked", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when we left-click or tap on the surface of an Entity.
   * @param event The pickedSurface event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "pickedSurface", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when we left-click or tap on empty space.
   * @param event The pickedNothing event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "pickedNothing", callback: (e?: {canvasPos: number[]; }) => void, scope?: any): string
  
  /**
   * Event fired wwhen we left-double-click or double-tap on an Entity.
   * @param event The doublePicked event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "doublePicked", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when we left-double-click or double-tap on the surface of an Entity.
   * @param event The doublePickedSurface event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "doublePickedSurface", callback: (e: PickResult) => void, scope?: any): string
  
  /**
   * Event fired when we left-double-click or double-tap on empty space.
   * @param event The doublePickedNothing event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "doublePickedNothing", callback: (e?: {canvasPos: number[]; }) => void, scope?: any): string
  
  /**
   * The current navigation mode.
   *
   * Accepted values are:
   *
   * * "orbit" - rotation orbits about the current target or pivot point,
   * * "firstPerson" - rotation is about the current eye position,
   * * "planView" - rotation is disabled.
   *
   * See class comments for more info.
   */
  navMode: "orbit" | "firstPerson" | "planView";

  /**
   * Whether to vertically constrain the {@link Camera} position for first-person navigation.
   *
   * When set ````true````, this constrains {@link Camera.eye} to its current vertical position.
   *
   * Only applies when {@link CameraControl.navMode} is ````"firstPerson"````.
   *
   * Default is ````false````.
   */
  constrainVertical: boolean;

  /**
   * Custom mappings of keys to ````CameraControl```` actions.
   *
   * See class docs for usage.
   */
  keyMap: {
    [key: number]: number;
  };

  /**
   * Whether double-picking an {@link Entity} causes the {@link Camera} to fly to its boundary.
   *
   * Default is ````false````.
   */
  doublePickFlyTo: boolean;

  /**
   * Whether either right-clicking (true) or middle-clicking (false) pans the {@link Camera}.
   *
   * Default is ````true````.
   */
  panRightClick: boolean;

  /**
   * Whether this ````CameraControl```` is active or not.
   *
   * When inactive, the ````CameraControl```` will not react to input.
   *
   * Default is ````true````.
   */
  active: boolean;

  /**
   * Whether the pointer snap to vertex.
   */
  snapToVertex: boolean;

  /**
   * Whether the pointer snap to edge.
   */
  snapToEdge: boolean;

  /**
   * The current snap radius for "hoverSnapOrSurface" events, to specify whether the radius
   * within which the pointer snaps to the nearest vertex or the nearest edge.
   *
   * Default value is 30 pixels.
   */
  snapRadius: number;

  /**
   * Whether the keyboard shortcuts are enabled ONLY if the mouse is over the canvas.
   */
  keyboardEnabledOnlyIfMouseover: boolean;

  /**
   * Whether the {@link Camera} follows the mouse/touch pointer.
   *
   * In orbiting mode, the Camera will orbit about the pointer, and will dolly to and from the pointer.
   *
   * In fly-to mode, the Camera will dolly to and from the pointer, however the World will always rotate about the Camera position.
   *
   * In plan-view mode, the Camera will dolly to and from the pointer, however the Camera will not rotate.
   *
   * Default is ````true````.
   *
   * See class comments for more info.
   */
  followPointer: boolean;

  /**
   * A factor in range ````[0..1]```` indicating how much the {@link Camera} keeps moving after you finish rotating it.
   *
   * A value of ````0.0```` causes it to immediately stop, ````0.5```` causes its movement to decay 50% on each tick,
   * while ````1.0```` causes no decay, allowing it continue moving, by the current rate of rotation.
   *
   * You may choose an inertia of zero when you want be able to precisely rotate the Camera,
   * without interference from inertia. Zero inertia can also mean that less frames are rendered while
   * you are rotating the Camera.
   *
   * Default is ````0.0````.
   *
   * Does not apply when {@link CameraControl.navMode} is ````"planView"````, which disallows rotation.
   */
  rotationInertia: number;

  /**
   * How much the {@link Camera} pans each second with keyboard input.
   *
   * Default is ````5.0````, to pan the Camera ````5.0```` World-space units every second that
   * a panning key is depressed. See the ````CameraControl```` class documentation for which keys control
   * panning.
   *
   * Panning direction is aligned to our Camera's orientation. When we pan horizontally, we pan
   * to our left and right, when we pan vertically, we pan upwards and downwards, and when we pan forwards
   * and backwards, we pan along the direction the Camera is pointing.
   *
   * Unlike dollying when {@link followPointer} is ````true````, panning does not follow the pointer.
   */
  keyboardPanRate: number;

  /**
   * How fast the {@link Camera} pans on touch panning
   *
   * Default is ````1.0````.
   */
  touchPanRate: number;

  /**
   * How many degrees per second the {@link Camera} rotates/orbits with keyboard input.
   *
   * Default is ````90.0````, to rotate/orbit the Camera ````90.0```` degrees every second that
   * a rotation key is depressed. See the ````CameraControl```` class documentation for which keys control
   * rotation/orbit.
   */
  keyboardRotationRate: number;

  /**
   * The current drag rotation rate.
   *
   * This configures how many degrees the {@link Camera} rotates/orbits for a full sweep of the canvas by mouse or touch dragging.
   *
   * For example, a value of ````360.0```` indicates that the ````Camera```` rotates/orbits ````360.0```` degrees horizontally
   * when we sweep the entire width of the canvas.
   *
   * ````CameraControl```` makes vertical rotation half as sensitive as horizontal rotation, so that we don't tend to
   * flip upside-down. Therefore, a value of ````360.0```` rotates/orbits the ````Camera```` through ````180.0```` degrees
   * vertically when we sweep the entire height of the canvas.
   *
   * Default is ````360.0````.
   */
  dragRotationRate: number;

  /**
   * How much the {@link Camera} dollys each second with touch input.
   *
   * Default is ````0.2````.
   */
  touchDollyRate: number;

  /**
   * The dolly inertia factor.
   *
   * This factor configures how much the {@link Camera} keeps moving after you finish dollying it.
   *
   * This factor is a value in range ````[0..1]````. A value of ````0.0```` causes dollying to immediately stop,
   * ````0.5```` causes dollying to decay 50% on each animation frame, while ````1.0```` causes no decay, which allows dollying
   * to continue until further input stops it.
   *
   * You might set ````dollyInertia```` to zero when you want be able to precisely position or rotate the Camera,
   * without interference from inertia. This also means that xeokit renders less frames while dollying the Camera,
   * which can improve rendering performance.
   *
   * Default is ````0````.
   */
  dollyInertia: number;

  /**
   * The proximity to the closest object below which dolly speed decreases, and above which dolly speed increases.
   *
   * Default is ````35.0````.
   */
  dollyProximityThreshold: number;

  /**
   * The minimum dolly speed.
   *
   * Default is ````0.04````.
   */
  dollyMinSpeed: number;

  /**
   * The pan inertia factor.
   *
   * This factor configures how much the {@link Camera} keeps moving after you finish panning it.
   *
   * This factor is a value in range ````[0..1]````. A value of ````0.0```` causes panning to immediately stop,
   * ````0.5```` causes panning to decay 50% on each animation frame, while ````1.0```` causes no decay, which allows panning
   * to continue until further input stops it.
   *
   * You might set ````panInertia```` to zero when you want be able to precisely position or rotate the Camera,
   * without interference from inertia. This also means that xeokit renders less frames while panning the Camera,
   * wich can improve rendering performance.
   *
   * Default is ````0.5````.
   */
  panInertia: number;

  /**
   * The keyboard layout.
   *
   * Supported layouts are:
   *
   * * ````"qwerty"```` (default)
   * * ````"azerty"````
   *
   * @deprecated
   */
  keyboardLayout: string;

  /**
   * Sets a sphere as the representation of the pivot position.
   *
   * @param {Object} [cfg] Sphere configuration.
   * @param {String} [cfg.size=1] Optional size factor of the sphere. Defaults to 1.
   * @param {String} [cfg.material=PhongMaterial] Optional size factor of the sphere. Defaults to a red opaque material.
   */
  enablePivotSphere(cfg: {size: number, material: Material}): void;

  /**
   * Remove the sphere as the representation of the pivot position.
   *
   */
  disablePivotSphere(): void;

  /**
   * Whether mouse and touch input is enabled.
   *
   * Default is ````true````.
   *
   * Disabling mouse and touch input on ````CameraControl```` is useful when we want to temporarily use mouse or
   * touch input to interact with some other 3D control, without disturbing the {@link Camera}.
   */
  pointerEnabled: boolean;

  /**
   * Sets the cursor to be used when a particular action is being performed.
   *
   * Accepted actions are:
   * 
   * * "dollyForward" - when the camera is dollying in the forward direction
   * * "dollyBackward" - when the camera is dollying in the backward direction
   * * "pan" - when the camera is being panned
   * * "rotate" - when the camera is being rotated
   *
   * @param {String} action
   * @param {String} style
   */
  setCursorStyle(action: string, style: string): void;

  /**
     * Gets the current style for a particular action.
     *
     * @param {String} action To get the style for
     * @returns {String} style set on the cursor for action
     */
  getCursorStyle(action: string): string | null;

  /**
   * How much the {@link Camera} dollys each second with keyboard input.
   *
   * Default is ````15.0````, to dolly the {@link Camera} ````15.0```` World-space units per second while we hold down
   * the ````+```` and ````-```` keys.
   */
  keyboardDollyRate: number;

  /**
   * How much the {@link Camera} dollys each second while the mouse wheel is spinning.
   *
   * Default is ````100.0````, to dolly the {@link Camera} ````10.0```` World-space units per second as we spin
   * the mouse wheel.
   */
  mouseWheelDollyRate: number;

  /**
   * Returns true if any keys configured for the given action are down.
   * @param action
   * @param keyDownMap
   * @private
   */
  private _isKeyDownForAction;

  /**
   * The HTMl element to represent the pivot point when {@link CameraControl.followPointer} is true.
   *
   * See class comments for an example.
   */
  pivotElement: HTMLElement;

  /**
   * The current World-space 3D pivot position.
   *
   * Only applies when {@link CameraControl.followPointer} is ````true````.
   */
  pivotPos: number[];

  /**
   * @deprecated
   */
  dollyToPointer: boolean;

  /**
   * @deprecated
   */
  panToPointer: boolean;

  /**
   * Whether this ````CameraControl```` is in plan-view mode.
   *
   * When in plan-view mode, rotation is disabled.
   *
   * Default is ````false````.
   *
   * Deprecated - use {@link CameraControl#navMode} instead.
   *
   * @deprecated
   */
  planView: boolean;

  /**
   * Whether this ````CameraControl```` is in first-person mode.
   *
   * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,  {@link Camera.eye} rotates about {@link Camera.look}.
   *
   * Default is ````false````.
   *
   * Deprecated - use {@link CameraControl.navMode} instead.
   *
   * @deprecated
   */
  firstPerson: boolean;

  /**
   * Whether smart default pivoting is enabled.
   *
   * When ````true````, we'll pivot by default about the 3D position of the mouse/touch pointer on an
   * imaginary sphere that's centered at {@link Camera.eye} and sized to the {@link Scene} boundary.
   *
   * When ````false````, we'll pivot by default about {@link Camera.look}.
   *
   * Default is ````false````.
   */
  smartPivot: boolean;

  /**
   * The double click time frame length in milliseconds.
   * 
   * If two mouse click events occur within this time frame, it is considered a double click. 
   * 
   * Default is ````250````
   */
  doubleClickTimeFrame: number;

  /**
   * Whether to zoom the camera on mouse wheel
   *
   * Default is ````true````
   */
  zoomOnMouseWheel: boolean;
}
