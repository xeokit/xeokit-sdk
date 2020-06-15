import {Component} from '../Component.js';
import {math} from '../math/math.js';

/**
 * @desc Meditates mouse, touch and keyboard events for various interaction controls.
 *
 * Ordinarily, you would only use this component as a utility to help manage input events and state for your
 * own custom input handlers.
 *
 * * Located at {@link Scene#input}
 * * Used by (at least) {@link CameraControl}
 *
 * ## Usage
 *
 * Subscribing to mouse events on the canvas:
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * const input = viewer.scene.input;
 *
 * const onMouseDown = input.on("mousedown", (canvasCoords) => {
 *       console.log("Mouse down at: x=" + canvasCoords[0] + ", y=" + coords[1]);
 * });
 *
 * const onMouseUp = input.on("mouseup", (canvasCoords) => {
 *       console.log("Mouse up at: x=" + canvasCoords[0] + ", y=" + canvasCoords[1]);
 * });
 *
 * const onMouseClicked = input.on("mouseclicked", (canvasCoords) => {
 *      console.log("Mouse clicked at: x=" + canvasCoords[0] + ", y=" + canvasCoords[1]);
 * });
 *
 * const onDblClick = input.on("dblclick", (canvasCoords) => {
 *       console.log("Double-click at: x=" + canvasCoords[0] + ", y=" + canvasCoords[1]);
 * });
 * ````
 *
 * Subscribing to keyboard events on the canvas:
 *
 * ````javascript
 * const onKeyDown = input.on("keydown", (keyCode) => {
 *      switch (keyCode) {
 *          case this.KEY_A:
 *              console.log("The 'A' key is down");
 *              break;
 *
 *          case this.KEY_B:
 *              console.log("The 'B' key is down");
 *              break;
 *
 *          case this.KEY_C:
 *              console.log("The 'C' key is down");
 *              break;
 *
 *          default:
 *              console.log("Some other key is down");
 *      }
 * });
 *
 * const onKeyUp = input.on("keyup", (keyCode) => {
 *      switch (keyCode) {
 *          case this.KEY_A:
 *              console.log("The 'A' key is up");
 *              break;
 *
 *          case this.KEY_B:
 *              console.log("The 'B' key is up");
 *              break;
 *
 *          case this.KEY_C:
 *              console.log("The 'C' key is up");
 *              break;
 *
 *          default:
 *              console.log("Some other key is up");
 *      }
 *  });
 * ````
 *
 * Checking if keys are down:
 *
 * ````javascript
 * const isCtrlDown = input.ctrlDown;
 * const isAltDown = input.altDown;
 * const shiftDown = input.shiftDown;
 * //...
 *
 * const isAKeyDown = input.keyDown[input.KEY_A];
 * const isBKeyDown = input.keyDown[input.KEY_B];
 * const isShiftKeyDown = input.keyDown[input.KEY_SHIFT];
 * //...
 *
 * ````
 * Unsubscribing from events:
 *
 * ````javascript
 * input.off(onMouseDown);
 * input.off(onMouseUp);
 * //...
 * ````
 *
 * ## Disabling all events
 *
 * Event handling is enabled by default.
 *
 * To disable all events:
 *
 * ````javascript
 * myViewer.scene.input.setEnabled(false);
 * ````
 * To enable all events again:
 *
 * ````javascript
 * myViewer.scene.input.setEnabled(true);
 * ````
 *
 * ## Disabling keyboard input
 *
 * When the mouse is over the canvas, the canvas will consume keyboard events. Therefore, sometimes we need
 * to disable keyboard control, so that other UI elements can get those events.
 *
 * To disable keyboard events:
 *
 * ````javascript
 * myViewer.scene.input.setKeyboardEnabled(false);
 * ````
 *
 * To enable keyboard events again:
 *
 * ````javascript
 * myViewer.scene.input.setKeyboardEnabled(true)
 * ````
 */
class Input extends Component {

    /**
     * @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        /**
         * Code for the BACKSPACE key.
         * @property KEY_BACKSPACE
         * @final
         * @type {Number}
         */
        this.KEY_BACKSPACE = 8;

        /**
         * Code for the TAB key.
         * @property KEY_TAB
         * @final
         * @type {Number}
         */
        this.KEY_TAB = 9;

