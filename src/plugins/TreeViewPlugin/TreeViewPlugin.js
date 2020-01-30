import {ModelTreeView} from "./ModelTreeView.js";
import {Plugin} from "../../viewer/Plugin.js";

/**
 * @desc A {@link Viewer} plugin that provides an HTML tree view to navigate the IFC elements in models.
 * <br>
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_WestRiverSideHospital" style="border: 1px solid black;"><img src="http://xeokit.io/img/docs/TreeViewPlugin/TreeViewPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_WestRiverSideHospital)]
 *
 * ## Overview
 *
 * * A fast HTML tree view, with zero external dependencies, that works with huge numbers of objects.
 * * Each tree node has a checkbox to control the visibility of its object.
 * * Has three hierarchy modes: "containment", "types" and "storeys".
 * * Automatically contains all models (that have metadata) that are currently in the {@link Scene}.
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
 * [.xkt file](https://github.com/xeokit/xeokit-sdk/tree/master/examples/models/xkt/schependomlaan), along
 * with an accompanying JSON [IFC metadata file](https://github.com/xeokit/xeokit-sdk/tree/master/examples/metaModels/schependomlaan).
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_Schependomlaan)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {TreeViewPlugin} from "../src/plugins/TreeViewPlugin/TreeViewPlugin.js";
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
 *     src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *     metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
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
 *     src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *     metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
 *     edges: true
 * });
 *
 * model.on("loaded", () => {
 *      treeView.addModel(model.id);
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
 * We can show a given node using its ID. This causes the TreeViewPlugin to expand and scroll the node into view.
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
 * Note that only works if the picked {@link Entity} is an object that belongs to a model that's represented in the TreeViewPlugin.
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
 * ## Context menu
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
 * [[Run an example](https://xeokit.github.io/xeokit-sdk/examples/#ContextMenu_Canvas_TreeViewPlugin_Custom)]
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
 *                     callback: function (context) {
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
 *                     callback: function (context) {
 *                         context.viewer.scene.setObjectsVisible(context.viewer.scene.visibleObjectIds, false);
 *                     }
 *                 }
 *             ],
 *             [
 *                 {
 *                     title: "Show",
 *                     callback: function (context) {
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
 *                     callback: function (context) {
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
 * @class TreeViewPlugin
 */
class TreeViewPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {*} cfg Plugin configuration.
     * @param {HTMLElement} cfg.containerElement DOM element to contain the TreeViewPlugin.
     * @param {Boolean} [cfg.autoAddModels=true] When ````true```` (default), will automatically add each model as it's created. Set this ````false```` if you want to manually add models using {@link TreeViewPlugin#addModel} instead.
     * @param {Number} [cfg.autoExpandDepth] Optional depth to which to initially expand the tree.
     * @param {String} [cfg.hierarchy="containment"] How to organize the tree nodes: "containment", "storeys" or "types". See the class documentation for details.
     */
    constructor(viewer, cfg = {}) {

        super("TreeViewPlugin", viewer);

        if (!cfg.containerElement) {
            this.error("Config expected: containerElement");
            return;
        }

        this._containerElement = cfg.containerElement;
        this._modelTreeViews = {};
        this._modelTreeViews = {};
        this._autoAddModels = (cfg.autoAddModels !== false);
        this._autoExpandDepth = (cfg.autoExpandDepth || 0);

        if (this._autoAddModels) {
            const modelIds = Object.keys(this.viewer.scene.models);
            for (let i = 0, len = modelIds.length; i < len; i++) {
                const modelId = modelIds[i];
                this.addModel(modelId);
            }
            this.viewer.scene.on("modelLoaded", (modelId) =>{
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
        this._hierarchy = hierarchy;
        for (let modelId in this._modelTreeViews) {
            if (this._modelTreeViews.hasOwnProperty(modelId)) {
                this._modelTreeViews[modelId].setHierarchy(this._hierarchy);
            }
        }
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
     */
    addModel(modelId) {
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
        if (this._modelTreeViews[modelId]) {
            this.warn("Model already added: " + modelId);
            return;
        }
        this._modelTreeViews[modelId] = new ModelTreeView(this.viewer, this, this._contextMenu, model, metaModel, {
            containerElement: this._containerElement,
            autoExpandDepth: this._autoExpandDepth,
            hierarchy: this._hierarchy
        });
        model.on("destroyed", () => {
            this.removeModel(model.id);
        });
    }

    /**
     * Removes a model from this tree view.
     *
     * @param {String} modelId ID of a model {@link Entity} in {@link Scene#models}.
     */
    removeModel(modelId) {
        if (!this._containerElement) {
            return;
        }
        const modelTreeView = this._modelTreeViews[modelId];
        if (!modelTreeView) {
            this.warn("Model not added: " + modelId);
            return;
        }
        modelTreeView.destroy();
        delete this._modelTreeViews[modelId];
    }

    /**
     * Collapses all trees within this tree view.
     */
    collapse() {
        for (let modelId in this._modelTreeViews) {
            if (this._modelTreeViews.hasOwnProperty(modelId)) {
                const modelTreeView = this._modelTreeViews[modelId];
                modelTreeView.collapse();
            }
        }
    }

    /**
     * Shows the tree view node that represents the given object {@link Entity}.
     *
     * @param {String} objectId ID of the {@link Entity}.
     */
    showNode(objectId) {
        const metaObject = this.viewer.metaScene.metaObjects[objectId];
        if (!metaObject) {
            this.error("MetaObject not found: " + objectId);
            return;
        }
        const metaModel = metaObject.metaModel;
        const modelId = metaModel.id;
        const modelTreeView = this._modelTreeViews[modelId];
        if (!modelTreeView) {
            this.error("Object not in this TreeView: " + objectId);
            return;
        }
        modelTreeView.showNode(objectId);
    }

    /**
     * Expands the tree to the given depth.
     *
     * Collapses the tree first.
     *
     * @param {Number} depth Depth to expand to.
     */
    expandToDepth(depth) {
        for (let modelId in this._modelTreeViews) {
            if (this._modelTreeViews.hasOwnProperty(modelId)) {
                const modelTreeView = this._modelTreeViews[modelId];
                modelTreeView.collapse();
                modelTreeView.expandToDepth(depth);
            }
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
        for (let modelId in this._modelTreeViews) {
            if (this._modelTreeViews.hasOwnProperty(modelId)) {
                this._modelTreeViews[modelId].destroy();
            }
        }
        this._modelTreeViews = {};
        //this._contextMenu.destroy();
        super.destroy();
    }
}

export {TreeViewPlugin};