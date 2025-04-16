import { Plugin } from "../../viewer/Plugin.js";
import { RenderService } from "./RenderService.js";

const treeViews = [];

/**
 * @desc A {@link Viewer} plugin that provides an HTML tree view to navigate the IFC elements in models.
 * <br>
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/index.html#BIMOffline_XKT_WestRiverSideHospital" style="border: 1px solid black;"><img src="http://xeokit.io/img/docs/TreeViewPlugin/TreeViewPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#BIMOffline_XKT_WestRiverSideHospital)]
 *
 * ## Overview
 *
 * * A fast HTML tree view, with zero external dependencies, that works with huge numbers of objects.
 * * Each tree node has a checkbox to control the visibility of its object.
 * * Has three hierarchy modes: "containment", "types" and "storeys".
 * * Automatically contains all models (that have metadata) that are currently in the {@link Scene}.
 * * Sorts tree nodes by default - spatially, from top-to-bottom for ````IfcBuildingStorey```` nodes, and alphanumerically for other nodes.
 * * Allows custom CSS styling.
 * * Use {@link ContextMenu} to create a context menu for the tree nodes.
 *
 * ## Credits
 *
 * TreeViewPlugin is based on techniques described in [*Super Fast Tree View in JavaScript*](https://chrissmith.xyz/super-fast-tree-view-in-javascript/) by [Chris Smith](https://twitter.com/chris22smith).
 *
 * ## Usage
 *
 * In the example below, we'll add a TreeViewPlugin which, by default, will automatically show the structural
 * hierarchy of the IFC elements in each model we load.
 *
 * Then we'll use an {@link XKTLoaderPlugin} to load the Schependomlaan model from an
 * [.xkt file](https://github.com/xeokit/xeokit-sdk/tree/master/examples/models/xkt/schependomlaan).
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/navigation/#TreeViewPlugin_Containment)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, TreeViewPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * const treeView = new TreeViewPlugin(viewer, {
 *     containerElement: document.getElementById("myTreeViewContainer")
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/Schependomlaan.xkt",
 *     edges: true
 * });
 * ````
 *
 * ## Manually Adding Models
 *
 * Instead of adding models automatically, we can control which models appear in our TreeViewPlugin by adding them manually.
 *
 * In the next example, we'll configure the TreeViewPlugin to not add models automatically. Then, once the model
 * has loaded, we'll add it manually using {@link TreeViewPlugin#addModel}.
 *
 * ````javascript
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("myTreeViewContainer"),
 *      autoAddModels: false  // <<---------------- Don't auto-add models
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/Schependomlaan.xkt",
 *     edges: true
 * });
 *
 * model.on("loaded", () => {
 *      treeView.addModel(model.id);
 * });
 * ````
 *
 * Adding models manually also allows us to set some options for the model. For example, the ````rootName```` option allows us to provide a custom name for
 * the root node, which is sometimes desirable when the model's "IfcProject" element's name is not suitable:
 *
 * ````javascript
 * model.on("loaded", () => {
 *      treeView.addModel(model.id, {
 *          rootName: "Schependomlaan Model"
 *      });
 * });
 * ````
 *
 * ## Initially Expanding the Hierarchy
 *
 * We can also configure TreeViewPlugin to initially expand each model's nodes to a given depth.
 *
 * Let's automatically expand the first three nodes from the root, for every model added:
 *
 * ````javascript
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("myTreeViewContainer"),
 *      autoExpandDepth: 3
 * });
 * ````
 *
 * ## Showing a Node by ID
 *
 * We can show a given node using its ID. This causes the TreeViewPlugin to collapse, then expand and scroll the node into view, then highlight the node.
 *
 * See the documentation for the {@link TreeViewPlugin#showNode} method for more information, including how to define a custom highlighted appearance for the node using CSS.
 *
 * Let's make the TreeViewPlugin show the node corresponding to whatever object {@link Entity} that we pick:
 *
 * ````javascript
 * viewer.cameraControl.on("picked", function (e) {
 *     var objectId = e.entity.id;
 *     treeView.showNode(objectId);
 * });
 * ````
 *
 * This will de-highlight any node that was previously shown by this method.
 *
 * Note that this method only works if the picked {@link Entity} is an object that belongs to a model that's represented in the TreeViewPlugin.
 *
 * ## Customizing Appearance
 *
 * We can customize the appearance of our TreeViewPlugin by defining custom CSS for its HTML
 * elements. See our example's [source code](https://github.com/xeokit/xeokit-sdk/blob/master/examples/BIMOffline_XKT_Schependomlaan.html)
 * for an example of custom CSS rules.
 *
 * ## Model Hierarchies
 *
 * TreeViewPlugin has three hierarchies for organizing its nodes:
 *
 * * "containment" - organizes the tree nodes to indicate the containment hierarchy of the {@link MetaObject}s.
 * * "types" - groups nodes by their IFC types.
 * * "storeys" - groups nodes within their ````IfcBuildingStoreys````, and sub-groups them by their IFC types.
 *
 * <br>
 * The table below shows what the hierarchies look like:
 * <br>
 *
 * | 1. Containment Hierarchy | 2. Types Hierarchy | 3. Storeys Hierarchy |
 * |---|---|---|
 * | <img src="http://xeokit.io/img/docs/TreeViewPlugin/structureMode.png"> | <img src="http://xeokit.io/img/docs/TreeViewPlugin/typesMode.png"> | <img src="http://xeokit.io/img/docs/TreeViewPlugin/storeysMode.png"> |
 * <br>
 *
 * Let's create a TreeViewPlugin that groups nodes by their building stories and IFC types:
 *
 * ````javascript
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("myTreeViewContainer"),
 *      hierarchy: "stories"
 * });
 * ````
 *
 * ## Sorting Nodes
 *
 * TreeViewPlugin sorts its tree nodes by default. For a "storeys" hierarchy, it orders ````IfcBuildingStorey```` nodes
 * spatially, with the node for the highest story at the top, down to the lowest at the bottom.
 *
 * For all the hierarchy types ("containment", "classes" and "storeys"), TreeViewPlugin sorts the other node types
 * alphanumerically on their titles.
 *
 * If for some reason you need to prevent sorting, create your TreeViewPlugin with the option disabled, like so:
 *
 * ````javascript
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("myTreeViewContainer"),
 *      hierarchy: "stories",
 *      sortNodes: false // <<------ Disable node sorting
 * });
 * ````
 *
 * Note that, for all hierarchy modes, node sorting is only done for each model at the time that it is added to the TreeViewPlugin, and will not
 * update dynamically if we later transform the {@link Entity}s corresponding to the nodes.
 *
 * ## Pruning empty nodes
 *
 * Sometimes a model contains subtrees of objects that don't have any geometry. These are models whose
 * {@link MetaModel} contains trees of {@link MetaObject}s that don't have any {@link Entity}s in the {@link Scene}.
 *
 * For these models, the tree view would contain nodes that don't do anything in the Scene when we interact with them,
 * which is undesirable.
 *
 * By default, TreeViewPlugin will not create nodes for those objects. However, we can override that behaviour if we want
 * to have nodes for those objects (perhaps for debugging the model):
 *
 * ````javascript
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("myTreeViewContainer"),
 *      hierarchy: "stories",
 *      pruneEmptyNodes: false // <<------ Create nodes for object subtrees without geometry
 * });
 * ````
 *
 * ## Context Menu
 *
 * TreeViewPlugin fires a "contextmenu" event whenever we right-click on a tree node.
 *
 * The event contains:
 *
 * * ````event```` - the original [contextmenu](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
 * * ````viewer```` - the {@link Viewer}
 * * ````treeViewPlugin```` - the TreeViewPlugin
 * * ````treeViewNode```` - the {@link TreeViewNode} representing the tree node
 *<br><br>
 *
 * Let's use {@link ContextMenu} to show a simple context menu for the node we clicked.
 *
 * [[Run an example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_Canvas_TreeViewPlugin_Custom)]
 *
 * ````javascript
 * import {ContextMenu} from "../src/extras/ContextMenu/ContextMenu.js";
 *
 * const treeViewContextMenu = new ContextMenu({
 *     items: [
 *         [
 *             [
 *                 {
 *                     title: "Hide",
 *                     doAction: function (context) {
 *                         context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
 *                             if (treeViewNode.objectId) {
 *                                 const entity = context.viewer.scene.objects[treeViewNode.objectId];
 *                                 if (entity) {
 *                                     entity.visible = false;
 *                                 }
 *                             }
 *                         });
 *                     }
 *                 },
 *                 {
 *                     title: "Hide all",
 *                     doAction: function (context) {
 *                         context.viewer.scene.setObjectsVisible(context.viewer.scene.visibleObjectIds, false);
 *                     }
 *                 }
 *             ],
 *             [
 *                 {
 *                     title: "Show",
 *                     doAction: function (context) {
 *                         context.treeViewPlugin.withNodeTree(context.treeViewNode, (treeViewNode) => {
 *                             if (treeViewNode.objectId) {
 *                                 const entity = context.viewer.scene.objects[treeViewNode.objectId];
 *                                 if (entity) {
 *                                     entity.visible = true;
 *                                     entity.xrayed = false;
 *                                     entity.selected = false;
 *                                 }
 *                             }
 *                         });
 *                     }
 *                 },
 *                 {
 *                     title: "Show all",
 *                     doAction: function (context) {
 *                         const scene = context.viewer.scene;
 *                         scene.setObjectsVisible(scene.objectIds, true);
 *                         scene.setObjectsXRayed(scene.xrayedObjectIds, false);
 *                         scene.setObjectsSelected(scene.selectedObjectIds, false);
 *                     }
 *                 }
 *             ]
 *         ]
 *     ]
 * });
 *
 * treeView.on("contextmenu", (e) => {
 *
 *     const event = e.event;                           // MouseEvent
 *     const viewer = e.viewer;                         // Viewer
 *     const treeViewPlugin = e.treeViewPlugin;         // TreeViewPlugin
 *     const treeViewNode = e.treeViewNode;             // TreeViewNode
 *
 *     treeViewContextMenu.show(e.event.pageX, e.event.pageY);
 *
 *     treeViewContextMenu.context = {
 *         viewer: e.viewer,
 *         treeViewPlugin: e.treeViewPlugin,
 *         treeViewNode: e.treeViewNode
 *     };
 * });
 * ````
 *
 * ## Clicking Node Titles
 *
 * TreeViewPlugin fires a "nodeTitleClicked" event whenever we left-click on a tree node.
 *
 * Like the "contextmenu" event, this event contains:
 *
 * * ````event```` - the original [click](https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event) [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
 * * ````viewer```` - the {@link Viewer}
 * * ````treeViewPlugin```` - the TreeViewPlugin
 * * ````treeViewNode```` - the {@link TreeViewNode} representing the tree node
 *<br><br>
 *
 * Let's register a callback to isolate and fit-to-view the {@link Entity}(s) represented by the node. This callback is
 * going to X-ray all the other Entitys, fly the camera to fit the Entity(s) for the clicked node, then hide the other Entitys.
 *
 * [[Run an example](https://xeokit.github.io/xeokit-sdk/examples/index.html#ContextMenu_Canvas_TreeViewPlugin_Custom)]
 *
 * ````javascript
 * treeView.on("nodeTitleClicked", (e) => {
 *     const scene = viewer.scene;
 *     const objectIds = [];
 *     e.treeViewPlugin.withNodeTree(e.treeViewNode, (treeViewNode) => {
 *         if (treeViewNode.objectId) {
 *             objectIds.push(treeViewNode.objectId);
 *         }
 *     });
 *     scene.setObjectsXRayed(scene.objectIds, true);
 *     scene.setObjectsVisible(scene.objectIds, true);
 *     scene.setObjectsXRayed(objectIds, false);
 *     viewer.cameraFlight.flyTo({
 *         aabb: scene.getAABB(objectIds),
 *         duration: 0.5
 *     }, () => {
 *         setTimeout(function () {
 *             scene.setObjectsVisible(scene.xrayedObjectIds, false);
 *             scene.setObjectsXRayed(scene.xrayedObjectIds, false);
 *         }, 500);
 *     });
 * });
 * ````
 *
 * To make the cursor change to a pointer when we hover over the node titles, and also to make the titles change to blue, we'll also define this CSS for the ````<span>```` elements
 * that represent the titles of our TreeViewPlugin nodes:
 *
 * ````css
 * #treeViewContainer ul li span:hover {
 *      color: blue;
 *      cursor: pointer;
 * }
 * ````
 *
 * @class TreeViewPlugin
 */
