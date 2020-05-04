import {math} from '../math/math.js';
import {Component} from '../Component.js';

import {CameraFlightAnimation} from './../camera/CameraFlightAnimation.js';
import {PanController} from "./lib/controllers/PanController.js";
import {PivotController} from "./lib/controllers/PivotController.js";
import {PickController} from "./lib/controllers/PickController.js";
import {MousePanRotateDollyHandler} from "./lib/handlers/MousePanRotateDollyHandler.js";
import {KeyboardAxisViewHandler} from "./lib/handlers/KeyboardAxisViewHandler.js";
import {MousePickHandler} from "./lib/handlers/MousePickHandler.js";
import {KeyboardPanRotateDollyHandler} from "./lib/handlers/KeyboardPanRotateDollyHandler.js";
import {CameraUpdater} from "./lib/CameraUpdater.js";
import {MouseMiscHandler} from "./lib/handlers/MouseMiscHandler.js";
import {TouchPanRotateAndDollyHandler} from "./lib/handlers/TouchPanRotateAndDollyHandler.js";
import {TouchPickHandler} from "./lib/handlers/TouchPickHandler.js";

/**
 * @desc Controls the {@link Camera} with keyboard, mouse and touch input.
 *
 * # Overview
 *
 * CameraControl is located at {@link Viewer#cameraControl}.
 *
 * CameraControl supports three navigation modes:
 *
 * * **Orbit mode** orbits the {@link Camera} position about the point-of-interest. We also have the option to orbit an
 * arbitrary, pickable pivot position. Dollying in orbit mode can either vary the distance between the eye
 * and the point-of-interest, or move the eye and point-of-interest towards or away from the pivot position.
 *
 * * **First-person mode** orbits the point-of-interest about the eye position. Dollying can either move the eye and
 * point-of-interest forwards or backwards, or towards and away from the mouse pointer. There is no option
 * to pivot in first-person mode.
 *
 * * **Plan-view mode** is typically used when the Camera is axis-aligned, and often when using orthographic projection. In this
 * mode, we are unable to rotate and pivot the Camera, which keeps the Camera in correct axis alignment for our plan view.
 *
 * # Orbit Mode
 *
 * In orbit mode, we are rotating about a point-of-interest.
 *
 * To enable orbit navigation mode:
 *
 * ````javascript
 * cameraControl.navMode = "orbit"; // Default
 * ````
 *
 * We can then orbit by:
 *
 * * left-dragging the mouse,
 * * tap-dragging the touch pad,
 * * pressing arrow keys, or 'Q' and 'E' on a QWERTY keyboard, or 'A' and 'E' on an AZERTY keyboard.
 *
 * <br>
 * We can dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the '+' and '-' keys, or 'W' and 'S' on a QWERTY keyboard, or 'Z' and 'S' for AZERTY.
 *
 * <br>
 * We can pan horizontally and vertically by:
 *
 * * right-dragging the mouse,
 * * left-dragging the mouse with the SHIFT key down,
 * * tap-dragging the touch pad with SHIFT down,
 * * pressing the 'A', 'D', 'Z' and 'X' keys on a QWERTY keyboard, and
 * * pressing the 'Q', 'D', 'W' and 'X' keys on an AZERTY keyboard,
 *
 * ## Pivoting in Orbit Mode
 *
 * In orbit mode, setting {@link CameraControl#pivoting} ````true```` will cause CameraControl to always pivot
 * our eye position and point-of-interest about the current pivot position, and dolly our eye position and
 * point-of-interest towards and away from the pivot position.
 *
 * We can set the current pivot position by left-clicking, or tapping, on the surface of an object.
 *
 * Lets ensure that we're in orbit mode, then enable pivoting:
 *
 * ````javascript
 * cameraControl.navMode = "orbit";
 * cameraControl.pivoting = true;
 * ````
 *
 * If we now left-click or tap an object, we'll pivot about that position. If we then left-click-drag or tap-drag
 * empty space, we'll continue to pivot the position we set earlier.
 *
 * ````javascript
 * cameraControl.dollyToPivot = true;
 * ````
 *
 * ## Showing the Pivot Position
 *
 * We can configure {@link CameraControl#pivotElement} with an HTML element to indicate the current
 * pivot position. The indicator will appear momentarily each time we move the Camera while in orbit mode with
 * pivoting enabled.
 *
 * First we'll define some CSS to style our pivot indicator as a black dot with a white border:
 *
 * ````css
 * .camera-pivot-marker {
 *      color: #ffffff;
 *      position: absolute;
 *      width: 25px;
 *      height: 25px;
 *      border-radius: 15px;
 *      border: 2px solid #ebebeb;
 *      background: black;
 *      visibility: hidden;
 *      box-shadow: 5px 5px 15px 1px #000000;
 *      z-index: 10000;
 *      pointer-events: none;
 * }
 * ````
 *
 * Then we'll attach our pivot indicator's HTML element to the CameraControl:
 *
 * ````javascript
 * const pivotElement = document.createRange().createContextualFragment("<div class='camera-pivot-marker'></div>").firstChild;
 *
 * document.body.appendChild(pivotElement);
 *
 * cameraControl.pivotElement = pivotElement;
 * ````
 * ## Axis-Aligned Views in Orbit Mode
 *
 * In orbit mode, we can use keys 1-6 to position the {@link Camera} to look at the center of the {@link Scene} from along each of the
 * six World-space axis. Pressing one of these keys will fly the Camera to the corresponding axis-aligned view.
 *
 * ## Focusing on Objects in Orbit Mode
 *
 * In orbit mode and {@link CameraControl#doublePickFlyTo} is ````true````, we can double-click or
 * double-tap (ie. "double-pick") an {@link Entity} to fit it to view. This will cause the {@link Camera}
 * to fly to that Entity. Our point-of-interest then becomes the center of that Entity. If we are currently pivoting,
 * then our pivot position is then also set to the Entity center.
 *
 * Disable that behaviour by setting {@link CameraControl#doublePickFlyTo} ````false````.
 *
 * # First-Person Mode
 *
 * First-person model allows us to roam freely around our {@link Scene}.
 *
 * To enable first-person navigation mode:
 *
 * ````javascript
 * cameraControl.navMode = "firstPerson";
 * ````
 *
 * We can then rotate our point-of-interest about our eye position by:
 *
 * * left-dragging the mouse,
 * * tap-dragging the touch pad,
 * * pressing arrow keys, or 'Q' and 'E' on a QWERTY keyboard, or 'A' and 'E' on an AZERTY keyboard.
 *
 * <br>
 * We can dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the '+' and '-' keys, or 'W' and 'S' on a QWERTY keyboard, or 'Z' and 'S' for AZERTY.
 *
 * <br>
 * We can pan horizontally and vertically by:
 *
 * * right-dragging the mouse,
 * * left-dragging the mouse with the SHIFT key down,
 * * tap-dragging the touch pad with SHIFT down,
 * * pressing the 'A', 'D', 'Z' and 'X' keys on a QWERTY keyboard, and
 * * pressing the 'Q', 'D', 'W' and 'X' keys on an AZERTY keyboard,
 *
 * ## Dollying to the Mouse Pointer in First-Person Mode
 *
 * To cause dollying to move our eye position and point-of-interest towards and away from the current mouse position:
 *
 * ````javascript
 * cameraControl.dollyToPointer = true;
 * ````
 *
 * ## Constraining Vertical Position in First-Person Mode
 *
 * To prevent the Camera from changing it's vertical position in first-person mode, which is useful for walk-through
 * navigation:
 *
 * ````javascript
 * cameraControl.constrainVertical = true;
 * ````
 *
 * ## Axis-Aligned Views in First-Person Mode
 *
 * As in orbit mode, in first-person mode we can use keys 1-6 to position the {@link Camera} to look at the center of
 * the {@link Scene} from along each of the six World-space axis. Pressing one of these keys will fly the Camera to the
 * corresponding axis-aligned view.
 *
 * If we are currently pivoting, then our pivot position is then set to the Scene center.
 *
 * ## Focusing on Objects in First-Person Mode
 *
 * As in orbit mode, when in first-person mode and {@link CameraControl#doublePickFlyTo} is ````true````, we can double-click
 * or double-tap an {@link Entity} (ie. "double-picking") to fit it in view. This will cause the {@link Camera} to fly to
 * that Entity. Our point-of-interest then becomes the center of that Entity.
 *
 * Disable that behaviour by setting {@link CameraControl#doublePickFlyTo} ````false````.
 *
 * # Plan-View Mode
 *
 * Plan view navigation mode is typically used when the Camera is axis-aligned and using orthographic projection. In this
 * mode, we are unable to rotate and pivot the Camera, which keeps the Camera in correct axis alignment for our plan view.
 *
 * To enable plan-view navigation mode:
 *
 * ````javascript
 * cameraControl.navMode = "planView";
 * ````
 * In plan-view mode, we cannot orbit, rotate or pivot the camera.
 *
 * We can dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the '+' and '-' keys, or 'W' and 'S' on a QWERTY keyboard, or 'Z' and 'S' for AZERTY.
 *
 * <br>
 * We can pan horizontally and vertically by:
 *
 * * left-dragging or right-dragging the mouse,
 * * tap-dragging the touch pad with SHIFT down,
 * * pressing the 'A', 'D', 'Z' and 'X' keys on a QWERTY keyboard, and
 * * pressing the 'Q', 'D', 'W' and 'X' keys on an AZERTY keyboard,
 *
 * ## Dollying to the Mouse Pointer in Plan-View Mode
 *
 * As in orbit and first-person modes, we can cause dollying to move our eye position and point-of-interest towards
 * and away from the current mouse position:
 *
 * ````javascript
 * cameraControl.dollyToPointer = true;
 * ````
 *
 * ## Axis-Aligned Views in Plan-View Mode
 *
 * As in orbit and first-person modes, in plan-view mode we can use keys 1-6 to position the {@link Camera} to look at the center of
 * the {@link Scene} from along each of the six World-space axis. Pressing one of these keys will fly the Camera to the
 * corresponding axis-aligned view.
 *
 * # Picking
 *
 *
 *
 * @emits "hover" - pointer hovers over a new object
 * @emits "hoverSurface" - Hover continues over an object surface - fired continuously as mouse moves over an object
 * @emits "hoverOut"  - Hover has left the last object we were hovering over
 * @emits "hoverOff" - Hover continues over empty space - fired continuously as mouse moves over nothing
 * @emits "picked" - Clicked or tapped object
 * @emits "pickedSurface" -  Clicked or tapped object, with event containing surface intersection details
 * @emits "doublePicked" - Double-clicked or double-tapped object
 * @emits "doublePickedSurface" - Double-clicked or double-tapped object, with event containing surface intersection details
 * @emits "pickedNothing" - Clicked or tapped, but not on any objects
 * @emits "doublePickedNothing" - Double-clicked or double-tapped, but not on any objects
 * @emits "rightClick" - Right-click
 */
