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