        /**
         * Code for the ENTER key.
         * @property KEY_ENTER
         * @final
         * @type {Number}
         */
        this.KEY_ENTER = 13;

        /**
         * Code for the SHIFT key.
         * @property KEY_SHIFT
         * @final
         * @type {Number}
         */
        this.KEY_SHIFT = 16;

        /**
         * Code for the CTRL key.
         * @property KEY_CTRL
         * @final
         * @type {Number}
         */
        this.KEY_CTRL = 17;

        /**
         * Code for the ALT key.
         * @property KEY_ALT
         * @final
         * @type {Number}
         */
        this.KEY_ALT = 18;

        /**
         * Code for the PAUSE_BREAK key.
         * @property KEY_PAUSE_BREAK
         * @final
         * @type {Number}
         */
        this.KEY_PAUSE_BREAK = 19;

        /**
         * Code for the CAPS_LOCK key.
         * @property KEY_CAPS_LOCK
         * @final
         * @type {Number}
         */
        this.KEY_CAPS_LOCK = 20;

        /**
         * Code for the ESCAPE key.
         * @property KEY_ESCAPE
         * @final
         * @type {Number}
         */
        this.KEY_ESCAPE = 27;

        /**
         * Code for the PAGE_UP key.
         * @property KEY_PAGE_UP
         * @final
         * @type {Number}
         */
        this.KEY_PAGE_UP = 33;

        /**
         * Code for the PAGE_DOWN key.
         * @property KEY_PAGE_DOWN
         * @final
         * @type {Number}
         */
        this.KEY_PAGE_DOWN = 34;

        /**
         * Code for the END key.
         * @property KEY_END
         * @final
         * @type {Number}
         */
        this.KEY_END = 35;

        /**
         * Code for the HOME key.
         * @property KEY_HOME
         * @final
         * @type {Number}
         */
        this.KEY_HOME = 36;

        /**
         * Code for the LEFT_ARROW key.
         * @property KEY_LEFT_ARROW
         * @final
         * @type {Number}
         */
        this.KEY_LEFT_ARROW = 37;

        /**
         * Code for the UP_ARROW key.
         * @property KEY_UP_ARROW
         * @final
         * @type {Number}
         */
        this.KEY_UP_ARROW = 38;

        /**
         * Code for the RIGHT_ARROW key.
         * @property KEY_RIGHT_ARROW
         * @final
         * @type {Number}
         */
        this.KEY_RIGHT_ARROW = 39;

        /**
         * Code for the DOWN_ARROW key.
         * @property KEY_DOWN_ARROW
         * @final
         * @type {Number}
         */
        this.KEY_DOWN_ARROW = 40;

        /**
         * Code for the INSERT key.
         * @property KEY_INSERT
         * @final
         * @type {Number}
         */
        this.KEY_INSERT = 45;

        /**
         * Code for the DELETE key.
         * @property KEY_DELETE
         * @final
         * @type {Number}
         */
        this.KEY_DELETE = 46;

        /**
         * Code for the 0 key.
         * @property KEY_NUM_0
         * @final
         * @type {Number}
         */
        this.KEY_NUM_0 = 48;

        /**
         * Code for the 1 key.
         * @property KEY_NUM_1
         * @final
         * @type {Number}
         */
        this.KEY_NUM_1 = 49;

        /**
         * Code for the 2 key.
         * @property KEY_NUM_2
         * @final
         * @type {Number}
         */
        this.KEY_NUM_2 = 50;

        /**
         * Code for the 3 key.
         * @property KEY_NUM_3
         * @final
         * @type {Number}
         */
        this.KEY_NUM_3 = 51;

        /**
         * Code for the 4 key.
         * @property KEY_NUM_4
         * @final
         * @type {Number}
         */
        this.KEY_NUM_4 = 52;

        /**
         * Code for the 5 key.
         * @property KEY_NUM_5
         * @final
         * @type {Number}
         */
        this.KEY_NUM_5 = 53;

        /**
         * Code for the 6 key.
         * @property KEY_NUM_6
         * @final
         * @type {Number}
         */
        this.KEY_NUM_6 = 54;

        /**
         * Code for the 7 key.
         * @property KEY_NUM_7
         * @final
         * @type {Number}
         */
        this.KEY_NUM_7 = 55;

        /**
         * Code for the 8 key.
         * @property KEY_NUM_8
         * @final
         * @type {Number}
         */
        this.KEY_NUM_8 = 56;