class CameraControl extends Component {

    /**
     * @private
     * @constructor
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this.scene.canvas.canvas.oncontextmenu = (e) => {
            e.preventDefault();
        };

        // User-settable CameraControl configurations

        this._configs = {

            active: true,

            tapInterval: 150, // Millisecs
            doubleTapInterval: 325, // Millisecs
            tapDistanceThreshold: 4, // Pixels

            mousePanRate: 1.0,
            keyboardPanRate: 1.0,
            keyboardOrbitRate: 1.0,

            touchRotateRate: 0.3,
            touchPanRate: 0.2,
            touchZoomRate: 0.2,

            dollyRate: 10,

            navMode: "orbit",
            planView: false,
            firstPerson: false,
            constrainVertical: false,

            doublePickFlyTo: true,
            panRightClick: true,

            pivoting: false,
            dollyToPointer: false,

            rotationInertia: 0,
            dollyInertia: 0,

            pointerEnabled: true,

            keyboardLayout: "qwerty"
        };

        // Current runtime state of the CameraControl

        this._states = {
            mouseCanvasPos: new Float32Array(2),
            mouseover: false,
            inputFromMouse: false, // TODO: Is this needed?
            mouseDownClientX: 0,
            mouseDownClientY: 0,
            mouseDownCursorX: 0,
            mouseDownCursorY: 0,
            touchStartTime: null,
            activeTouches: [],
            tapStartPos: new Float32Array(2),
            tapStartTime: -1,
            lastTapTime: -1,
        };

        // Updates for CameraUpdater to process on next Scene "tick" event

        this._updates = {
            rotateDeltaX: 0,
            rotateDeltaY: 0,
            panDeltaX: 0,
            panDeltaY: 0,
            panDeltaZ: 0,
            dollyDelta: 0
        };

        // Controllers to assist input event handlers with controlling the Camera

        const scene = this.scene;

        this._controllers = {
            cameraControl: this,
            pickController: new PickController(this, this._configs),
            pivotController: new PivotController(scene),
            panController: new PanController(this.scene),
            cameraFlight: new CameraFlightAnimation(this, {
                duration: 0.5
            })
        };

        // Input event handlers

        this._handlers = [
            new MouseMiscHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new TouchPanRotateAndDollyHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new MousePanRotateDollyHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new KeyboardAxisViewHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new MousePickHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new TouchPickHandler(this.scene, this._controllers, this._configs, this._states, this._updates),
            new KeyboardPanRotateDollyHandler(this.scene, this._controllers, this._configs, this._states, this._updates)
        ];

        // Applies scheduled updates to the Camera on each Scene "tick" event

        this._cameraUpdater = new CameraUpdater(this.scene, this._controllers, this._configs, this._states, this._updates);

        // Set initial user configurations

        this.planView = cfg.planView;
        this.navMode = cfg.navMode;
        this.constrainVertical = cfg.constrainVertical;
        this.keyboardLayout = cfg.keyboardLayout;
        this.doublePickFlyTo = cfg.doublePickFlyTo;
        this.panRightClick = cfg.panRightClick;
        this.active = cfg.active;
        this.pivoting = cfg.pivoting;
        this.dollyToPointer = cfg.dollyToPointer;
        this.rotationInertia = cfg.rotationInertia;
        this.dollyInertia = cfg.dollyInertia;
        this.pointerEnabled = true;
        this.dollyRate = cfg.dollyRate;
    }

    /**
     * Sets the HTMl element to represent the pivot point when {@link CameraControl#pivoting} is true.
     * @param {HTMLElement} element HTML element representing the pivot point.
     */
    set pivotElement(element) {
        this._controllers.pivotController.setPivotElement(element);
    }