export class TreeViewPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {*} cfg Plugin configuration.
     * @param {String} [cfg.containerElementId]  ID of an existing HTML element to contain the TreeViewPlugin - either this or containerElement is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLElement} cfg.containerElement DOM element to contain the TreeViewPlugin.
     * @param {Boolean} [cfg.autoAddModels=true] When ````true```` (default), will automatically add each model as it's created. Set this ````false```` if you want to manually add models using {@link TreeViewPlugin#addModel} instead.
     * @param {Number} [cfg.autoExpandDepth] Optional depth to which to initially expand the tree.
     * @param {String} [cfg.hierarchy="containment"] How to organize the tree nodes: "containment", "storeys" or "types". See the class documentation for details.
     * @param {Boolean} [cfg.sortNodes=true] When true, will sort the children of each node. For a "storeys" hierarchy, the
     * ````IfcBuildingStorey```` nodes will be ordered spatially, from the highest storey down to the lowest, on the
     * vertical World axis. For all hierarchy types, other node types will be ordered in the ascending alphanumeric order of their titles.
     * @param {Boolean} [cfg.pruneEmptyNodes=true] When true, will not contain nodes that don't have content in the {@link Scene}. These are nodes whose {@link MetaObject}s don't have {@link Entity}s.
     * @param {RenderService} [cfg.renderService] Optional {@link RenderService} to use. Defaults to the {@link TreeViewPlugin}'s default {@link RenderService}.
     * @param {Boolean} [cfg.showIndeterminate=false] When true, will show indeterminate state for checkboxes when some but not all child nodes are checked
     * @param {Boolean} [cfg.showProjectNode=false] When true, will show top level project node when hierarchy is set to "storeys"
     * @param {Function} [cfg.elevationSortFunction] Optional function to replace the default elevation sort function. The function should take two nodes and return -1, 0 or 1. 
     * @param {Function} [cfg.defaultSortFunction] Optional function to replace the default sort function. The function should take two nodes and return -1, 0 or 1.
     */
    constructor(viewer, cfg = {}) {

        super("TreeViewPlugin", viewer);

        /**
         * Contains messages for any errors found while last rebuilding this TreeView.
         * @type {String[]}
         */
        this.errors = [];

        /**
         * True if errors were found generating this TreeView.
         * @type {boolean}
         */
        this.valid = true;

        const containerElement = cfg.containerElement || document.getElementById(cfg.containerElementId);

        if (!(containerElement instanceof HTMLElement)) {
            this.error("Mandatory config expected: valid containerElementId or containerElement");
            return;
        }

        for (let i = 0; ; i++) {
            if (!treeViews[i]) {
                treeViews[i] = this;
                this._index = i;
                this._id = `tree-${i}`;
                break;
            }
        }


        this._containerElement = containerElement;
        this._metaModels = {};
        this._autoAddModels = (cfg.autoAddModels !== false);
        this._autoExpandDepth = (cfg.autoExpandDepth || 0);
        this._sortNodes = (cfg.sortNodes !== false);
        this._viewer = viewer;
        this._rootElement = null;
        this._muteSceneEvents = false;
        this._muteTreeEvents = false;
        this._rootNodes = [];
        this._objectNodes = {}; // Object ID -> Node
        this._nodeNodes = {}; // Node ID -> Node
        this._rootNames = {}; // Node ID -> Root name
        this._sortNodes = cfg.sortNodes;
        this._pruneEmptyNodes = cfg.pruneEmptyNodes;
        this._showListItemElementId = null;
        this._renderService = cfg.renderService || new RenderService(this._containerElement);
        this._showIndeterminate = cfg.showIndeterminate ?? false;
        this._showProjectNode = cfg.showProjectNode ?? false;
        this._elevationSortFunction = cfg.elevationSortFunction ?? undefined;
        this._defaultSortFunction = cfg.defaultSortFunction ?? undefined;

        if (!this._renderService) {
            throw new Error('TreeViewPlugin: no render service set');
        }

        this._containerElement.oncontextmenu = (e) => {
            e.preventDefault();
        };

        this._onObjectVisibility = this._viewer.scene.on("objectVisibility", (entity) => {
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const node = this._objectNodes[objectId];
            if (!node) {
                return; // Not in this tree
            }
            const visible = entity.visible;
            const updated = (visible !== node.checked);
            if (!updated) {
                return;
            }
            this._muteTreeEvents = true;
            node.checked = visible;
            if (visible) {
                node.numVisibleEntities++;
            } else {
                node.numVisibleEntities--;
            }

            this._renderService.setCheckbox(node.nodeId, visible);

            let parent = node.parent;
            while (parent) {
                parent.checked = visible;
                if (visible) {
                    parent.numVisibleEntities++;
                } else {
                    parent.numVisibleEntities--;
                }
                const indeterminate = this._showIndeterminate 
                  && parent.numVisibleEntities > 0 
                  && parent.numVisibleEntities < parent.numEntities;
                parent.checked = parent.numVisibleEntities > 0;
                this._renderService.setCheckbox(parent.nodeId, parent.checked, indeterminate);

                parent = parent.parent;
            }

            this._muteTreeEvents = false;
        });

        this._onObjectXrayed = this._viewer.scene.on('objectXRayed', (entity) => {
            if (this._muteSceneEvents) {
                return;
            }
            const objectId = entity.id;
            const node = this._objectNodes[objectId];
            if (!node) {
                return; // Not in this tree
            }
            this._muteTreeEvents = true;
            const xrayed = entity.xrayed;
            const updated = (xrayed !== node.xrayed);
            if (!updated) {
                return;
            }
            node.xrayed = xrayed;

            this._renderService.setXRayed(node.nodeId, xrayed);
            this._muteTreeEvents = false;
        });

        this._switchExpandHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._expandSwitchElement(switchElement);
        };

        this._switchCollapseHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const switchElement = event.target;
            this._collapseSwitchElement(switchElement);
        };

        this._checkboxChangeHandler = (event) => {
            if (this._muteTreeEvents) {
                return;
            }
            this._muteSceneEvents = true;
            const checkbox = event.target;
            const visible = this._renderService.isChecked(checkbox);
            const nodeId = this._renderService.getIdFromCheckbox(checkbox);

            const checkedNode = this._nodeNodes[nodeId];
            const objects = this._viewer.scene.objects;
            let numUpdated = 0;
            
            this._withNodeTree(checkedNode, (node) => {
                const objectId = node.objectId;
                const entity = objects[objectId];
                const isLeaf = (node.children.length === 0);
                node.numVisibleEntities = visible ? node.numEntities : 0;
                if (isLeaf && (visible !== node.checked)) {
                    numUpdated++;
                }
                node.checked = visible;

                this._renderService.setCheckbox(node.nodeId, visible);
                
                if (entity) {
                    entity.visible = visible;
                }
            });

            let parent = checkedNode.parent;
            while (parent) {
                
                if (visible) {
                    parent.numVisibleEntities += numUpdated;
                } else {
                    parent.numVisibleEntities -= numUpdated;
                }
                const indeterminate = this._showIndeterminate 
                  && parent.numVisibleEntities > 0 
                  && parent.numVisibleEntities < parent.numEntities;
                parent.checked = parent.numVisibleEntities > 0;
                this._renderService.setCheckbox(parent.nodeId, parent.checked, indeterminate);
                
                parent = parent.parent;
            }
            this._muteSceneEvents = false;
        };

        this._hierarchy = cfg.hierarchy || "containment";
        this._autoExpandDepth = cfg.autoExpandDepth || 0;

        if (this._autoAddModels) {
            const modelIds = Object.keys(this.viewer.metaScene.metaModels);
            for (let i = 0, len = modelIds.length; i < len; i++) {
                const modelId = modelIds[i];
                const metaModel = this.viewer.metaScene.metaModels[modelId];
                if (metaModel.finalized) {
                    this.addModel(modelId);
                }
            }
            this.viewer.scene.on("modelLoaded", (modelId) => {
                if (this.viewer.metaScene.metaModels[modelId]) {
                    this.addModel(modelId);
                }
            });
        }

        this.hierarchy = cfg.hierarchy;
    }

    /**
     * Sets how the nodes are organized within this tree view.
     *
     * Accepted values are:
     *
     * * "containment" - organizes the nodes to indicate the containment hierarchy of the IFC objects.
     * * "types" - groups the nodes within their IFC types.
     * * "storeys" - groups the nodes within ````IfcBuildingStoreys```` and sub-groups them by their IFC types.
     *
     * <br>
     * This can be updated dynamically.
     *
     * Default value is "containment".
     *
     * @type {String}
     */
    set hierarchy(hierarchy) {
        hierarchy = hierarchy || "containment";
        if (hierarchy !== "containment" && hierarchy !== "storeys" && hierarchy !== "types") {
            this.error("Unsupported value for `hierarchy' - defaulting to 'containment'");
            hierarchy = "containment";
        }
        if (this._hierarchy === hierarchy) {
            return;
        }
        this._hierarchy = hierarchy;
        this._createNodes();
    }

    /**
     * Gets how the nodes are organized within this tree view.
     *
     * @type {String}
     */
    get hierarchy() {
        return this._hierarchy;
    }

    /**
     * Adds a model to this tree view.
     *
     * The model will be automatically removed when destroyed.
     *
     * To automatically add each model as it's created, instead of manually calling this method each time,
     * provide a ````autoAddModels: true```` to the TreeViewPlugin constructor.
     *
     * @param {String} modelId ID of a model {@link Entity} in {@link Scene#models}.
     * @param {Object} [options] Options for model in the tree view.
     * @param {String} [options.rootName] Optional display name for the root node. Ordinary, for "containment"
     * and "storeys" hierarchy types, the tree would derive the root node name from the model's "IfcProject" element
     * name. This option allows to override that name when it is not suitable as a display name.
     */
    addModel(modelId, options = {}) {
        if (!this._containerElement) {
            return;
        }
        const model = this.viewer.scene.models[modelId];
        if (!model) {
            throw "Model not found: " + modelId;
        }
        const metaModel = this.viewer.metaScene.metaModels[modelId];
        if (!metaModel) {
            this.error("MetaModel not found: " + modelId);
            return;
        }
        if (this._metaModels[modelId]) {
            this.warn("Model already added: " + modelId);
            return;
        }
        this._metaModels[modelId] = metaModel;

        if (options && options.rootName) {
            this._rootNames[modelId] = options.rootName;
        }
        
        model.on("destroyed", () => {
            this.removeModel(model.id);
        });
        this._createNodes();
    }

    /**
     * Removes a model from this tree view.
     *
     * Does nothing if model not currently in tree view.
     *
     * @param {String} modelId ID of a model {@link Entity} in {@link Scene#models}.
     */
    removeModel(modelId) {
        if (!this._containerElement) {
            return;
        }
        const metaModel = this._metaModels[modelId];
        if (!metaModel) {
            return;
        }

        if (this._rootNames[modelId]) {
            delete this._rootNames[modelId];
        }

        delete this._metaModels[modelId];
        this._createNodes();
    }

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
    showNode(objectId) {
        this.unShowNode();

        const node = this._objectNodes[objectId];
        if (!node) {
            return; // Node may not exist for the given object if (this._pruneEmptyNodes == true)
        }

        this.collapse();

        const nodeId = node.nodeId;

        const switchElement = this._renderService.getSwitchElement(nodeId);
        if (switchElement) {
            this._expandSwitchElement(switchElement);
            switchElement.scrollIntoView();
            return true;
        }
        
        const path = [];
        path.unshift(node);
        let parent = node.parent;
        while (parent) {
            path.unshift(parent);
            parent = parent.parent;
        }

        for (let i = 0, len = path.length; i < len; i++) {
            const switchElement = this._renderService.getSwitchElement(path[i].nodeId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
            }
        }

        this._renderService.setHighlighted(nodeId, true);

        this._showListItemElementId = nodeId;
    }

    /**
     * De-highlights the node previously shown with {@link TreeViewPlugin#showNode}.
     *
     * Does nothing if no node is currently shown.
     *
     * If the node is currently scrolled into view, keeps the node in view.
     */
    unShowNode() {
        if (!this._showListItemElementId) {
            return;
        }

        this._renderService.setHighlighted(this._showListItemElementId, false)
        
        this._showListItemElementId = null;
    }

    /**
     * Expands the tree to the given depth.
     *
     * Collapses the tree first.
     *
     * @param {Number} depth Depth to expand to.
     */
    expandToDepth(depth) {
        this.collapse();
        const expand = (node, countDepth) => {
            if (countDepth === depth) {
                return;
            }

            const switchElement = this._renderService.getSwitchElement(node.nodeId);
            if (switchElement) {
                this._expandSwitchElement(switchElement);
                const childNodes = node.children;
                for (var i = 0, len = childNodes.length; i < len; i++) {
                    const childNode = childNodes[i];
                    expand(childNode, countDepth + 1);
                }
            }
        };
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            expand(rootNode, 0);
        }
    }

    /**
     * Closes all the nodes in the tree.
     */
    collapse() {
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            const nodeId = rootNode.nodeId;
            this._collapseNode(nodeId);
        }
    }

    /**
     * Iterates over a subtree of the tree view's {@link TreeViewNode}s, calling the given callback for each
     * node in depth-first pre-order.
     *
     * @param {TreeViewNode} node Root of the subtree.
     * @param {Function} callback Callback called at each {@link TreeViewNode}, with the TreeViewNode given as the argument.
     */
    withNodeTree(node, callback) {
        callback(node);
        const children = node.children;
        if (!children) {
            return;
        }
        for (let i = 0, len = children.length; i < len; i++) {
            this.withNodeTree(children[i], callback);
        }
    }

    /**
     * Destroys this TreeViewPlugin.
     */
    destroy() {
        if (!this._containerElement) {
            return;
        }
        this._metaModels = {};
        if (this._rootElement && !this._destroyed) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._viewer.scene.off(this._onObjectVisibility);
            this._destroyed = true;
        }
        delete treeViews[this._index];
        super.destroy();
    }

    _createNodes() {
        if (this._rootElement) {
            this._rootElement.parentNode.removeChild(this._rootElement);
            this._rootElement = null;
        }

        this._rootNodes = [];
        this._objectNodes = {};
        this._nodeNodes = {};
        this._validate();
        if (this.valid || (this._hierarchy !== "storeys")) {
            this._createEnabledNodes();
        } else {
            this._createDisabledNodes();
        }
    }

    _validate() {
        this.errors = [];
        switch (this._hierarchy) {
            case "storeys":
                this.valid = this._validateMetaModelForStoreysHierarchy();
                break;
            case "types":
                this.valid = (this._rootNodes.length > 0);
                break;
            case "containment":
            default:
                this.valid = (this._rootNodes.length > 0);
                break;
        }
        return this.valid;
    }

    _validateMetaModelForStoreysHierarchy(level = 0, ctx, buildingNode) {
        // ctx = ctx || {
        //     foundIFCBuildingStoreys: false
        // };
        // const metaObjectType = metaObject.type;
        // const children = metaObject.children;
        // if (metaObjectType === "IfcBuilding") {
        //     buildingNode = true;
        // } else if (metaObjectType === "IfcBuildingStorey") {
        //     if (!buildingNode) {
        //         errors.push("Can't build storeys hierarchy: IfcBuildingStorey found without parent IfcBuilding");
        //         return false;
        //     }
        //     ctx.foundIFCBuildingStoreys = true;
        // }
        // if (children) {
        //     for (let i = 0, len = children.length; i < len; i++) {
        //         const childMetaObject = children[i];
        //         if (!this._validateMetaModelForStoreysHierarchy(childMetaObject, errors, level + 1, ctx, buildingNode)) {
        //             return false;
        //         }
        //     }
        // }
        // if (level === 0) {
        //     if (!ctx.foundIFCBuildingStoreys) {
        //         // errors.push("Can't build storeys hierarchy: no IfcBuildingStoreys found");
        //     }
        // }
        return true;
    }

    _createEnabledNodes() {
        if (this._pruneEmptyNodes) {
            this._findEmptyNodes();
        }
        switch (this._hierarchy) {
            case "storeys":
                this._createStoreysNodes();
                if (this._rootNodes.length === 0) {
                    this.error("Failed to build storeys hierarchy");
                }
                break;
            case "types":
                this._createTypesNodes();
                break;
            case "containment":
            default:
                this._createContainmentNodes();
        }
        if (this._sortNodes) {
            this._doSortNodes();
        }
        this._synchNodesToEntities();
        this._createTrees();
        this.expandToDepth(this._autoExpandDepth);
    }

    _createDisabledNodes() {

        const rootNode = this._renderService.createRootNode();
        this._rootElement = rootNode;
        this._containerElement.appendChild(rootNode);

        const rootMetaObjects = this._viewer.metaScene.rootMetaObjects;

        for (let objectId in rootMetaObjects) {
            const rootMetaObject = rootMetaObjects[objectId];
            const metaObjectType = rootMetaObject.type;
            const metaObjectName = rootMetaObject.name;
            const rootName = ((metaObjectName && metaObjectName !== ""
                && metaObjectName !== "Undefined"
                && metaObjectName !== "Default") ? metaObjectName : metaObjectType);

            const childNode = this._renderService.createDisabledNodeElement(rootName);
            rootNode.appendChild(childNode);
        }
    }


    _findEmptyNodes() {
        const rootMetaObjects = this._viewer.metaScene.rootMetaObjects;
        for (let objectId in rootMetaObjects) {
            this._findEmptyNodes2(rootMetaObjects[objectId]);
        }
    }

    _findEmptyNodes2(metaObject, countEntities = 0) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const children = metaObject.children;
        const objectId = metaObject.id;
        const entity = scene.objects[objectId];
        metaObject._countEntities = 0;
        if (entity) {
            metaObject._countEntities++;
        }
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                childMetaObject._countEntities = this._findEmptyNodes2(childMetaObject);
                metaObject._countEntities += childMetaObject._countEntities;
            }
        }
        return metaObject._countEntities;
    }

    _createStoreysNodes() {
        const rootMetaObjects = this._viewer.metaScene.rootMetaObjects;
        for (let id in rootMetaObjects) {
            this._createStoreysNodes2(rootMetaObjects[id], null, null, null, null);
        }
    }

    _createStoreysNodes2(metaObject, projectNode, buildingNode, storeyNode, typeNodes) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        const children = metaObject.children;
        const objectId = metaObject.id;

        if (this._showProjectNode && metaObjectType === 'IfcProject') {
            projectNode = {
                nodeId: `${this._id}-${objectId}`,
                objectId,
                title: (metaObject.metaModels.length === 0) ? metaObjectName : this._rootNames[metaObject.metaModels[0].id] || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                xrayed: false,
                children: [],
            };
            this._rootNodes.push(projectNode);
            this._objectNodes[projectNode.objectId] = projectNode;
            this._nodeNodes[projectNode.nodeId] = projectNode;
        } else if (metaObjectType === "IfcBuilding") {
            buildingNode = {
                nodeId: `${this._id}-${objectId}`,
                objectId: objectId,
                title: (metaObject.metaModels.length === 0) ? metaObjectName : this._rootNames[metaObject.metaModels[0].id] || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: projectNode,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                xrayed: false,
                children: []
            };
            if (projectNode) {
                projectNode.children.push(buildingNode);
            } else {
                this._rootNodes.push(buildingNode);
            }
            this._objectNodes[buildingNode.objectId] = buildingNode;
            this._nodeNodes[buildingNode.nodeId] = buildingNode;
        } else if (metaObjectType === "IfcBuildingStorey") {
            if (!buildingNode) {
                this.error("Failed to build storeys hierarchy for model - model does not have an IfcBuilding object, or is not an IFC model");
                return;
            }
            storeyNode = {
                nodeId: `${this._id}-${objectId}`,
                objectId: objectId,
                title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                type: metaObjectType,
                parent: buildingNode,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                xrayed: false,
                children: []
            };
            buildingNode.children.push(storeyNode);
            this._objectNodes[storeyNode.objectId] = storeyNode;
            this._nodeNodes[storeyNode.nodeId] = storeyNode;
            typeNodes = {};
        } else {
            if (storeyNode) {
                const objects = this._viewer.scene.objects;
                const object = objects[objectId];
                if (object) {
                    typeNodes = typeNodes || {};
                    let typeNode = typeNodes[metaObjectType];
                    if (!typeNode) {
                        typeNode = {
                            nodeId: `${this._id}-${storeyNode.objectId}-${metaObjectType}`,
                            objectId: `${storeyNode.objectId}-${metaObjectType}`,
                            title: metaObjectType,
                            type: metaObjectType,
                            parent: storeyNode,
                            numEntities: 0,
                            numVisibleEntities: 0,
                            checked: false,
                            xrayed: false,
                            children: []
                        };
                        storeyNode.children.push(typeNode);
                        this._objectNodes[typeNode.objectId] = typeNode;
                        this._nodeNodes[typeNode.nodeId] = typeNode;
                        typeNodes[metaObjectType] = typeNode;
                    }
                    const node = {
                        nodeId: `${this._id}-${objectId}`,
                        objectId: objectId,
                        title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                        type: metaObjectType,
                        parent: typeNode,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        xrayed: false,
                        children: []
                    };
                    typeNode.children.push(node);
                    this._objectNodes[node.objectId] = node;
                    this._nodeNodes[node.nodeId] = node;
                }
            }
        }
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createStoreysNodes2(childMetaObject, projectNode, buildingNode, storeyNode, typeNodes);
            }
        }
    }

    _createTypesNodes() {
        const rootMetaObjects = this._viewer.metaScene.rootMetaObjects;
        for (let id in rootMetaObjects) {
            this._createTypesNodes2(rootMetaObjects[id], null, null);
        }
    }

    _createTypesNodes2(metaObject, rootNode, typeNodes) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name;
        const children = metaObject.children;
        const objectId = metaObject.id;
        if (!metaObject.parent) {
            rootNode = {
                nodeId: `${this._id}-${objectId}`,
                objectId: objectId,
                title: metaObject.metaModels.length === 0 ? metaObjectName : this._rootNames[metaObject.metaModels[0].id] || ((metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType),
                type: metaObjectType,
                parent: null,
                numEntities: 0,
                numVisibleEntities: 0,
                checked: false,
                xrayed: false,
                children: []
            };
            this._rootNodes.push(rootNode);
            this._objectNodes[rootNode.objectId] = rootNode;
            this._nodeNodes[rootNode.nodeId] = rootNode;
            typeNodes = {};
        } else {
            if (rootNode) {
                const objects = this._viewer.scene.objects;
                const object = objects[objectId];
                if (object) {
                    let typeNode = typeNodes[metaObjectType];
                    if (!typeNode) {
                        typeNode = {
                            nodeId: `${this._id}-${rootNode.objectId}-${metaObjectType}`,
                            objectId: `${rootNode.objectId}-${metaObjectType}`,
                            title: metaObjectType,
                            type: metaObjectType,
                            parent: rootNode,
                            numEntities: 0,
                            numVisibleEntities: 0,
                            checked: false,
                            xrayed: false,
                            children: []
                        };
                        rootNode.children.push(typeNode);
                        this._objectNodes[typeNode.objectId] = typeNode;
                        this._nodeNodes[typeNode.nodeId] = typeNode;
                        typeNodes[metaObjectType] = typeNode;
                    }
                    const node = {
                        nodeId: `${this._id}-${objectId}`,
                        objectId: objectId,
                        title: (metaObjectName && metaObjectName !== "" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
                        type: metaObjectType,
                        parent: typeNode,
                        numEntities: 0,
                        numVisibleEntities: 0,
                        checked: false,
                        xrayed: false,
                        children: []
                    };
                    typeNode.children.push(node);
                    this._objectNodes[node.objectId] = node;
                    this._nodeNodes[node.nodeId] = node;
                }
            }
        }
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createTypesNodes2(childMetaObject, rootNode, typeNodes);
            }
        }
    }

    _createContainmentNodes() {
        const rootMetaObjects = this._viewer.metaScene.rootMetaObjects;
        for (let id in rootMetaObjects) {
            this._createContainmentNodes2(rootMetaObjects[id], null);
        }
    }

    _createContainmentNodes2(metaObject, parent) {
        if (this._pruneEmptyNodes && (metaObject._countEntities === 0)) {
            return;
        }
        const metaObjectType = metaObject.type;
        const metaObjectName = metaObject.name || metaObjectType;
        const children = metaObject.children;
        const objectId = metaObject.id;
        const node = {
            nodeId: `${this._id}-${objectId}`,
            objectId: objectId,
            title: (!parent) ? metaObject.metaModels.length === 0 ? metaObjectName : (this._rootNames[metaObject.metaModels[0].id] || metaObjectName) : (metaObjectName && metaObjectName !== "" && metaObjectName !== "Undefined" && metaObjectName !== "Default") ? metaObjectName : metaObjectType,
            type: metaObjectType,
            parent: parent,
            numEntities: 0,
            numVisibleEntities: 0,
            checked: false,
            xrayed: false,
            children: []
        };
        if (parent) {
            parent.children.push(node);
        } else {
            this._rootNodes.push(node);
        }
        this._objectNodes[node.objectId] = node;
        this._nodeNodes[node.nodeId] = node;
        if (children) {
            for (let i = 0, len = children.length; i < len; i++) {
                const childMetaObject = children[i];
                this._createContainmentNodes2(childMetaObject, node);
            }
        }
    }

    _doSortNodes() {
        for (let i = 0, len = this._rootNodes.length; i < len; i++) {
            const rootNode = this._rootNodes[i];
            this._sortChildren(rootNode);
        }
    }

    _sortChildren(node) {
        const children = node.children;
        if (!children || children.length === 0) {
            return;
        }
        const firstChild = children[0];
        if ((this._hierarchy === "storeys" || this._hierarchy === "containment") &&  firstChild.type === "IfcBuildingStorey") {
            if (this._elevationSortFunction) children.sort(this._elevationSortFunction);
            else children.sort(this._getSpatialSortFunc());
        } else {
            if (this._defaultSortFunction) children.sort(this._defaultSortFunction)
            else children.sort(this._alphaSortFunc);
        }
        for (let i = 0, len = children.length; i < len; i++) {
            const node = children[i];
            this._sortChildren(node);
        }
    }

    _getSpatialSortFunc() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        return this._spatialSortFunc || (this._spatialSortFunc = (storey1, storey2) => {
            let idx = 0;
            if (camera.xUp) {
                idx = 0;
            } else if (camera.yUp) {
                idx = 1;
            } else {
                idx = 2;
            }
            const metaScene = this.viewer.metaScene;
            const storey1MetaObject = metaScene.metaObjects[storey1.objectId];
            const storey2MetaObject = metaScene.metaObjects[storey2.objectId];

            if (storey1MetaObject && (storey1MetaObject.attributes && storey1MetaObject.attributes.elevation !== undefined) &&
                storey2MetaObject && (storey2MetaObject.attributes && storey2MetaObject.attributes.elevation !== undefined)) {
                const elevation1 = Number.parseFloat(storey1MetaObject.attributes.elevation);
                const elevation2 = Number.parseFloat(storey2MetaObject.attributes.elevation);
                if (elevation1 > elevation2) {
                    return -1;
                }
                if (elevation1 < elevation2) {
                    return 1;
                }
                return 0;
            } else {
                return 0;
            }
        });
    }

    _alphaSortFunc(node1, node2) {
        const title1 = node1.title.toUpperCase(); // FIXME: Should be case sensitive?
        const title2 = node2.title.toUpperCase();
        if (title1 < title2) {
            return -1;
        }
        if (title1 > title2) {
            return 1;
        }
        return 0;
    }

    _synchNodesToEntities() {
        const objectIds = Object.keys(this.viewer.metaScene.metaObjects);
        const metaObjects = this._viewer.metaScene.metaObjects;
        const objects = this._viewer.scene.objects;
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const metaObject = metaObjects[objectId];
            if (metaObject) {
                const node = this._objectNodes[objectId];
                if (node) {
                    const entity = objects[objectId];
                    if (entity) {
                        const visible = entity.visible;
                        node.numEntities = 1;
                        node.xrayed = entity.xrayed;
                        if (visible) {
                            node.numVisibleEntities = 1;
                            node.checked = true;
                        } else {
                            node.numVisibleEntities = 0;
                            node.checked = false;
                        }
                        let parent = node.parent; // Synch parents
                        while (parent) {
                            parent.numEntities++;
                            if (visible) {
                                parent.numVisibleEntities++;
                                parent.checked = true;
                            }
                            parent = parent.parent;
                        }
                    }
                }
            }
        }
    }

    _withNodeTree(node, callback) {
        callback(node);
        const children = node.children;
        if (!children) {
            return;
        }
        for (let i = 0, len = children.length; i < len; i++) {
            this._withNodeTree(children[i], callback);
        }
    }

    _createTrees() {
        if (this._rootNodes.length === 0) {
            return;
        }
        const rootNodeElements = this._rootNodes.map((rootNode) => {
            return this._createNodeElement(rootNode);
        });

        const rootNode = this._renderService.createRootNode();
        rootNodeElements.forEach((nodeElement) => {
            rootNode.appendChild(nodeElement);
        });

        this._containerElement.appendChild(rootNode);
        this._rootElement = rootNode;
    }

    _createNodeElement(node) {
        const contextmenuHandler = (event) =>{
                this.fire("contextmenu", {
                event: event,
                viewer: this._viewer,
                treeViewPlugin: this,
                treeViewNode: node
            });
            event.preventDefault();
        };
        const onclickHandler = (event) => {
            this.fire("nodeTitleClicked", {
                event: event,
                viewer: this._viewer,
                treeViewPlugin: this,
                treeViewNode: node
            });
            event.preventDefault();
        };

        return this._renderService.createNodeElement(node, this._switchExpandHandler, this._checkboxChangeHandler, contextmenuHandler, onclickHandler);
    }

    _expandSwitchElement(switchElement) {
        const expanded = this._renderService.isExpanded(switchElement); 
        if (expanded) {
            return;
        }

        const nodeId = this._renderService.getId(switchElement);

        const nodeElements = this._nodeNodes[nodeId].children.map((node) => {
            return this._createNodeElement(node);
        });

        this._renderService.addChildren(switchElement, nodeElements)

        this._renderService.expand(switchElement, this._switchExpandHandler, this._switchCollapseHandler);
    }

    _collapseNode(nodeId) {
        const switchElement = this._renderService.getSwitchElement(nodeId);
        this._collapseSwitchElement(switchElement);
    }

    _collapseSwitchElement(switchElement) {
        this._renderService.collapse(switchElement, this._switchExpandHandler, this._switchCollapseHandler);
    }
}