        /**
         * Code for the 9 key.
         * @property KEY_NUM_9
         * @final
         * @type {Number}
         */
        this.KEY_NUM_9 = 57;

        /**
         * Code for the A key.
         * @property KEY_A
         * @final
         * @type {Number}
         */
        this.KEY_A = 65;

        /**
         * Code for the B key.
         * @property KEY_B
         * @final
         * @type {Number}
         */
        this.KEY_B = 66;

        /**
         * Code for the C key.
         * @property KEY_C
         * @final
         * @type {Number}
         */
        this.KEY_C = 67;

        /**
         * Code for the D key.
         * @property KEY_D
         * @final
         * @type {Number}
         */
        this.KEY_D = 68;

        /**
         * Code for the E key.
         * @property KEY_E
         * @final
         * @type {Number}
         */
        this.KEY_E = 69;

        /**
         * Code for the F key.
         * @property KEY_F
         * @final
         * @type {Number}
         */
        this.KEY_F = 70;

        /**
         * Code for the G key.
         * @property KEY_G
         * @final
         * @type {Number}
         */
        this.KEY_G = 71;

        /**
         * Code for the H key.
         * @property KEY_H
         * @final
         * @type {Number}
         */
        this.KEY_H = 72;

        /**
         * Code for the I key.
         * @property KEY_I
         * @final
         * @type {Number}
         */
        this.KEY_I = 73;

        /**
         * Code for the J key.
         * @property KEY_J
         * @final
         * @type {Number}
         */
        this.KEY_J = 74;

        /**
         * Code for the K key.
         * @property KEY_K
         * @final
         * @type {Number}
         */
        this.KEY_K = 75;

        /**
         * Code for the L key.
         * @property KEY_L
         * @final
         * @type {Number}
         */
        this.KEY_L = 76;

        /**
         * Code for the M key.
         * @property KEY_M
         * @final
         * @type {Number}
         */
        this.KEY_M = 77;

        /**
         * Code for the N key.
         * @property KEY_N
         * @final
         * @type {Number}
         */
        this.KEY_N = 78;

        /**
         * Code for the O key.
         * @property KEY_O
         * @final
         * @type {Number}
         */
        this.KEY_O = 79;

        /**
         * Code for the P key.
         * @property KEY_P
         * @final
         * @type {Number}
         */
        this.KEY_P = 80;

        /**
         * Code for the Q key.
         * @property KEY_Q
         * @final
         * @type {Number}
         */
        this.KEY_Q = 81;

        /**
         * Code for the R key.
         * @property KEY_R
         * @final
         * @type {Number}
         */
        this.KEY_R = 82;

        /**
         * Code for the S key.
         * @property KEY_S
         * @final
         * @type {Number}
         */
        this.KEY_S = 83;

        /**
         * Code for the T key.
         * @property KEY_T
         * @final
         * @type {Number}
         */
        this.KEY_T = 84;

        /**
         * Code for the U key.
         * @property KEY_U
         * @final
         * @type {Number}
         */
        this.KEY_U = 85;

        /**
         * Code for the V key.
         * @property KEY_V
         * @final
         * @type {Number}
         */
        this.KEY_V = 86;

        /**
         * Code for the W key.
         * @property KEY_W
         * @final
         * @type {Number}
         */
        this.KEY_W = 87;

        /**
         * Code for the X key.
         * @property KEY_X
         * @final
         * @type {Number}
         */
        this.KEY_X = 88;

        /**
         * Code for the Y key.
         * @property KEY_Y
         * @final
         * @type {Number}
         */
        this.KEY_Y = 89;

        /**
         * Code for the Z key.
         * @property KEY_Z
         * @final
         * @type {Number}
         */
        this.KEY_Z = 90;

        /**
         * Code for the LEFT_WINDOW key.
         * @property KEY_LEFT_WINDOW
         * @final
         * @type {Number}
         */
        this.KEY_LEFT_WINDOW = 91;

        /**
         * Code for the RIGHT_WINDOW key.
         * @property KEY_RIGHT_WINDOW
         * @final
         * @type {Number}
         */
        this.KEY_RIGHT_WINDOW = 92;

        /**
         * Code for the SELECT key.
         * @property KEY_SELECT
         * @final
         * @type {Number}
         */
        this.KEY_SELECT_KEY = 93;