    /**
     *  Sets if this CameraControl is active or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} value Set ````true```` to activate this CameraControl.
     */
    set active(value) {
        this._configs.active = value !== false;
    }

    /**
     * Gets if this CameraControl is active or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if this CameraControl is active.
     */
    get active() {
        return this._configs.active;
    }

    /**
     * Sets the current navigation mode.
     *
     * Accepted values are:
     *
     * * "orbit" - rotation orbits about the current point-of-interest or pivot point,
     * * "firstPerson" - rotation is about the current eye position,
     * * "planView" - rotation is disabled.
     *
     * @param {String} navMode The navigation mode: "orbit", "firstPerson" or "planView".
     */
    set navMode(navMode) {
        navMode = navMode || "orbit";
        if (navMode !== "firstPerson" && navMode !== "orbit"  && navMode !== "planView") {
            this.error("Unsupported value for navMode: " + navMode + " - supported values are 'orbit', 'firstPerson' and 'planView' - defaulting to 'orbit'");
            navMode = "orbit";
        }
        this._configs.firstPerson = (navMode === "firstPerson");
        this._configs.planView = (navMode === "planView");
        if (this._configs.firstPerson || this._configs.planView) {
            this._controllers.pivotController.hidePivot();
            this._controllers.pivotController.endPivot();
        }
        this._configs.navMode = navMode;
    }

