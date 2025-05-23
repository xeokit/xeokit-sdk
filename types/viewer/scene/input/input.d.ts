import { Component } from "../Component";

/**
 * @desc Meditates mouse, touch and keyboard events for various interaction controls.
 *
 * Ordinarily, you would only use this component as a utility to help manage input events and state for your
 * own custom input handlers.
 *
 * * Located at {@link Scene#input}
 */
export declare class Input extends Component {

  KEY_BACKSPACE: number;
  KEY_TAB: number;
  KEY_ENTER: number;
  KEY_SHIFT: number;
  KEY_CTRL: number;
  KEY_ALT: number;
  KEY_PAUSE_BREAK: number;
  KEY_CAPS_LOCK: number;
  KEY_ESCAPE: number;
  KEY_PAGE_UP: number;
  KEY_PAGE_DOWN: number;
  KEY_END: number;
  KEY_HOME: number;
  KEY_LEFT_ARROW: number;
  KEY_UP_ARROW: number;
  KEY_RIGHT_ARROW: number;
  KEY_DOWN_ARROW: number;
  KEY_INSERT: number;
  KEY_DELETE: number;
  KEY_NUM_0: number;
  KEY_NUM_1: number;
  KEY_NUM_2: number;
  KEY_NUM_3: number;
  KEY_NUM_4: number;
  KEY_NUM_5: number;
  KEY_NUM_6: number;
  KEY_NUM_7: number;
  KEY_NUM_8: number;
  KEY_NUM_9: number;
  KEY_A: number;
  KEY_B: number;
  KEY_C: number;
  KEY_D: number;
  KEY_E: number;
  KEY_F: number;
  KEY_G: number;
  KEY_H: number;
  KEY_I: number;
  KEY_J: number;
  KEY_K: number;
  KEY_L: number;
  KEY_M: number;
  KEY_N: number;
  KEY_O: number;
  KEY_P: number;
  KEY_Q: number;
  KEY_R: number;
  KEY_S: number;
  KEY_T: number;
  KEY_U: number;
  KEY_V: number;
  KEY_W: number;
  KEY_X: number;
  KEY_Y: number;
  KEY_Z: number;
  KEY_LEFT_WINDOW: number;
  KEY_RIGHT_WINDOW: number;
  KEY_SELECT_KEY: number;
  KEY_NUMPAD_0: number;
  KEY_NUMPAD_1: number;
  KEY_NUMPAD_2: number;
  KEY_NUMPAD_3: number;
  KEY_NUMPAD_4: number;
  KEY_NUMPAD_5: number;
  KEY_NUMPAD_6: number;
  KEY_NUMPAD_7: number;
  KEY_NUMPAD_8: number;
  KEY_NUMPAD_9: number;
  KEY_MULTIPLY: number;
  KEY_ADD: number;
  KEY_SUBTRACT: number;
  KEY_DECIMAL_POINT: number;
  KEY_DIVIDE: number;
  KEY_F1: number;
  KEY_F2: number;
  KEY_F3: number;
  KEY_F4: number;
  KEY_F5: number;
  KEY_F6: number;
  KEY_F7: number;
  KEY_F8: number;
  KEY_F9: number;
  KEY_F10: number;
  KEY_F11: number;
  KEY_F12: number;
  KEY_NUM_LOCK: number;
  KEY_SCROLL_LOCK: number;
  KEY_SEMI_COLON: number;
  KEY_EQUAL_SIGN: number;
  KEY_COMMA: number;
  KEY_DASH: number;
  KEY_PERIOD: number;
  KEY_FORWARD_SLASH: number;
  KEY_GRAVE_ACCENT: number;
  KEY_OPEN_BRACKET: number;
  KEY_BACK_SLASH: number;
  KEY_CLOSE_BRACKET: number;
  KEY_SINGLE_QUOTE: number;
  KEY_SPACE: number;
  MOUSE_LEFT_BUTTON: number;
  MOUSE_MIDDLE_BUTTON: number;
  MOUSE_RIGHT_BUTTON: number;

  element: HTMLCanvasElement;

  altDown: boolean;
  ctrlDown: boolean;
  mouseDownLeft: boolean;
  mouseDownMiddle: boolean;
  mouseDownRight: boolean;
  keyDown: boolean[];
  enabled: boolean;
  keyboardEnabled: boolean;
  mouseover: boolean;
  mouseCanvasPos: number[];


  /**
   * Sets whether input handlers are enabled.
   */
  setEnabled(enable: boolean): void;

  /**
   * Gets whether input handlers are enabled.
   */
  getEnabled(): boolean

  /**
   * Sets whether or not keyboard input is enabled.
   */
  setKeyboardEnabled(enable: boolean): void;

  /**
   * Gets whether keyboard input is enabled.
   */
  getKeyboardEnabled(): boolean;

  /**
   * Fires on mouse events
   * @param event The loaded event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "mousedown" | "mouseup" | "mouseclicked" | "dblclick", callback: (canvasCoords: number[]) => void, scope?: any): string;

   /**
   * Fires on keyboard events
   * @param event The loaded event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
   on(event: "keydown" | "keyup", callback: (keyCode: number) => void, scope?: any): string;
}