        /**
         * Code for the number pad 0 key.
         * @property KEY_NUMPAD_0
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_0 = 96;

        /**
         * Code for the number pad 1 key.
         * @property KEY_NUMPAD_1
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_1 = 97;

        /**
         * Code for the number pad 2 key.
         * @property KEY_NUMPAD 2
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_2 = 98;

        /**
         * Code for the number pad 3 key.
         * @property KEY_NUMPAD_3
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_3 = 99;

        /**
         * Code for the number pad 4 key.
         * @property KEY_NUMPAD_4
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_4 = 100;

        /**
         * Code for the number pad 5 key.
         * @property KEY_NUMPAD_5
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_5 = 101;

        /**
         * Code for the number pad 6 key.
         * @property KEY_NUMPAD_6
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_6 = 102;

        /**
         * Code for the number pad 7 key.
         * @property KEY_NUMPAD_7
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_7 = 103;

        /**
         * Code for the number pad 8 key.
         * @property KEY_NUMPAD_8
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_8 = 104;

        /**
         * Code for the number pad 9 key.
         * @property KEY_NUMPAD_9
         * @final
         * @type {Number}
         */
        this.KEY_NUMPAD_9 = 105;

        /**
         * Code for the MULTIPLY key.
         * @property KEY_MULTIPLY
         * @final
         * @type {Number}
         */
        this.KEY_MULTIPLY = 106;

        /**
         * Code for the ADD key.
         * @property KEY_ADD
         * @final
         * @type {Number}
         */
        this.KEY_ADD = 107;

        /**
         * Code for the SUBTRACT key.
         * @property KEY_SUBTRACT
         * @final
         * @type {Number}
         */
        this.KEY_SUBTRACT = 109;

        /**
         * Code for the DECIMAL POINT key.
         * @property KEY_DECIMAL_POINT
         * @final
         * @type {Number}
         */
        this.KEY_DECIMAL_POINT = 110;

        /**
         * Code for the DIVIDE key.
         * @property KEY_DIVIDE
         * @final
         * @type {Number}
         */
        this.KEY_DIVIDE = 111;

        /**
         * Code for the F1 key.
         * @property KEY_F1
         * @final
         * @type {Number}
         */
        this.KEY_F1 = 112;

        /**
         * Code for the F2 key.
         * @property KEY_F2
         * @final
         * @type {Number}
         */
        this.KEY_F2 = 113;

        /**
         * Code for the F3 key.
         * @property KEY_F3
         * @final
         * @type {Number}
         */
        this.KEY_F3 = 114;

        /**
         * Code for the F4 key.
         * @property KEY_F4
         * @final
         * @type {Number}
         */
        this.KEY_F4 = 115;

        /**
         * Code for the F5 key.
         * @property KEY_F5
         * @final
         * @type {Number}
         */
        this.KEY_F5 = 116;

        /**
         * Code for the F6 key.
         * @property KEY_F6
         * @final
         * @type {Number}
         */
        this.KEY_F6 = 117;

        /**
         * Code for the F7 key.
         * @property KEY_F7
         * @final
         * @type {Number}
         */
        this.KEY_F7 = 118;

        /**
         * Code for the F8 key.
         * @property KEY_F8
         * @final
         * @type {Number}
         */
        this.KEY_F8 = 119;

        /**
         * Code for the F9 key.
         * @property KEY_F9
         * @final
         * @type {Number}
         */
        this.KEY_F9 = 120;

        /**
         * Code for the F10 key.
         * @property KEY_F10
         * @final
         * @type {Number}
         */
        this.KEY_F10 = 121;

        /**
         * Code for the F11 key.
         * @property KEY_F11
         * @final
         * @type {Number}
         */
        this.KEY_F11 = 122;

        /**
         * Code for the F12 key.
         * @property KEY_F12
         * @final
         * @type {Number}
         */
        this.KEY_F12 = 123;

        /**
         * Code for the NUM_LOCK key.
         * @property KEY_NUM_LOCK
         * @final
         * @type {Number}
         */
        this.KEY_NUM_LOCK = 144;

        /**
         * Code for the SCROLL_LOCK key.
         * @property KEY_SCROLL_LOCK
         * @final
         * @type {Number}
         */
        this.KEY_SCROLL_LOCK = 145;

