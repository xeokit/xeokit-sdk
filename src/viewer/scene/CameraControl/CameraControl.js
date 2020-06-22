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
 * @desc Controls the {@link Camera} with user input, and fires events when the user interacts with pickable {@link Entity}s.
 *
 * # Contents
 *
 * * [Overview](#overview)
 * * [Examples](#examples)
 * * [Orbit Mode](#orbit-mode)
 *      + [Following the Pointer in Orbit Mode](#--following-the-pointer-in-orbit-mode--)
 *      + [Showing the Pivot Position](#--showing-the-pivot-position--)
 *      + [Axis-Aligned Views in Orbit Mode](#--axis-aligned-views-in-orbit-mode--)
 *      + [View-Fitting Entitys in Orbit Mode](#--view-fitting-entitys-in-orbit-mode--)
 * * [First-Person Mode](#first-person-mode)
 *      + [Following the Pointer in First-Person Mode](#--following-the-pointer-in-first-person-mode--)
 *      + [Constraining Vertical Position in First-Person Mode](#--constraining-vertical-position-in-first-person-mode--)
 *      + [Axis-Aligned Views in First-Person Mode](#--axis-aligned-views-in-first-person-mode--)
 *      + [View-Fitting Entitys in First-Person Mode](#--view-fitting-entitys-in-first-person-mode--)
 * * [Plan-View Mode](#plan-view-mode)
 *      + [Following the Pointer in Plan-View Mode](#--following-the-pointer-in-plan-view-mode--)
 *      + [Axis-Aligned Views in Plan-View Mode](#--axis-aligned-views-in-plan-view-mode--)
 * * [CameraControl Events](#cameracontrol-events)
 *      + ["hover"](#---hover---)
 *      + ["hoverOff"](#---hoveroff---)
 *      + ["hoverEnter"](#---hoverenter---)
 *      + ["hoverOut"](#---hoverout---)
 *      + ["picked"](#---picked---)
 *      + ["pickedSurface"](#---pickedsurface---)
 *      + ["pickedNothing"](#---pickednothing---)
 *      + ["doublePicked"](#---doublepicked---)
 *      + ["doublePickedSurface"](#---doublepickedsurface---)
 *      + ["doublePickedNothing"](#---doublepickednothing---)
 *      + ["rightClick"](#---rightclick---)
 * <br><br>
 *
 * # Overview
 *
 * * Each {@link Viewer} has a ````CameraControl````, located at {@link Viewer#cameraControl}.
 * * {@link CameraControl#navMode} selects the navigation mode:
 *      * ````"orbit"```` rotates the {@link Camera} position about the target.
 *      * ````"firstPerson"```` rotates the World about the Camera position.
 *      * ````"planView"```` never rotates, but still allows to pan and dolly, typically for an axis-aligned view.
 * * {@link CameraControl#followPointer} makes the Camera follow the mouse or touch pointer.
 * * {@link CameraControl#constrainVertical} locks the Camera to its current height when in first-person mode.
 * * ````CameraControl```` fires pick events when we hover, click or tap on an {@link Entity}.
 * <br><br>
 *
 * # Examples
 *
 * * [Orbit Navigation - Duplex Model](https://xeokit.github.io/xeokit-sdk/examples/#CameraControl_orbit_Duplex)
 * * [Orbit Navigation - Holter Tower Model](https://xeokit.github.io/xeokit-sdk/examples/#CameraControl_orbit_HolterTower)
 * * [First-Person Navigation - Duplex Model](https://xeokit.github.io/xeokit-sdk/examples/#CameraControl_firstPerson_Duplex)
 * * [First-Person Navigation - Holter Tower Model](https://xeokit.github.io/xeokit-sdk/examples/#CameraControl_firstPerson_HolterTower)
 * * [Plan-view Navigation - Schependomlaan Model](https://xeokit.github.io/xeokit-sdk/examples/#CameraControl_planView_Schependomlaan)
 * <br><br>
 *
 * # Orbit Mode
 *
 * In orbit mode, ````CameraControl```` orbits the {@link Camera} about the target.
 *
 * To enable orbit mode:
 *
 * ````javascript
 * cameraControl.navMode = "orbit";
 * ````
 *
 * Then orbit by:
 *
 * * left-dragging the mouse,
 * * tap-dragging the touch pad, and
 * * pressing arrow keys, or ````Q```` and ````E```` on a QWERTY keyboard, or ````A```` and ````E```` on an AZERTY keyboard.
 * <br><br>
 *
 * Dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the ````+```` and ````-```` keys, or ````W```` and ````S```` on a QWERTY keyboard, or ````Z```` and ````S```` for AZERTY.
 * <br><br>
 *
 * Pan horizontally and vertically by:
 *
 * * right-dragging the mouse,
 * * left-dragging the mouse with the SHIFT key down,
 * * tap-dragging the touch pad with SHIFT down,
 * * pressing the ````A````, ````D````, ````Z```` and ````X```` keys on a QWERTY keyboard, and
 * * pressing the ````Q````, ````D````, ````W```` and ````X```` keys on an AZERTY keyboard,
 * <br><br>
 *
 * ## Following the Pointer in Orbit Mode
 *
 * When {@link CameraControl#followPointer} is ````true````in orbiting mode, the mouse or touch pointer will dynamically
 * indicate the target that the {@link Camera} will orbit, as well as dolly to and from.
 *
 * Lets ensure that we're in orbit mode, then enable the {@link Camera} to follow the pointer:
 *
 * ````javascript
 * cameraControl.navMode = "orbit";
 * cameraControl.followPointer = true;
 * ````
 *
 * When the pointer is over empty space, the target will remain on the last object that the pointer was over.
 *
 * ## Showing the Pivot Position
 *
 * We can configure {@link CameraControl#pivotElement} with an HTML element to indicate the current
 * pivot position. The indicator will appear momentarily each time we move the {@link Camera} while in orbit mode with
 * {@link CameraControl#followPointer} set ````true````.
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
 * Then we'll attach our pivot indicator's HTML element to the ````CameraControl````:
 *
 * ````javascript
 * const pivotElement = document.createRange().createContextualFragment("<div class='camera-pivot-marker'></div>").firstChild;
 *
 * document.body.appendChild(pivotElement);
 *
 * cameraControl.pivotElement = pivotElement;
 * ````
 *
 * ## Axis-Aligned Views in Orbit Mode
 *
 * In orbit mode, we can use keys 1-6 to position the {@link Camera} to look at the center of the {@link Scene} from along each of the
 * six World-space axis. Pressing one of these keys will fly the {@link Camera} to the corresponding axis-aligned view.
 *
 * ## View-Fitting Entitys in Orbit Mode
 *
 * When {@link CameraControl#doublePickFlyTo} is ````true````, we can left-double-click or
 * double-tap (ie. "double-pick") an {@link Entity} to fit it to view. This will cause the {@link Camera}
 * to fly to that Entity. Our target then becomes the center of that Entity. If we are currently pivoting,
 * then our pivot position is then also set to the Entity center.
 *
 * Disable that behaviour by setting {@link CameraControl#doublePickFlyTo} ````false````.
 *
 * # First-Person Mode
 *
 * In first-person mode, ````CameraControl```` rotates the World about the {@link Camera} position.
 *
 * To enable first-person mode:
 *
 * ````javascript
 * cameraControl.navMode = "firstPerson";
 * ````
 *
 * Then rotate by:
 *
 * * left-dragging the mouse,
 * * tap-dragging the touch pad,
 * * pressing arrow keys, or ````Q```` and ````E```` on a QWERTY keyboard, or ````A```` and ````E```` on an AZERTY keyboard.
 * <br><br>
 *
 * Dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the ````+```` and ````-```` keys, or ````W```` and ````S```` on a QWERTY keyboard, or ````Z```` and ````S```` for AZERTY.
 * <br><br>
 *
 * Pan left, right, up and down by:
 *
 * * left-dragging or right-dragging the mouse, and
 * * tap-dragging the touch pad with SHIFT down.
 *
 * Pan forwards, backwards, left, right, up and down by pressing the ````WSADZX```` keys on a QWERTY keyboard,
 * or ````WSQDWX```` keys on an AZERTY keyboard.
 * <br><br>
 *
 * ## Following the Pointer in First-Person Mode
 *
 * When {@link CameraControl#followPointer} is ````true```` in first-person mode, the mouse or touch pointer will dynamically
 * indicate the target to which the {@link Camera} will dolly to and from. In first-person mode, however, the World will always rotate
 * about the {@link Camera} position.
 *
 * Lets ensure that we're in first-person mode, then enable the {@link Camera} to follow the pointer:
 *
 * ````javascript
 * cameraControl.navMode = "firstPerson";
 * cameraControl.followPointer = true;
 * ````
 *
 * When the pointer is over empty space, the target will remain the last object that the pointer was over.
 *
 * ## Constraining Vertical Position in First-Person Mode
 *
 * In first-person mode, we can lock the {@link Camera} to its current position on the vertical World axis, which is useful for walk-through navigation:
 *
 * ````javascript
 * cameraControl.constrainVertical = true;
 * ````
 *
 * ## Axis-Aligned Views in First-Person Mode
 *
 * In first-person mode we can use keys 1-6 to position the {@link Camera} to look at the center of
 * the {@link Scene} from along each of the six World-space axis. Pressing one of these keys will fly the {@link Camera} to the
 * corresponding axis-aligned view.
 *
 * ## View-Fitting Entitys in First-Person Mode
 *
 * As in orbit mode, when in first-person mode and {@link CameraControl#doublePickFlyTo} is ````true````, we can double-click
 * or double-tap an {@link Entity} (ie. "double-picking") to fit it in view. This will cause the {@link Camera} to fly to
 * that Entity. Our target then becomes the center of that Entity.
 *
 * Disable that behaviour by setting {@link CameraControl#doublePickFlyTo} ````false````.
 *
 * # Plan-View Mode
 *
 * In plan-view mode, ````CameraControl```` pans and rotates the {@link Camera}, without rotating it.
 *
 * To enable plan-view mode:
 *
 * ````javascript
 * cameraControl.navMode = "planView";
 * ````
 *
 * Dolly forwards and backwards by:
 *
 * * spinning the mouse wheel,
 * * pinching on the touch pad, and
 * * pressing the ````+```` and ````-```` keys.
 *
 * <br>
 * Pan left, right, up and down by:
 *
 * * left-dragging or right-dragging the mouse, and
 * * tap-dragging the touch pad with SHIFT down.
 *
 * Pan forwards, backwards, left, right, up and down by pressing the ````WSADZX```` keys on a QWERTY keyboard,
 * or ````WSQDWX```` keys on an AZERTY keyboard.
 * <br><br>
 *
 * ## Following the Pointer in Plan-View Mode
 *
 * When {@link CameraControl#followPointer} is ````true```` in plan-view mode, the mouse or touch pointer will dynamically
 * indicate the target to which the {@link Camera} will dolly to and from.  In plan-view mode, however, the {@link Camera} cannot rotate.
 *
 * Lets ensure that we're in plan-view mode, then enable the {@link Camera} to follow the pointer:
 *
 * ````javascript
 * cameraControl.navMode = "planView";
 * cameraControl.followPointer = true;
 * ````
 *
 * When the pointer is over empty space, the target will remain the last object that the pointer was over.
 *
 * ## Axis-Aligned Views in Plan-View Mode
 *
 * As in orbit and first-person modes, in plan-view mode we can use keys 1-6 to position the {@link Camera} to look at the center of
 * the {@link Scene} from along each of the six World-space axis. Pressing one of these keys will fly the {@link Camera} to the
 * corresponding axis-aligned view.
 *
 * # CameraControl Events
 *
 * ````CameraControl```` fires events as we interact with {@link Entity}s using mouse or touch input.
 *
 * The following examples demonstrate how to subscribe to those events.
 *
 * The first example shows how to save a handle to a subscription, which we can later use to unsubscribe.
 *
 * ## "hover"
 *
 * Event fired when the pointer moves while hovering over an Entity.
 *
 * ````javascript
 * const onHover = cameraControl.on("hover", (e) => {
 *      const entity = e.entity; // Entity
 *      const canvasPos = e.canvasPos; // 2D canvas position
 * });
 * ````
 *
 * To unsubscribe from the event:
 *
 * ````javascript
 * cameraControl.off(onHover);
 * ````
 *
 * ## "hoverOff"
 *
 * Event fired when the pointer moves while hovering over empty space.
 *
 * ````javascript
 * cameraControl.on("hoverOff", (e) => {
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "hoverEnter"
 *
 * Event fired when the pointer moves onto an Entity.
 *
 * ````javascript
 * cameraControl.on("hoverEnter", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "hoverOut"
 *
 * Event fired when the pointer moves off an Entity.
 *
 * ````javascript
 * cameraControl.on("hoverOut", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "picked"
 *
 * Event fired when we left-click or tap on an Entity.
 *
 * ````javascript
 * cameraControl.on("picked", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "pickedSurface"
 *
 * Event fired when we left-click or tap on the surface of an Entity.
 *
 * ````javascript
 * cameraControl.on("picked", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 *      const worldPos = e.worldPos; // 3D World-space position
 *      const viewPos = e.viewPos; // 3D View-space position
 *      const worldNormal = e.worldNormal; // 3D World-space normal vector
 * });
 * ````
 *
 * ## "pickedNothing"
 *
 * Event fired when we left-click or tap on empty space.
 *
 * ````javascript
 * cameraControl.on("pickedNothing", (e) => {
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "doublePicked"
 *
 * Event fired wwhen we left-double-click or double-tap on an Entity.
 *
 * ````javascript
 * cameraControl.on("doublePicked", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "doublePickedSurface"
 *
 * Event fired when we left-double-click or double-tap on the surface of an Entity.
 *
 * ````javascript
 * cameraControl.on("doublePickedSurface", (e) => {
 *      const entity = e.entity;
 *      const canvasPos = e.canvasPos;
 *      const worldPos = e.worldPos;
 *      const viewPos = e.viewPos;
 *      const worldNormal = e.worldNormal;
 * });
 * ````
 *
 * ## "doublePickedNothing"
 *
 * Wvent fired when we left-double-click or double-tap on empty space.
 *
 * ````javascript
 * cameraControl.on("doublePickedNothing", (e) => {
 *      const canvasPos = e.canvasPos;
 * });
 * ````
 *
 * ## "rightClick"
 *
 * Event fired when we right-click on the canvas.
 *
 * ````javascript
 * cameraControl.on("rightClick", (e) => {
 *      const event = e.event; // Mouse event
 *      const canvasPos = e.canvasPos;
 * });
 * ````
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

            // Private

            tapInterval: 150, // Millisecs
            doubleTapInterval: 325, // Millisecs
            tapDistanceThreshold: 4, // Pixels

            // General

            active: true,
            keyboardLayout: "qwerty",
            navMode: "orbit",
            planView: false,
            firstPerson: false,
            followPointer: false,
            doublePickFlyTo: true,
            panRightClick: true,
            rotateRightClick: true,
            showPivot: false,
            pointerEnabled: true,
            constrainVertical: false,

            // Rotation

            dragRotationRate: 360.0,
            keyboardRotationRate: 90.0,
            rotationInertia: 0.5,

            // Panning

            keyboardPanRate: 1.0,
            panInertia: 0.5,

            // Dollying

            keyboardDollyRate: 10,
            mouseWheelDollyRate: 10,
            dollyInertia: 0.75,
            dollyProximityThreshold: 30.0,
            dollyMinSpeed: 1.0
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
        this.rotateRightClick = cfg.rotateRightClick;
        this.active = cfg.active;
        this.followPointer = cfg.followPointer;
        this.rotationInertia = cfg.rotationInertia;
        this.keyboardPanRate = cfg.keyboardPanRate;
        this.keyboardRotationRate = cfg.keyboardRotationRate;
        this.dragRotationRate = cfg.dragRotationRate;
        this.dollyInertia = cfg.dollyInertia;
        this.dollyProximityThreshold = cfg.dollyProximityThreshold;
        this.dollyMinSpeed = cfg.dollyMinSpeed;
        this.panInertia = cfg.panInertia;
        this.pointerEnabled = true;
        this.keyboardDollyRate = cfg.keyboardDollyRate;
        this.mouseWheelDollyRate = cfg.mouseWheelDollyRate;
    }

    /**
     * Sets the HTMl element to represent the pivot point when {@link CameraControl#followPointer} is true.
     *
     * See class comments for an example.
     *
     * @param {HTMLElement} element HTML element representing the pivot point.
     */
    set pivotElement(element) {
        this._controllers.pivotController.setPivotElement(element);
    }

    /**
     *  Sets if this ````CameraControl```` is active or not.
     *
     * When inactive, the ````CameraControl```` will not react to input.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value Set ````true```` to activate this ````CameraControl````.
     */
    set active(value) {
        this._configs.active = value !== false;
    }

    /**
     * Gets if this ````CameraControl```` is active or not.
     *
     * When inactive, the ````CameraControl```` will not react to input.
     *
     * Default is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if this ````CameraControl```` is active.
     */
    get active() {
        return this._configs.active;
    }

    /**
     * Sets the current navigation mode.
     *
     * Accepted values are:
     *
     * * "orbit" - rotation orbits about the current target or pivot point,
     * * "firstPerson" - rotation is about the current eye position,
     * * "planView" - rotation is disabled.
     *
     * See class comments for more info.
     *
     * @param {String} navMode The navigation mode: "orbit", "firstPerson" or "planView".
     */
    set navMode(navMode) {
        navMode = navMode || "orbit";
        if (navMode !== "firstPerson" && navMode !== "orbit" && navMode !== "planView") {
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
     * @returns {String} The navigation mode: "orbit", "firstPerson" or "planView".
     */
    get navMode() {
        return this._configs.navMode;
    }

    /**
     * Sets whether mouse and touch input is enabled.
     *
     * Default is ````true````.
     *
     * Disabling mouse and touch input on ````CameraControl```` is useful when we want to temporarily use mouse or
     * touch input to interact with some other 3D control, without disturbing the {@link Camera}.
     *
     * @param {Boolean} value Set ````true```` to enable mouse and touch input.
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
     * Gets whether mouse and touch input is enabled.
     *
     * Default is ````true````.
     *
     * Disabling mouse and touch input on ````CameraControl```` is desirable when we want to temporarily use mouse or
     * touch input to interact with some other 3D control, without interfering with the {@link Camera}.
     *
     * @returns {Boolean} Returns ````true```` if mouse and touch input is enabled.
     */
    get pointerEnabled() {
        return this._configs.pointerEnabled;
    }

    /**
     * Sets whether the {@link Camera} follows the mouse or touch pointer.
     *
     * In orbiting mode, the Camera will orbit about the pointer, and will dolly to and from the pointer.
     *
     * In fly-to mode, the Camera will dolly to and from the pointer, however the World will always rotate about the Camera position.
     *
     * In plan-view mode, the Camera will dolly to and from the pointer, however the Camera will not rotate.
     *
     * Default is ````false````.
     *
     * See class comments for more info.
     *
     * @param {Boolean} value Set ````true```` to enable the Camera to follow the pointer.
     */
    set followPointer(value) {
        this._configs.followPointer = !!value;
    }

    /**
     * Sets whether the {@link Camera} follows the mouse or touch pointer.
     *
     * In orbiting mode, the Camera will orbit about the pointer, and will dolly to and from the pointer.
     *
     * In fly-to mode, the Camera will dolly to and from the pointer, however the World will always rotate about the Camera position.
     *
     * In plan-view mode, the Camera will dolly to and from the pointer, however the Camera will not rotate.
     *
     * Default is ````false````.
     *
     * See class comments for more info.
     *
     * @returns {Boolean} Returns ````true```` if the Camera follows the pointer.
     */
    get followPointer() {
        return this._configs.followPointer;
    }

    /**
     * Sets the current World-space 3D target position.
     *
     * Only applies when {@link CameraControl#followPointer} is ````true````.
     *
     * @param {Number[]} worldPos The new World-space 3D target position.
     */
    set pivotPos(worldPos) {
        this._controllers.pivotController.setPivotPos(worldPos);
    }

    /**
     * Gets the current World-space 3D pivot position.
     *
     * Only applies when {@link CameraControl#followPointer} is ````true````.
     *
     * @return {Number[]} worldPos The current World-space 3D pivot position.
     */
    get pivotPos() {
        return this._controllers.pivotController.getPivotPos();
    }

    /**
     * @deprecated
     * @param {Boolean} value Set ````true```` to enable dolly-to-pointer behaviour.
     */
    set dollyToPointer(value) {
        this.warn("dollyToPointer property is deprecated - replaced with followPointer");
        this.followPointer = value;
    }

    /**
     * @deprecated
     * @returns {Boolean} Returns ````true```` if dolly-to-pointer behaviour is enabled.
     */
    get dollyToPointer() {
        this.warn("dollyToPointer property is deprecated - replaced with followPointer");
        return this.followPointer = value;
    }

    /**
     * @deprecated
     * @param {Boolean} value Set ````true```` to enable dolly-to-pointer behaviour.
     */
    set panToPointer(value) {
        this.warn("panToPointer property is deprecated - replaced with followPointer");
    }

    /**
     * @deprecated
     * @returns {Boolean} Returns ````true```` if dolly-to-pointer behaviour is enabled.
     */
    get panToPointer() {
        this.warn("panToPointer property is deprecated - replaced with followPointer");
        return false;
    }

    /**
     * Sets whether this ````CameraControl```` is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default is ````false````.
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
        this.warn("planView property is deprecated - replaced with navMode");
    }

    /**
     * Gets whether this ````CameraControl```` is in plan-view mode.
     *
     * When in plan-view mode, rotation is disabled.
     *
     * Default is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @returns {Boolean} Returns ````true```` if plan-view mode is enabled.
     * @deprecated
     */
    get planView() {
        this.warn("planView property is deprecated - replaced with navMode");
        return this._configs.planView;
    }

    /**
     * Sets whether this ````CameraControl```` is in first-person mode.
     *
     * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,  {@link Camera#eye} rotates about {@link Camera#look}.
     *
     * Default is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @param {Boolean} value Set ````true```` to enable first-person mode.
     * @deprecated
     */
    set firstPerson(value) {
        this.warn("firstPerson property is deprecated - replaced with navMode");
        this._configs.firstPerson = !!value;
        this._configs.planView = false;
        if (this._configs.firstPerson) {
            this._controllers.pivotController.hidePivot();
            this._controllers.pivotController.endPivot();
        }
    }

    /**
     * Gets whether this ````CameraControl```` is in first-person mode.
     *
     * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,  {@link Camera#eye} rotates about {@link Camera#look}.
     *
     * Default is ````false````.
     *
     * Deprecated - use {@link CameraControl#navMode} instead.
     *
     * @returns {Boolean} Returns ````true```` if first-person mode is enabled.
     * @deprecated
     */
    get firstPerson() {
        this.warn("firstPerson property is deprecated - replaced with navMode");
        return this._configs.firstPerson;
    }

    /**
     * Sets whether to vertically constrain the {@link Camera} position for first-person navigation.
     *
     * When set ````true````, this constrains {@link Camera#eye} to its current vertical position.
     *
     * Only applies when {@link CameraControl#navMode} is ````"firstPerson"````.
     *
     * Default is ````false````.
     *
     * @param {Boolean} value Set ````true```` to vertically constrain the Camera.
     */
    set constrainVertical(value) {
        this._configs.constrainVertical = !!value;
    }

    /**
     * Gets whether to vertically constrain the {@link Camera} position for first-person navigation.
     *
     * When set ````true````, this constrains {@link Camera#eye} to its current vertical position.
     *
     * Only applies when {@link CameraControl#navMode} is ````"firstPerson"````.
     *
     * Default is ````false````.
     *
     * @returns {Boolean} ````true```` when Camera is vertically constrained.
     */
    get constrainVertical() {
        return this._configs.constrainVertical;
    }

    /**
     * Sets whether double-picking an {@link Entity} causes the {@link Camera} to fly to its boundary.
     *
     * Default is ````false````.
     *
     * @param {Boolean} value Set ````true```` to enable double-pick-fly-to mode.
     */
    set doublePickFlyTo(value) {
        this._configs.doublePickFlyTo = value !== false;
    }

    /**
     * Gets whether double-picking an {@link Entity} causes the {@link Camera} to fly to its boundary.
     *
     * Default is ````false````.
     *
     * @returns {Boolean} Returns ````true```` when double-pick-fly-to mode is enabled.
     */
    get doublePickFlyTo() {
        return this._configs.doublePickFlyTo;
    }

    /**
     * Sets whether either right-clicking (true) or middle-clicking (false) pans the {@link Camera}.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value Set ````false```` to disable pan on right-click.
     */
    set panRightClick(value) {
        this._configs.panRightClick = value !== false;
    }

    /**
     * Gets whether right-clicking pans the {@link Camera}.
     *
     * Default is ````true````.
     *
     * @returns {Boolean} Returns ````false```` when pan on right-click is disabled.
     */
    get panRightClick() {
        return this._configs.panRightClick;
    }

    /**
     * Sets whether mouse-moving after right-click rotates the {@link Camera}.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value Set ````false```` to disable rotate on mouse-move after right-click.
     */
    set rotateRightClick(value) {
        this._configs.rotateRightClick = value !== false;
    }

    /**
     * Gets whether mouse-moving after right-click rotates the {@link Camera}.
     *
     * Default is ````true````.
     *
     * @returns {Boolean} Returns ````false```` when rotate on mouse-move after right-click is disabled.
     */
    get rotateRightClick() {
        return this._configs.rotateRightClick;
    }

    /**
     * Sets a factor in range ````[0..1]```` indicating how much the {@link Camera} keeps moving after you finish rotating it.
     *
     * A value of ````0.0```` causes it to immediately stop, ````0.5```` causes its movement to decay 50% on each tick,
     * while ````1.0```` causes no decay, allowing it continue moving, by the current rate of rotation.
     *
     * You may choose an inertia of zero when you want be able to precisely rotate the Camera,
     * without interference from inertia. Zero inertia can also mean that less frames are rendered while
     * you are rotating the Camera.
     *
     * Default is ````0.5````.
     *
     * Does not apply when {@link CameraControl#navMode} is ````"planView"````, which disallows rotation.
     *
     * @param {Number} rotationInertia New inertial factor.
     */
    set rotationInertia(rotationInertia) {
        this._configs.rotationInertia = (rotationInertia !== undefined && rotationInertia !== null) ? rotationInertia : 0.5;
    }

    /**
     * Gets the rotation inertia factor.
     *
     * Default is ````0.5````.
     *
     * Does not apply when {@link CameraControl#navMode} is ````"planView"````, which disallows rotation.
     *
     * @returns {Number} The inertia factor.
     */
    get rotationInertia() {
        return this._configs.rotationInertia;
    }

    /**
     * Sets how much the {@link Camera} pans each second with keyboard input.
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
     *
     * @param {Number} keyboardPanRate The new keyboard pan rate.
     */
    set keyboardPanRate(keyboardPanRate) {
        this._configs.keyboardPanRate = (keyboardPanRate !== null && keyboardPanRate !== undefined) ? keyboardPanRate : 5.0;
    }

    /**
     * Gets how much the {@link Camera} pans each second with keyboard input.
     *
     * Default is ````5.0````.
     *
     * @returns {Number} The current keyboard pan rate.
     */
    get keyboardPanRate() {
        return this._configs.keyboardPanRate;
    }

    /**
     * Sets how many degrees per second the {@link Camera} rotates/orbits with keyboard input.
     *
     * Default is ````90.0````, to rotate/orbit the Camera ````90.0```` degrees every second that
     * a rotation key is depressed. See the ````CameraControl```` class documentation for which keys control
     * rotation/orbit.
     *
     * @param {Number} keyboardRotationRate The new keyboard rotation rate.
     */
    set keyboardRotationRate(keyboardRotationRate) {
        this._configs.keyboardRotationRate = (keyboardRotationRate !== null && keyboardRotationRate !== undefined) ? keyboardRotationRate : 90.0;
    }

    /**
     * Sets how many degrees per second the {@link Camera} rotates/orbits with keyboard input.
     *
     * Default is ````90.0````.
     *
     * @returns {Number} The current keyboard rotation rate.
     */
    get keyboardRotationRate() {
        return this._configs.keyboardRotationRate;
    }

    /**
     * Sets the current drag rotation rate.
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
     *
     * @param {Number} dragRotationRate The new drag rotation rate.
     */
    set dragRotationRate(dragRotationRate) {
        this._configs.dragRotationRate = (dragRotationRate !== null && dragRotationRate !== undefined) ? dragRotationRate : 360.0;
    }

    /**
     * Gets the current drag rotation rate.
     *
     * Default is ````360.0````.
     *
     * @returns {Number} The current drag rotation rate.
     */
    get dragRotationRate() {
        return this._configs.dragRotationRate;
    }

    /**
     * Sets how much the {@link Camera} dollys each second with keyboard input.
     *
     * Default is ````15.0````, to dolly the {@link Camera} ````15.0```` World-space units per second while we hold down
     * the ````+```` and ````-```` keys.
     *
     * @param {Number} keyboardDollyRate The new keyboard dolly rate.
     */
    set keyboardDollyRate(keyboardDollyRate) {
        this._configs.keyboardDollyRate = (keyboardDollyRate !== null && keyboardDollyRate !== undefined) ? keyboardDollyRate : 15.0;
    }

    /**
     * Gets how much the {@link Camera} dollys each second with keyboard input.
     *
     * Default is ````15.0````.
     *
     * @returns {Number} The current keyboard dolly rate.
     */
    get keyboardDollyRate() {
        return this._configs.keyboardDollyRate;
    }

    /**
     * Sets how much the {@link Camera} dollys each second while the mouse wheel is spinning.
     *
     * Default is ````15.0````, to dolly the {@link Camera} ````15.0```` World-space units per second as we spin
     * the mouse wheel.
     *
     * @param {Number} mouseWheelDollyRate The new mouse wheel dolly rate.
     */
    set mouseWheelDollyRate(mouseWheelDollyRate) {
        this._configs.mouseWheelDollyRate = (mouseWheelDollyRate !== null && mouseWheelDollyRate !== undefined) ? mouseWheelDollyRate : 15.0;
    }

    /**
     * Gets how much the {@link Camera} dollys each second while the mouse wheel is spinning.
     *
     * Default is ````15.0````.
     *
     * @returns {Number} The current mouseWheel dolly rate.
     */
    get mouseWheelDollyRate() {
        return this._configs.mouseWheelDollyRate;
    }

    /**
     * Sets the dolly inertia factor.
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
     * Default is ````0.75````.
     *
     * @param {Number} dollyInertia New dolly inertia factor.
     */
    set dollyInertia(dollyInertia) {
        this._configs.dollyInertia = (dollyInertia !== undefined && dollyInertia !== null) ? dollyInertia : 0.75;
    }

    /**
     * Gets the dolly inertia factor.
     *
     * Default is ````0.75````.
     *
     * @returns {Number} The current dolly inertia factor.
     */
    get dollyInertia() {
        return this._configs.dollyInertia;
    }

    /**
     * Sets the proximity to the closest object below which dolly speed decreases, and above which dolly speed increases.
     *
     * Default is ````35.0````.
     *
     * @param {Number} dollyProximityThreshold New dolly proximity threshold.
     */
    set dollyProximityThreshold(dollyProximityThreshold) {
        this._configs.dollyProximityThreshold = (dollyProximityThreshold !== undefined && dollyProximityThreshold !== null) ? dollyProximityThreshold : 35.0;
    }

    /**
     * Gets the proximity to the closest object below which dolly speed decreases, and above which dolly speed increases.
     *
     * Default is ````35.0````.
     *
     * @returns {Number} The current dolly proximity threshold.
     */
    get dollyProximityThreshold() {
        return this._configs.dollyProximityThreshold;
    }

    /**
     * Sets the minimum dolly speed.
     *
     * Default is ````0.05````.
     *
     * @param {Number} dollyMinSpeed New dolly minimum speed.
     */
    set dollyMinSpeed(dollyMinSpeed) {
        this._configs.dollyMinSpeed = (dollyMinSpeed !== undefined && dollyMinSpeed !== null) ? dollyMinSpeed : 0.05;
    }

    /**
     * Gets the minimum dolly speed.
     *
     * Default is ````0.05````.
     *
     * @returns {Number} The current minimum dolly speed.
     */
    get dollyMinSpeed() {
        return this._configs.dollyMinSpeed;
    }

    /**
     * Sets the pan inertia factor.
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
     *
     * @param {Number} panInertia New pan inertia factor.
     */
    set panInertia(panInertia) {
        this._configs.panInertia = (panInertia !== undefined && panInertia !== null) ? panInertia : 0.5;
    }

    /**
     * Gets the pan inertia factor.
     *
     * Default is ````0.5````.
     *
     * @returns {Number} The current pan inertia factor.
     */
    get panInertia() {
        return this._configs.panInertia;
    }

    /**
     * Sets the keyboard layout.
     *
     * Supported layouts are:
     *
     * * ````"qwerty"```` (default)
     * * ````"azerty"````
     *
     * @param {String} value Selects the keyboard layout.
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
     * Gets the keyboard layout.
     *
     * Supported layouts are:
     *
     * * ````"qwerty"```` (default)
     * * ````"azerty"````
     *
     * @returns {String} The current keyboard layout.
     */
    get keyboardLayout() {
        return this._configs.keyboardLayout;
    }

    /**
     * Destroys this ````CameraControl````.
     * @private
     */
    destroy() {
        this._destroyHandlers();
        this._destroyControllers();
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

    _destroyControllers() {
        for (let i = 0, len = this._controllers.length; i < len; i++) {
            const controller = this._controllers[i];
            if (controller.destroy) {
                controller.destroy();
            }
        }
    }
}

export {
    CameraControl
};
