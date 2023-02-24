/**
 * A node within a {@link TreeViewPlugin}.
 */
export declare class TreeViewNode {
  /**
   * Globally unique node ID.
   *
   * @type {String}
   * @abstract
   */
  get nodeId(): string;

  /**
   * Title of the TreeViewNode.
   *
   * @type {String}
   * @abstract
   */
  get title(): string;

  /**
   * ID of the corresponding {@link MetaObject}.
   *
   * This is only defined if the TreeViewNode represents an object.
   *
   * @type {Number|String}
   * @abstract
   */
  get objectId(): string | number;

  /**
   * The child TreeViewNodes.
   *
   * @type {Array}
   * @abstract
   */
  get children(): any[];

  /** The parent TreeViewNode.
   *
   * @type {TreeViewNode}
   * @abstract
   */
  get parent(): TreeViewNode;

  /** The number of {@link Entity}s within the subtree of this TreeViewNode.
   *
   * @type {Number}
   * @abstract
   */
  get numEntities(): number;

  /** The number of {@link Entity}s that are currently visible within the subtree of this TreeViewNode.
   *
   * @type {Number}
   * @abstract
   */
  get numVisibleEntities(): number;

  /** Whether or not the TreeViewNode is currently checked.
   *
   * @type {Boolean}
   * @abstract
   */
  get checked(): boolean;

  /** Whether or not the TreeViewNode is currently xrayed.
   *
   * @type {Boolean}
   * @abstract
   */
     get xrayed(): boolean;
}