    /**
     * Gets the current navigation mode.
     *
     * @returns {String} The navigation mode: "orbit" or "firstPerson".
     */
    get navMode() {
        return this._configs.navMode;
    }

    /**
     * Sets whether canvas pointer events are enabled.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} value Set ````true```` to enable drag events.
     */
    set pointerEnabled(value) {
        this._reset();
        this._configs.pointerEnabled = !!value;
    }

    _reset() {
        for (let i = 0, len = this._handlers.length; i < len; i++) {
            const handler = this._handlers[i];
            if (handler.reset) {
                handler.reset();
            }
        }

        this._updates.panDeltaX = 0;
        this._updates.panDeltaY = 0;
        this._updates.rotateDeltaX = 0;
        this._updates.rotateDeltaY = 0;
        this._updates.dolyDelta = 0;
    }

    /**
     * Gets whether canvas pointer events are enabled.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` to enable drag events.
     */
    get pointerEnabled() {
        return this._configs.pointerEnabled;
    }

    /**
     * Sets whether dragging will pivot the {@link Camera} about the current 3D pivot point.
     *
     * The pivot point is indicated by {@link CameraControl#pivotPos}.
     *
     * When in pivoting mode, clicking on an {@link Entity} will set {@link CameraControl#pivotPos} to the clicked position on the surface of the Entity.
     *
     * You can configure an HTML element to show the pivot position via {@link CameraControl#pivotElement}.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable pivoting.
     */
    set pivoting(value) {
        this._configs.pivoting = !!value;
    }

