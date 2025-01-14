import { Plugin, Viewer } from "../../viewer";
import { TreeViewNode } from "./TreeViewNode";
import { ITreeViewRenderService } from "./renderService";

export declare type TreeViewPluginConfiguration = {
  /** DOM element ID to contain the TreeViewPlugin */
  containerElementId?: string;
  /** DOM element to contain the TreeViewPlugin. */
  containerElement?: HTMLElement;
  /** When ````true```` (default), will automatically add each model as it's created. Set this ````false```` if you want to manually add models using {@link TreeViewPlugin.addModel} instead. */
  autoAddModels?: boolean;
  /** Optional depth to which to initially expand the tree. */
  autoExpandDepth?: number;
  /** How to organize the tree nodes: "containment", "storeys" or "types". See the class documentation for details. */
  hierarchy?: "containment" | "storeys" | "types";
  /** When true, will sort the children of each node. */
  sortNodes?: boolean;
  /** When true, will not contain nodes that don't have content in the {@link Scene}. These are nodes whose {@link MetaObject}s don't have {@link Entity}s. */
  pruneEmptyNodes?: boolean;
  /** Optional {@link ITreeViewRenderService} to use. Defaults to the {@link TreeViewPlugin}'s default {@link RenderService}. */
  renderService?: ITreeViewRenderService;
  /** When true, will show indeterminate state for checkboxes when some but not all child nodes are checked */
  showIndeterminate?: boolean;
  /** Optional function to replace the default elevation sort function. The function should take two nodes and return -1, 0 or 1.  */
  elevationSortFunction?: (node1: TreeViewNode, node2: TreeViewNode) => number;
  /** Optional function to replace the default sort function. The function should take two nodes and return -1, 0 or 1.  */
  defaultSortFunction?: (node1: TreeViewNode, node2: TreeViewNode) => number;
};

/**
 * A {@link Viewer} plugin that provides an HTML tree view to navigate the IFC elements in models.
 */
export declare class TreeViewPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {TreeViewPluginConfiguration} cfg Plugin configuration.
   */
  constructor(viewer: Viewer, cfg: TreeViewPluginConfiguration);

  /**
   * Sets how the nodes are organized within this tree view.
   *
   * Default value is "containment".
   *
   * @type {String}
   */
  set hierarchy(arg: "containment" | "storeys" | "types");

  /**
   * Gets how the nodes are organized within this tree view.
   *
   * @type {String}
   */
  get hierarchy(): "containment" | "storeys" | "types";

  /**
   * Adds a model to this tree view.
   *
   * The model will be automatically removed when destroyed.
   *
   * To automatically add each model as it's created, instead of manually calling this method each time,
   * provide a ````autoAddModels: true```` to the TreeViewPlugin constructor.
   *
   * @param {String} modelId ID of a model {@link Entity} in {@link Scene.models}.
   * @param {Object} [options] Options for model in the tree view.
   * @param {String} [options.rootName] Optional display name for the root node. Ordinary, for "containment"
   * and "storeys" hierarchy types, the tree would derive the root node name from the model's "IfcProject" element
   * name. This option allows to override that name when it is not suitable as a display name.
   */
  addModel(modelId: string, options?: {
    rootName?: string;
  }): void;

  /**
   * Removes a model from this tree view.
   *
   * Does nothing if model not currently in tree view.
   *
   * @param {String} modelId ID of a model {@link Entity} in {@link Scene.models}.
   */
  removeModel(modelId: string): void;

  /**
   * Highlights the tree view node that represents the given object {@link Entity}.
   *
   * This causes the tree view to collapse, then expand to reveal the node, then highlight the node.
   *
   * If a node is previously highlighted, de-highlights that node and collapses the tree first.
   *
   * Note that if the TreeViewPlugin was configured with ````pruneEmptyNodes: true```` (default configuration), then the
   * node won't exist in the tree if it has no Entitys in the {@link Scene}. in that case, nothing will happen.
   *
   * Within the DOM, the node is represented by an ````<li>```` element. This method will add a ````.highlighted-node```` class to
   * the element to make it appear highlighted, removing that class when de-highlighting it again. See the CSS rules
   * in the TreeViewPlugin examples for an example of that class.
   *
   * @param {String} objectId ID of the {@link Entity}.
   */
  showNode(objectId: string): void;

  /**
   * De-highlights the node previously shown with {@link TreeViewPlugin.showNode}.
   *
   * Does nothing if no node is currently shown.
   *
   * If the node is currently scrolled into view, keeps the node in view.
   */
  unShowNode(): void;

  /**
   * Expands the tree to the given depth.
   *
   * Collapses the tree first.
   *
   * @param {Number} depth Depth to expand to.
   */
  expandToDepth(depth: number): void;


  /**
   * Closes all the nodes in the tree.
   */
  collapse(): void;

  /**
   * Iterates over a subtree of the tree view's {@link TreeViewNode}s, calling the given callback for each
   * node in depth-first pre-order.
   *
   * @param {TreeViewNode} node Root of the subtree.
   * @param {Function} callback Callback called at each {@link TreeViewNode}, with the TreeViewNode given as the argument.
   */
  withNodeTree(node: TreeViewNode, callback: (node: TreeViewNode) => void): void;

  /**
   * Destroys this TreeViewPlugin.
   */
  destroy(): void;

  /**
   * Fires on right click to show contextmenu.
   * @param {String} event The contextmenu event
   * @param {Function} callback Callback fired on the event
  */
  on(event: "contextmenu", callback: (data: { event: MouseEvent, viewer: Viewer, treeViewPlugin: TreeViewPlugin, treeViewNode: TreeViewNode }) => void): void;

  /**
   * Fires when an title is clicked.
   * @param {String} event The nodeTitleClicked event
   * @param {Function} callback Callback fired on the event
  */
  on(event: "nodeTitleClicked", callback: (data: { event: MouseEvent, viewer: Viewer, treeViewPlugin: TreeViewPlugin, treeViewNode: TreeViewNode }) => void): void;
}
