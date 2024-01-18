/**
 * A node within a {@link TreeViewPlugin}.
 */
export declare class TreeViewNode {
  /**
   * Globally unique node ID.
   *
   * @type {String}
   */
  get nodeId(): string;

  /**
   * Title of the TreeViewNode.
   *
   * @type {String}
   */
  get title(): string;

  /**
   * ID of the corresponding {@link MetaObject}.
   *
   * This is only defined if the TreeViewNode represents an object.
   *
   * @type {String}
   */
  get objectId(): string;

  /**
   * Type of the corresponding {@link MetaObject}.
   *
   * @type {String}
   */
  get type(): string;

  /**
   * The child TreeViewNodes.
   *
   * @type {Array}
   */
  get children(): any[];

  /** The parent TreeViewNode.
   *
   * @type {TreeViewNode|null}
   */
  get parent(): TreeViewNode | null;

  /** The number of {@link Entity}s within the subtree of this TreeViewNode.
   *
   * @type {Number}
   */
  get numEntities(): number;

  /** The number of {@link Entity}s that are currently visible within the subtree of this TreeViewNode.
   *
   * @type {Number}
   */
  get numVisibleEntities(): number;

  /** Whether or not the TreeViewNode is currently checked.
   *
   * @type {Boolean}
   */
  get checked(): boolean;

  /** Whether or not the TreeViewNode is currently xrayed.
   *
   * @type {Boolean}
   */
  get xrayed(): boolean;
}