    /**
     * Sets whether dragging will pivot the {@link Camera} about the current 3D pivot point.
     *
     * The pivot point is indicated by {@link CameraControl#pivotPos}.
     *
     * When in pivoting mode, clicking on an {@link Entity} will set {@link CameraControl#pivotPos} to the clicked position on the surface of the Entity.
     *
     * You can configure an HTML element to show the pivot position via {@link CameraControl#pivotElement}.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` to enable pivoting.
     */
    get pivoting() {
        return this._configs.pivoting;
    }

    /**
     * Sets the current World-space 3D pivot position.
     *
     * @param {Number[]} worldPos The new World-space 3D pivot position.
     */
    set pivotPos(worldPos) {
        this._controllers.pivotController.setPivotPos(worldPos);
    }

    /**
     * Gets the current World-space 3D pivot position.
     *
     * @return {Number[]} worldPos The current World-space 3D pivot position.
     */
    get pivotPos() {
        return this._controllers.pivotController.getPivotPos();
    }

    /**
     * Sets whether scrolling the mouse wheel, when the mouse is over an {@link Entity}, will zoom the {@link Camera} towards the hovered point on the Entity's surface.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable pan-to-pointer behaviour.
     */
    set dollyToPointer(value) {
        this._configs.dollyToPointer = !!value;
    }

    /**
     * Gets whether scrolling the mouse wheel, when the mouse is over an {@link Entity}, will zoom the {@link Camera} towards the hovered point on the Entity's surface.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if pan-to-pointer behaviour is enabled.
     */
    get dollyToPointer() {
        return this._configs.dollyToPointer;
    }

    /**
     * Sets whether this CameraControl is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default value is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @param {Boolean} value Set ````true```` to enable plan-view mode.
     * @deprecated
     */
    set planView(value) {
        this._configs.planView = !!value;
        this._configs.firstPerson = false;
        if (this._configs.planView) {
            this._controllers.pivotController.hidePivot();
            this._controllers.pivotController.endPivot();
        }
    }

    /**
     * Gets whether this CameraControl is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default value is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @returns {Boolean} Returns ````true```` if plan-view mode is enabled.
     * @deprecated
     */
    get planView() {
        return this._configs.planView;
    }

    /**
     * Sets whether this CameraControl is in first-person mode.
     *
     * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,  {@link Camera#eye} rotates about {@link Camera#look}.
     *
     * Default value is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @param {Boolean} value Set ````true```` to enable first-person mode.
     * @deprecated
     */
    set firstPerson(value) {
        this._configs.firstPerson = !!value;
        this._configs.planView = false;
        if (this._configs.firstPerson) {
            this._controllers.pivotController.hidePivot();
            this._controllers.pivotController.endPivot();
        }
    }

    /**
     * Gets whether this CameraControl is in first-person mode.
     *
     * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,  {@link Camera#eye} rotates about {@link Camera#look}.
     *
     * Default value is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @returns {Boolean} Returns ````true```` if first-person mode is enabled.
     * @deprecated
     */
    get firstPerson() {
        return this._configs.firstPerson;
    }

    /**
     * Sets whether this CameraControl is in constrainVertical mode.
     *
     * When set ````true````, this constrains {@link Camera#eye} movement to the horizontal X-Z plane. When doing a walkthrough,
     * this is useful to allow us to look upwards or downwards as we move, while keeping us moving in the  horizontal plane.
     *
     * This only has an effect when {@link CameraControl#firstPerson} is ````true````.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable constrainVertical mode.
     */
    set constrainVertical(value) {
        this._configs.constrainVertical = !!value;
    }

    /**
     * Gets whether this CameraControl is in constrainVertical mode.
     *
     * When set ````true````, this constrains {@link Camera#eye} movement to the horizontal X-Z plane. When doing a walkthrough,
     * this is useful to allow us to look upwards or downwards as we move, while keeping us moving in the  horizontal plane.
     *
     * This only has an effect when {@link CameraControl#firstPerson} is ````true````.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` when in constrainVertical mode.
     */
    get constrainVertical() {
        return this._configs.constrainVertical;
    }

