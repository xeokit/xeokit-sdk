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
 * @desc Controls a {@link Camera} with keyboard, mouse and touch input.
 *
 * Located at {@link Viewer#cameraControl}.
 *
 * ## Orbiting
 *
 * Pivoting
 *
 * ## Panning
 *
 * Panning is on local axis
 *
 * Pan with keyboard, ALT to scale rate by 0.3
 * Pan with mouse left button and SHIFT
 * Pan with laptop touch pad and SHIFT
 *
 * Mouse wheel - variable rate
 *
 * Dollying
 *
 * Panning to mouse position
 *
 * Panning to pivot position
 *
 * Inertia/damping
 *
 * ## First Person
 *
 * First-person rotation
 *
 * Constraining vertical movement
 *
 * Inertia/damping
 *
 * ## Axis Views
 *
 * ## Picking
 *
 * Double-pick fly-to
 *
 * Hover object
 *
 * Hover object surface
 *
 * ## Plan View Mode
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

            mousePanRate: 0.1,
            keyboardPanRate: .02,
            keyboardOrbitRate: .02,

            touchRotateRate: 0.3,
            touchPanRate: 0.2,
            touchZoomRate: 0.2,

            dollyRate: 10,

            planView: false,
            firstPerson: false,
            constrainVertical: false,

            doublePickFlyTo: true,
            panRightClick: true,

            pivoting: false,
            panToPointer: false,
            panToPivot: false,

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
        this.firstPerson = cfg.firstPerson;
        this.constrainVertical = cfg.constrainVertical;
        this.keyboardLayout = cfg.keyboardLayout;
        this.doublePickFlyTo = cfg.doublePickFlyTo;
        this.panRightClick = cfg.panRightClick;
        this.active = cfg.active;
        this.pivoting = cfg.pivoting;
        this.panToPointer = cfg.panToPointer;
        this.panToPivot = cfg.panToPivot;
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
        this._reset();
        this._configs.active = value !== false;
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
    set panToPointer(value) {
        this._configs.panToPointer = !!value;
        if (this._configs.panToPointer) {
            this._configs.panToPivot = false;
        }
    }

    /**
     * Gets whether scrolling the mouse wheel, when the mouse is over an {@link Entity}, will zoom the {@link Camera} towards the hovered point on the Entity's surface.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if pan-to-pointer behaviour is enabled.
     */
    get panToPointer() {
        return this._configs.panToPointer;
    }

    /**
     * Sets whether scrolling the mouse wheel, when mouse is over an {@link Entity}, will zoom the {@link Camera} towards the pivot point.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable pan-to-pivot behaviour.
     */
    set panToPivot(value) {
        this._configs.panToPivot = !!value;
        if (this._configs.panToPivot) {
            this._configs.panToPointer = false;
        }
    }

    /**
     * Gets whether scrolling the mouse wheel, when mouse is over an {@link Entity}, will zoom the {@link Camera} towards the pivot point.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if enable pan-to-pivot behaviour is enabled.
     */
    get panToPivot() {
        return this._configs.panToPivot;
    }

    /**
     * Sets whether this CameraControl is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable plan-view mode.
     */
    set planView(value) {
        this._configs.planView = !!value;
    }

    /**
     * Gets whether this CameraControl is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if plan-view mode is enabled.
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
     * @param {Boolean} value Set ````true```` to enable first-person mode.
     */
    set firstPerson(value) {
        this._configs.firstPerson = !!value;
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
     * @returns {Boolean} Returns ````true```` if first-person mode is enabled.
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
