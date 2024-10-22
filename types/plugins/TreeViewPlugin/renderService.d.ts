import { TreeViewNode } from "./TreeViewNode";
type genericHandler = (event: any) => void;

export declare interface ITreeViewRenderService {

  /**
   * Creates the root node element.
   */
  createRootNode(): HTMLElement;

  /**
   * Creates a tree node element.
   * 
   * @param node {TreeViewNode} The node.
   * @param expandHandler {genericHandler} The handler for expanding the node.
   * @param checkHandler {genericHandler} The handler for checking the node.
   * @param contextmenuHandler {genericHandler} The handler for the context menu.
   * @param titleClickHandler {genericHandler} The handler for the title click.
   * 
   * @returns {HTMLElement} The tree node element.
   */
  createNodeElement(node: TreeViewNode, expandHandler: genericHandler, checkHandler: genericHandler, contextmenuHandler: genericHandler, titleClickHandler: genericHandler): HTMLElement;

  /**
   * Creates a tree node element for a disabled node.
   *  
   * @param rootName {String} The root name.
   *
   * @returns {HTMLElement} The disabled node element.
   */
  createDisabledNodeElement(rootName: string): HTMLElement;

  /**
   * Adds the child nodes to the parent node.
   * 
   * @param element {HTMLElement} The node element.
   * @param nodes {Array<HTMLElement>} The children elements.
   */
  addChildren(element: HTMLElement, nodes: Array<HTMLElement>): void;

  /**
   * Expands a node, changes the icon and changes the handlers.
   * 
   * @param element {HTMLElement} The node element.
   * @param expandHandler {genericHandler} The handler for expanding the node.
   * @param collapseHandler {genericHandler} The handler for collapsing the node.
   */
  expand(element: HTMLElement, expandHandler: genericHandler, collapseHandler: genericHandler): void;

  /**
   * Collapses a node, changes the icon and changes the handlers.
   * 
   * @param element {HTMLElement} The node element.
   * @param expandHandler {genericHandler} The handler for expanding the node.
   * @param collapseHandler {genericHandler} The handler for collapsing the node.
   */
  collapse(element: HTMLElement, expandHandler: genericHandler, collapseHandler: genericHandler): void;

  /**
   * Returns whether the node is expanded.
   *
   * @param element {HTMLElement} The node element.
   *
   * @returns {Boolean} Whether the node is expanded.
   */
  isExpanded(element: HTMLElement): boolean;

  /**
   * Returns the node id from the treeview element.
   *
   * @param element {HTMLElement} The node element.
   *
   * @returns {String} The node id.
   */
  getId(element: HTMLElement): string | undefined;

  /**
   * Returns the node id from the checkbox element.
   *
   * @param element {HTMLElement} The node element.
   *
   * @returns {String} The node id.
   */
  getIdFromCheckbox(element: HTMLElement): string;

  /**
   * Returns the expand/collapse element.
   *
   * @param nodeId {String} The node id.
   *
   * @returns {HTMLElement} The expand/collapse element.
   */
  getSwitchElement(nodeId: string): HTMLElement | null;

  /**
   * Returns the node's checkbox state.
   * 
   * @param element {HTMLElement} The node element.
   *
   * @returns {Boolean} Whether the node is checked.
   */
  isChecked(element: HTMLElement): boolean;

  /**
   * Sets the node's checkbox state.
   * 
   * @param nodeId {String} The node id.
   * @param checked {Boolean} Whether the node is checked.
   */
  setCheckbox(nodeId: string, checked: boolean, indeterminate?: boolean): void;

  /**
   * Sets the node's xrayed state.
   * 
   * @param nodeId {String} The node is.
   * @param xrayed {Boolean} Whether the node is xrayed.
   */
  setXRayed(nodeId: string, xrayed: boolean): void;

  /**
   * Sets the node's highlight state.
   * When the node is highlighted, it will be expanded and scrolled into view. 
   *
   * @param nodeId {String} The node id.
   * @param highlighted {Boolean} Whether the node is highlighted.
   */
  setHighlighted(nodeId: string, highlighted: boolean): void;
}
