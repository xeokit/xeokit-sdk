import {ModelTreeView} from "./ModelTreeView.js";
import {Plugin} from "../../viewer/Plugin.js";

/**
 * @desc A {@link Viewer} plugin that provides an HTML tree view to navigate the structural hierarchy of IFC elements in models.
 * <br>
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_WestRiverSideHospital" style="border: 1px solid black;"><img src="http://xeokit.io/img/docs/TreeViewPlugin/TreeViewPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_WestRiverSideHospital)]
 *
 * ## Overview
 *
 * * A fast HTML tree widget, with zero external dependencies, that works with huge numbers of objects.
 * * Each node has a checkbox to control the visibility of its object.
 * * Automatically includes all models (that have metadata) that are currently in the {@link Scene}.
 * * Has three modes for organizing nodes: "structure", "storeys" and "types".
 * * Allows custom CSS styling.
 *
 * ## Credits
 *
 * TreeViewPlugin is based on techniques described in [*Super Fast Tree View in JavaScript*](https://chrissmith.xyz/super-fast-tree-view-in-javascript/) by [Chris Smith](https://twitter.com/chris22smith).
 *
 * ## Usage
 *
 * In the example below we'll add a TreeViewPlugin which, by default, will automatically show the structural
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
 * We can control which models appear in our TreeViewPlugin by adding them manually.
 *
 * In the next example, we'll configure the TreeViewPlugin to not automatically add models. Once the model
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
 * ## Initially Expanding Nodes
 *
 * We can configure TreeViewPlugin to initially expand each model's nodes to a given depth.
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
 * ## Customizing Appearance
 *
 * We can customize the appearance of our TreeViewPlugin by defining custom CSS for its HTML
 * elements. See our example's [source code](https://github.com/xeokit/xeokit-sdk/blob/master/examples/BIMOffline_XKT_Schependomlaan.html)
 * for an example of custom CSS rules.
 *
 * ## Organization Mode
 *
 * TreeViewPlugin has three modes for organizing its nodes:
 *
 * * **"structure"** - organizes
 *
 * * "storeys" - organizes
 *
 * * "types" - organizes
 *
 * | 1. Structure Mode | 2. Types Mode | 3. Storeys Mode |
 * |---|---|---|
 * | <img src="http://xeokit.io/img/docs/TreeViewPlugin/structureMode.png"> | <img src="http://xeokit.io/img/docs/TreeViewPlugin/typesMode.png"> | <img src="http://xeokit.io/img/docs/TreeViewPlugin/storeysMode.png"> |
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
     * @param {String} [cfg.mode="structure"] How to organize the tree: "structure", "storeys" or "types". See the usage documentation (above) for details.
     */
    constructor(viewer, cfg = {}) {

        super("TreeViewPlugin", viewer);

        if (!cfg.containerElement) {
            this.error("Config expected: containerElement");
            return;
        }

        this._containerElement = cfg.containerElement;
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

        this.mode = cfg.mode;
    }

    /**
     * Sets how the tree nodes are organized.
     *
     * * "structure" - organizes the nodes to indicate the containment hierarchy of the IFC objects.
     * * "storeys" - groups the nodes within ````IfcBuildingStoreys```` and sub-groups them by their IFC types.
     * * "types" - groups the nodes within their IFC types.
     *
     * Default value is "structure".
     *
     * @type {String}
     */
    set mode(mode) {
        if (mode !== "structure" && mode !== "storeys" && mode !== "types") {
            this.error("Unsupported value for `mode' - defaulting to 'structure'");
            mode = "structure";
        }
        this._mode = mode;
        for (let modelId in this._modelTreeViews) {
            if (this._modelTreeViews.hasOwnProperty(modelId)) {
                this._modelTreeViews.setMode(this._mode);
            }
        }
    }

    /**
     * Gets how the tree nodes are organized.
     *
     * * "structure" - organizes the nodes to indicate the containment hierarchy of the IFC objects.
     * * "storeys" - groups the nodes within ````IfcBuildingStoreys```` and sub-groups them by their IFC types.
     * * "types" - groups the nodes within their IFC types.
     *
     * Default value is "structure".
     *
     * @type {String}
     */
    get mode() {
        return this._mode;
    }

    /**
     * Adds a model.
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
        this._modelTreeViews[modelId] = new ModelTreeView(this.viewer, model, metaModel, {
            containerElement: this._containerElement,
            autoExpandDepth: this._autoExpandDepth,
            mode: this._mode
        });
        model.on("destroyed", () => {
            this.removeModel(model.id);
        });
    }

    /**
     * Removes a model.
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

    // expandToDepth(depth) {
    //
    // }

    /**
     * Expands the tree node corresponding to the given object.
     *
     * @param {String} objectId ID of the object.
     *
     */
    // expandNode(objectId) {
    //
    // }

    /**
     * Collapses the tree node corresponding to the given object.
     *
     * @param {String} objectId ID of the object.
     */
    // collapseNode(objectId) {
    //
    // }

    /**
     * Collapses all model trees.
     */
    // collapseAll() {
    //
    // }

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
        super.destroy();
    }
}

export {TreeViewPlugin};