        /**
         * Code for the SEMI_COLON key.
         * @property KEY_SEMI_COLON
         * @final
         * @type {Number}
         */
        this.KEY_SEMI_COLON = 186;

        /**
         * Code for the EQUAL_SIGN key.
         * @property KEY_EQUAL_SIGN
         * @final
         * @type {Number}
         */
        this.KEY_EQUAL_SIGN = 187;

        /**
         * Code for the COMMA key.
         * @property KEY_COMMA
         * @final
         * @type {Number}
         */
        this.KEY_COMMA = 188;

        /**
         * Code for the DASH key.
         * @property KEY_DASH
         * @final
         * @type {Number}
         */
        this.KEY_DASH = 189;

        /**
         * Code for the PERIOD key.
         * @property KEY_PERIOD
         * @final
         * @type {Number}
         */
        this.KEY_PERIOD = 190;

        /**
         * Code for the FORWARD_SLASH key.
         * @property KEY_FORWARD_SLASH
         * @final
         * @type {Number}
         */
        this.KEY_FORWARD_SLASH = 191;

        /**
         * Code for the GRAVE_ACCENT key.
         * @property KEY_GRAVE_ACCENT
         * @final
         * @type {Number}
         */
        this.KEY_GRAVE_ACCENT = 192;

        /**
         * Code for the OPEN_BRACKET key.
         * @property KEY_OPEN_BRACKET
         * @final
         * @type {Number}
         */
        this.KEY_OPEN_BRACKET = 219;

        /**
         * Code for the BACK_SLASH key.
         * @property KEY_BACK_SLASH
         * @final
         * @type {Number}
         */
        this.KEY_BACK_SLASH = 220;

        /**
         * Code for the CLOSE_BRACKET key.
         * @property KEY_CLOSE_BRACKET
         * @final
         * @type {Number}
         */
        this.KEY_CLOSE_BRACKET = 221;

        /**
         * Code for the SINGLE_QUOTE key.
         * @property KEY_SINGLE_QUOTE
         * @final
         * @type {Number}
         */
        this.KEY_SINGLE_QUOTE = 222;

        /**
         * Code for the SPACE key.
         * @property KEY_SPACE
         * @final
         * @type {Number}
         */
        this.KEY_SPACE = 32;

        /**
         * The canvas element that mouse and keyboards are bound to.
         *
         * @final
         * @type {HTMLCanvasElement}
         */
        this.element = cfg.element;

        /** True whenever ALT key is down.
         *
         * @type {boolean}
         */
        this.altDown = false;

        /** True whenever CTRL key is down.
         *
         * @type {boolean}
         */
        this.ctrlDown = false;

        /** True whenever left mouse button is down.
         *
         * @type {boolean}
         */
        this.mouseDownLeft = false;

        /**
         * True whenever middle mouse button is down.
         *
         * @type {boolean}
         */
        this.mouseDownMiddle = false;

        /**
         * True whenever the right mouse button is down.
         *
         * @type {boolean}
         */
        this.mouseDownRight = false;

        /**
         * Flag for each key that's down.
         *
         * @type {boolean[]}
         */
        this.keyDown = [];

        /** True while input enabled
         *
         * @type {boolean}
         */
        this.enabled = true;

        /** True while keyboard input is enabled.
         *
         * Default value is ````true````.
         *
         * {@link CameraControl} will not respond to keyboard events while this is ````false````.
         *
         * @type {boolean}
         */
        this.keyboardEnabled = true;

        /** True while the mouse is over the canvas.
         *
         * @type {boolean}
         */
        this.mouseover = false;

        /**
         * Current mouse position within the canvas.
         * @type {Number[]}
         */
        this.mouseCanvasPos = math.vec2();