    /**
     * Sets whether double-picking an {@link Entity} causes the {@link Camera} to fly to its boundary.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable double-pick-fly-to mode.
     */
    set doublePickFlyTo(value) {
        this._configs.doublePickFlyTo = value !== false;
    }

    /**
     * Gets whether double-picking an {@link Entity} causes the {@link Camera} to fly to its boundary.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` when double-pick-fly-to mode is enabled.
     */
    get doublePickFlyTo() {
        return this._configs.doublePickFlyTo;
    }

    /**
     * Sets whether either right-clicking (true) or middle-clicking (false) pans the {@link Camera}.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} value Set ````false```` to disable pan on right-click.
     */
    set panRightClick(value) {
        this._configs.panRightClick = value !== false;
    }

    /**
     * Gets whether right-clicking pans the {@link Camera}.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````false```` when pan on right-click is disabled.
     */
    get panRightClick() {
        return this._configs.panRightClick;
    }

    /**
     * Sets a factor in range ````[0..1]```` indicating how much the camera keeps moving after you finish rotating it.
     *
     * A value of ````0.0```` causes it to immediately stop, ````0.5```` causes its movement to decay 50% on each tick,
     * while ````1.0```` causes no decay, allowing it continue moving, by the current rate of rotation.
     *
     * You may choose an inertia of zero when you want be able to precisely rotate the camera,
     * without interference from inertia. Zero inertia can also mean that less frames are rendered while
     * you are rotating the camera.
     *
     * Default value is ````0.5````.
     *
     * @param {Number} value New inertial factor.
     */
    set rotationInertia(value) {
        this._configs.rotationInertia = value === undefined ? 0.5 : value;
    }

    /**
     * Gets the rotation inertia factor.
     *
     * Default value is ````0.5````.
     *
     * @returns {Number} The inertia factor.
     */
    get rotationInertia() {
        return this._configs.rotationInertia;
    }

    /**
     * Sets the current dolly speed. This is the number of World-space coordinate units the camera moves per second while moving forwards or backwards.
     * @param {Number} dollyRate The new dolly speed.
     */
    set dollyRate(dollyRate) {
        this._configs.dollyRate = dollyRate || 10.0;
    }

    /**
     * Returns the current dolly speed.
     * @returns {Number} The current dolly speed.
     */
    get dollyRate() {
        return this._configs.dollyRate;
    }

    /**
     * Sets a factor in range ````[0..1]```` indicating how much the camera keeps moving after you finish dollying it.
     *
     * A value of ````0.0```` causes it to immediately stop, ````0.5```` causes its movement to decay 50% on each tick,
     * while ````1.0```` causes no decay, allowing it continue moving, by the current rate of pan or rotation.
     *
     * You may choose an dollyInertia of zero when you want be able to precisely position or rotate the camera,
     * without interference from inertia. Zero inertia can also mean that less frames are rendered while
     * you are positioning the camera.
     *
     * Default value is ````0.5````.
     *
     * @param {Number} value New dolly inertia factor.
     */
    set dollyInertia(value) {
        this._configs.dollyInertia = value === undefined ? 0.5 : value;
    }

    /**
     * Gets the dolly inertia factor.
     *
     * Default value is ````0.5````.
     *
     * @returns {Number} The dolly inertia factor.
     */
    get dollyInertia() {
        return this._configs.dollyInertia;
    }

    /**
     * Selects the keyboard layout.
     *
     * Options are:
     *
     * * "qwerty"
     * * "azerty"
     *
     * Default is "qwerty".
     */
    set keyboardLayout(value) {
        value = value || "qwerty";
        if (value !== "qwerty" && value !== "azerty") {
            this.error("Unsupported value for keyboardLayout - defaulting to 'qwerty'");
            value = "qwerty";
        }
        this._configs.keyboardLayout = value;
    }

    /**
     * @private
     */
    get keyboardLayout() {
        return this._configs.keyboardLayout;
    }

    destroy() {
        this._destroyHandlers();
        this._cameraUpdater.destroy();
        super.destroy();
    }

    _destroyHandlers() {
        for (let i = 0, len = this._handlers.length; i < len; i++) {
            const handler = this._handlers[i];
            if (handler.destroy) {
                handler.destroy();
            }
        }
    }
}

export {
    CameraControl
};
