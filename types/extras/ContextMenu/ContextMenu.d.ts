export declare type ContextMenuConfiguration = {
  /** The context menu items. These can also be dynamically set on {@link ContextMenu.items}. See the class documentation for an example. */
  items?: any;
  /** The context, which is passed into the item callbacks. This can also be dynamically set on {@link ContextMenu.context}. This must be set before calling {@link ContextMenu.show}. */
  context?: any;
  /** Whether this ````ContextMenu```` is initially enabled. {@link ContextMenu.show} does nothing while this is ````false````. */
  enabled?: boolean;
  /** Whether this ````ContextMenu```` automatically hides whenever we mouse-down or tap anywhere in the page. */
  hideOnMouseDown?: boolean;
  /** Whether this ````ContextMenu```` automatically hides whenever we call its action. */
  hideOnAction?: boolean;
};

/**
 * A customizable HTML context menu.
 */
export declare class ContextMenu {
  /**
   * @constructor
   * 
   * @param {ContextMenuConfiguration} [cfg] ````ContextMenu```` configuration.
   */
  constructor(cfg?: ContextMenuConfiguration);

  /**
   * Sets the ````ContextMenu```` items.
   *
   * These can be updated dynamically at any time.
   *
   * See class documentation for an example.
   *
   * @type {Object[]}
   */
  set items(arg: any[]);

  /**
   * Gets the ````ContextMenu```` items.
   *
   * @type {Object[]}
   */
  get items(): any[];

  /**
   * Sets the ````ContextMenu```` context.
   *
   * The context can be any object that you need to be provides to the callbacks configured on {@link ContextMenu.items}.
   *
   * This must be set before calling {@link ContextMenu.show}.
   *
   * @type {Object}
   */
  set context(arg: any);

  /**
   * Gets the ````ContextMenu```` context.
   *
   * @type {Object}
   */
  get context(): any;
  
  /**
   * Sets whether this ````ContextMenu```` is enabled.
   *
   * Hides the menu when disabling.
   *
   * @type {Boolean}
   */
  set enabled(arg: boolean);

  /**
   * Gets whether this ````ContextMenu```` is enabled.
   *
   * {@link ContextMenu.show} does nothing while this is ````false````.
   *
   * @type {Boolean}
   */
  get enabled(): boolean;
  
  /**
   Subscribes to an event fired at this ````ContextMenu````.

    @param {String} event The event
    @param {Function} callback Callback fired on the event
    */
  on(event: string, callback: Function): void;

  /**
   Fires an event at this ````ContextMenu````.

    @param {String} event The event type name
    @param {Object} value The event parameters
    */
  fire(event: string, value: any): void;

  /**
   * Shows this ````ContextMenu```` at the given page coordinates.
   *
   * Does nothing when {@link ContextMenu.enabled} is ````false````.
   *
   * Logs error to console and does nothing if {@link ContextMenu.context} has not been set.
   *
   * Fires a "shown" event when shown.
   *
   * @param {Number} pageX Page X-coordinate.
   * @param {Number} pageY Page Y-coordinate.
   */
  show(pageX: number, pageY: number): void;

  /**
   * Gets whether this ````ContextMenu```` is currently shown or not.
   *
   * @returns {Boolean} Whether this ````ContextMenu```` is shown.
   */
  get shown(): boolean;
  
  /**
   * Hides this ````ContextMenu````.
   *
   * Fires a "hidden" event when hidden.
   */
  hide(): void;

  /**
   * Destroys this ````ContextMenu````.
   */
  destroy(): void;
}