        this._bindEvents();
    }

    _bindEvents() {

        if (this._eventsBound) {
            return;
        }

        document.addEventListener("keydown", this._keyDownListener = (e) => {
            if (!this.enabled || (!this.keyboardEnabled)) {
                return;
            }
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                if (e.keyCode === this.KEY_CTRL) {
                    this.ctrlDown = true;
                } else if (e.keyCode === this.KEY_ALT) {
                    this.altDown = true;
                } else if (e.keyCode === this.KEY_SHIFT) {
                    this.shiftDown = true;
                }
                this.keyDown[e.keyCode] = true;
                this.fire("keydown", e.keyCode, true);
            }
        }, false);

        document.addEventListener("keyup", this._keyUpListener = (e) => {
            if (!this.enabled || (!this.keyboardEnabled)) {
                return;
            }
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                if (e.keyCode === this.KEY_CTRL) {
                    this.ctrlDown = false;
                } else if (e.keyCode === this.KEY_ALT) {
                    this.altDown = false;
                } else if (e.keyCode === this.KEY_SHIFT) {
                    this.shiftDown = false;
                }
                this.keyDown[e.keyCode] = false;
                this.fire("keyup", e.keyCode, true);
            }
        });

        this.element.addEventListener("mouseenter", this._mouseEnterListener = (e) => {
            if (!this.enabled) {
                return;
            }
            this.mouseover = true;
            this._getMouseCanvasPos(e);
            this.fire("mouseenter", this.mouseCanvasPos, true);
        });

        this.element.addEventListener("mouseleave", this._mouseLeaveListener = (e) => {
            if (!this.enabled) {
                return;
            }
            this.mouseover = false;
            this._getMouseCanvasPos(e);
            this.fire("mouseleave", this.mouseCanvasPos, true);
        });

        this.element.addEventListener("mousedown", this._mouseDownListener = (e) => {
            if (!this.enabled) {
                return;
            }
            switch (e.which) {
                case 1:// Left button
                    this.mouseDownLeft = true;
                    break;
                case 2:// Middle/both buttons
                    this.mouseDownMiddle = true;
                    break;
                case 3:// Right button
                    this.mouseDownRight = true;
                    break;
                default:
                    break;
            }
            this._getMouseCanvasPos(e);
            this.element.focus();
            this.fire("mousedown", this.mouseCanvasPos, true);
            if (this.mouseover) {
                e.preventDefault();
            }
        });

        document.addEventListener("mouseup", this._mouseUpListener = (e) => {
            if (!this.enabled) {
                return;
            }
            switch (e.which) {
                case 1:// Left button
                    this.mouseDownLeft = false;
                    break;
                case 2:// Middle/both buttons
                    this.mouseDownMiddle = false;
                    break;
                case 3:// Right button
                    this.mouseDownRight = false;
                    break;
                default:
                    break;
            }
            this.fire("mouseup", this.mouseCanvasPos, true);
            // if (this.mouseover) {
            //     e.preventDefault();
            // }
        }, true);

        document.addEventListener("click", this._clickListener = (e) => {
            if (!this.enabled) {
                return;
            }
            switch (e.which) {
                case 1:// Left button
                    this.mouseDownLeft = false;
                    this.mouseDownRight = false;
                    break;
                case 2:// Middle/both buttons
                    this.mouseDownMiddle = false;
                    break;
                case 3:// Right button
                    this.mouseDownLeft = false;
                    this.mouseDownRight = false;
                    break;
                default:
                    break;
            }
            this._getMouseCanvasPos(e);
            this.fire("click", this.mouseCanvasPos, true);
            if (this.mouseover) {
                e.preventDefault();
            }
        });

        document.addEventListener("dblclick", this._dblClickListener = (e) => {
            if (!this.enabled) {
                return;
            }
            switch (e.which) {
                case 1:// Left button
                    this.mouseDownLeft = false;
                    this.mouseDownRight = false;
                    break;
                case 2:// Middle/both buttons
                    this.mouseDownMiddle = false;
                    break;
                case 3:// Right button
                    this.mouseDownLeft = false;
                    this.mouseDownRight = false;
                    break;
                default:
                    break;
            }
            this._getMouseCanvasPos(e);
            this.fire("dblclick", this.mouseCanvasPos, true);
            if (this.mouseover) {
                e.preventDefault();
            }
        });

        this.element.addEventListener("mousemove", this._mouseMoveListener = (e) => {
            if (!this.enabled) {
                return;
            }
            this._getMouseCanvasPos(e);
            this.fire("mousemove", this.mouseCanvasPos, true);
            if (this.mouseover) {
                e.preventDefault();
            }
        });

        this.element.addEventListener("wheel", this._mouseWheelListener = (e, d) => {
            if (!this.enabled) {
                return;
            }
            const delta = Math.max(-1, Math.min(1, -e.deltaY * 40));
            this.fire("mousewheel", delta, true);
        }, {passive: true});

        // mouseclicked

        {
            let downX;
            let downY;
            // Tolerance between down and up positions for a mouse click
            const tolerance = 2;
            this.on("mousedown", (params) => {
                downX = params[0];
                downY = params[1];
            });
            this.on("mouseup", (params) => {
                if (downX >= (params[0] - tolerance) &&
                    downX <= (params[0] + tolerance) &&
                    downY >= (params[1] - tolerance) &&
                    downY <= (params[1] + tolerance)) {
                    this.fire("mouseclicked", params, true);
                }
            });
        }

        // VR

        {

            const orientationAngleLookup = {
                'landscape-primary': 90,
                'landscape-secondary': -90,
                'portrait-secondary': 180,
                'portrait-primary': 0
            };

            let orientation;
            let orientationAngle;
            const acceleration = math.vec3();
            const accelerationIncludingGravity = math.vec3();

            const orientationChangeEvent = {
                orientation: null,
                orientationAngle: 0
            };

            const deviceMotionEvent = {
                orientationAngle: 0,
                acceleration: null,
                accelerationIncludingGravity: accelerationIncludingGravity,
                rotationRate: math.vec3(),
                interval: 0
            };

            const deviceOrientationEvent = {
                alpha: 0,
                beta: 0,
                gamma: 0,
                absolute: false
            };

            if (window.OrientationChangeEvent) {
                window.addEventListener('orientationchange', this._orientationchangedListener = () => {

                        orientation = window.screen.orientation || window.screen.mozOrientation || window.msOrientation || null;
                        orientationAngle = orientation ? (orientationAngleLookup[orientation] || 0) : 0;

                        orientationChangeEvent.orientation = orientation;
                        orientationChangeEvent.orientationAngle = orientationAngle;

                        /**
                         * Fired when the orientation of the device has changed.
                         *
                         * @event orientationchange
                         * @param orientation The orientation: "landscape-primary", "landscape-secondary", "portrait-secondary" or "portrait-primary"
                         * @param orientationAngle The orientation angle in degrees: 90 for landscape-primary, -90 for landscape-secondary, 180 for portrait-secondary or 0 for portrait-primary.
                         */
                        this.fire("orientationchange", orientationChangeEvent);
                    },
                    false);
            }

            if (window.DeviceMotionEvent) {
                window.addEventListener('devicemotion', this._deviceMotionListener = (e) => {

                        deviceMotionEvent.interval = e.interval;
                        deviceMotionEvent.orientationAngle = orientationAngle;

                        const accel = e.acceleration;

                        if (accel) {
                            acceleration[0] = accel.x;
                            acceleration[1] = accel.y;
                            acceleration[2] = accel.z;
                            deviceMotionEvent.acceleration = acceleration;
                        } else {
                            deviceMotionEvent.acceleration = null;
                        }

                        const accelGrav = e.accelerationIncludingGravity;

                        if (accelGrav) {
                            accelerationIncludingGravity[0] = accelGrav.x;
                            accelerationIncludingGravity[1] = accelGrav.y;
                            accelerationIncludingGravity[2] = accelGrav.z;
                            deviceMotionEvent.accelerationIncludingGravity = accelerationIncludingGravity;
                        } else {
                            deviceMotionEvent.accelerationIncludingGravity = null;
                        }

                        deviceMotionEvent.rotationRate = e.rotationRate;

                        /**
                         * Fires on a regular interval and returns data about the rotation
                         * (in degrees per second) and acceleration (in meters per second squared) of the device, at that moment in
                         * time. Some devices do not have the hardware to exclude the effect of gravity.
                         *
                         * @event devicemotion
                         * @param Float32Array acceleration The acceleration of the device, in meters per second squared, as a 3-element vector. This value has taken into account the effect of gravity and removed it from the figures. This value may not exist if the hardware doesn't know how to remove gravity from the acceleration data.
                         * @param Float32Array accelerationIncludingGravity The acceleration of the device, in meters per second squared, as a 3-element vector. This value includes the effect of gravity, and may be the only value available on devices that don't have a gyroscope to allow them to properly remove gravity from the data.
                         * @param, Number interval The interval, in milliseconds, at which this event is fired. The next event will be fired in approximately this amount of time.
                         * @param  Float32Array rotationRate The rates of rotation of the device about each axis, in degrees per second.
                         */
                        this.fire("devicemotion", deviceMotionEvent);
                    },
                    false);
            }

            if (window.DeviceOrientationEvent) {
                window.addEventListener("deviceorientation", this._deviceOrientListener = (e) => {

                        deviceOrientationEvent.gamma = e.gamma;
                        deviceOrientationEvent.beta = e.beta;
                        deviceOrientationEvent.alpha = e.alpha;
                        deviceOrientationEvent.absolute = e.absolute;

                        /**
                         * Fired when fresh data is available from an orientation sensor about the current orientation
                         * of the device as compared to the Earth coordinate frame. This data is gathered from a
                         * magnetometer inside the device. See
                         * <a href="https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Orientation_and_motion_data_explained">Orientation and motion data explained</a> for more info.
                         *
                         * @event deviceorientation
                         * @param Number alpha The current orientation of the device around the Z axis in degrees; that is, how far the device is rotated around a line perpendicular to the device.
                         * @param Number beta The current orientation of the device around the X axis in degrees; that is, how far the device is tipped forward or backward.
                         * @param Number gamma The current orientation of the device around the Y axis in degrees; that is, how far the device is turned left or right.
                         * @param Boolean absolute This value is true if the orientation is provided as a difference between the device coordinate frame and the Earth coordinate frame; if the device can't detect the Earth coordinate frame, this value is false.
                         */
                        this.fire("deviceorientation", deviceOrientationEvent);
                    },
                    false);
            }
        }
        this._eventsBound = true;
    }

    _unbindEvents() {
        if (!this._eventsBound) {
            return;
        }
        document.removeEventListener("keydown", this._keyDownListener);
        document.removeEventListener("keyup", this._keyUpListener);
        this.element.removeEventListener("mouseenter", this._mouseEnterListener);
        this.element.removeEventListener("mouseleave", this._mouseLeaveListener);
        this.element.removeEventListener("mousedown", this._mouseDownListener);
        document.removeEventListener("mouseup", this._mouseDownListener);
        document.removeEventListener("click", this._clickListener);
        document.removeEventListener("dblclick", this._dblClickListener);
        this.element.removeEventListener("mousemove", this._mouseMoveListener);
        this.element.removeEventListener("wheel", this._mouseWheelListener);
        if (window.OrientationChangeEvent) {
            window.removeEventListener('orientationchange', this._orientationchangedListener);
        }
        if (window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', this._deviceMotionListener);
        }
        if (window.DeviceOrientationEvent) {
            window.removeEventListener("deviceorientation", this._deviceOrientListener);
        }
        this._eventsBound = false;
    }

    _getMouseCanvasPos(event) {
        if (!event) {
            event = window.event;
            this.mouseCanvasPos[0] = event.x;
            this.mouseCanvasPos[1] = event.y;
        } else {
            let element = event.target;
            let totalOffsetLeft = 0;
            let totalOffsetTop = 0;
            while (element.offsetParent) {
                totalOffsetLeft += element.offsetLeft;
                totalOffsetTop += element.offsetTop;
                element = element.offsetParent;
            }
            this.mouseCanvasPos[0] = event.pageX - totalOffsetLeft;
            this.mouseCanvasPos[1] = event.pageY - totalOffsetTop;
        }
    }

    /**
     * Sets whether input handlers are enabled.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} enable Indicates if input handlers are enabled.
     */
    setEnabled(enable) {
        if (this.enabled !== enable) {
            this.fire("enabled", this.enabled = enable);
        }
    }

    /**
     * Gets whether input handlers are enabled.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Indicates if input handlers are enabled.
     */
    getEnabled() {
        return this.enabled;
    }

    /**
     * Sets whether or not keyboard input is enabled.
     *
     * Default value is ````true````.
     *
     * {@link CameraControl} will not respond to keyboard events while this is set ````false````.
     *
     * @param {Boolean} value Indicates whether keyboard input is enabled.
     */
    setKeyboardEnabled(value) {
        this.keyboardEnabled = value;
    }

    /**
     * Gets whether keyboard input is enabled.
     *
     * Default value is ````true````.
     *
     * {@link CameraControl} will not respond to keyboard events while this is set ````false````.
     *
     * @returns {Boolean} Returns whether keyboard input is enabled.
     */
    getKeyboardEnabled() {
        return this.keyboardEnabled;
    }

    /**
     * @private
     */
    destroy() {
        super.destroy();
        this._unbindEvents();
    }
}

export {Input};
