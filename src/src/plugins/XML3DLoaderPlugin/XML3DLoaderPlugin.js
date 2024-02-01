import {utils} from "../../viewer/scene/utils.js"
import {Node} from "../../viewer/scene/nodes/Node.js";
import {Plugin} from "../../viewer/Plugin.js";
import {XML3DSceneGraphLoader} from "./XML3DSceneGraphLoader.js";

/**
 * {@link Viewer} plugin that loads models from [3DXML](https://en.wikipedia.org/wiki/3DXML) files.
 *
 * [<img src="https://xeokit.io/img/docs/XML3DLoaderPlugin/XML3DPluginTreeView.png">](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_TreeView)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_TreeView)]
 *
 * ## Overview
 *
 * * Currently supports 3DXML V4.2.
 * * Creates an {@link Entity} representing each model it loads, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the model, which will have {@link Entity#isObject} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space, along with initial properties for all the model's {@link Entity}s.
 * * Can optionally load a {@link MetaModel} to classify the objects within the model, from which you can create a tree view using the {@link TreeViewPlugin}.
 * <br>
 * Note that the name of this plugin is intentionally munged to "XML3D" because a JavaScript class name cannot begin with a numeral.
 *
 * An 3DXML model is a zip archive that bundles multiple XML files and assets. Internally, the XML3DLoaderPlugin uses the
 * [zip.js](https://gildas-lormeau.github.io/zip.js/) library to unzip them before loading. The zip.js library uses
 * [Web workers](https://www.w3.org/TR/workers/) for fast unzipping, so XML3DLoaderPlugin requires that we configure it
 * with a ````workerScriptsPath```` property specifying the directory where zip.js keeps its Web worker script. See
 * the example for how to do that.
 *
 * ## Usage
 *
 * In the example below, we'll use an XML3DLoaderPlugin to load a 3DXML model. When the model has loaded,
 * we'll use the {@link CameraFlightAnimation} to fly the {@link Camera} to look at boundary of the model. We'll
 * then get the model's {@link Entity} from the {@link Scene} and highlight the whole model.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_Widget)]
 *
 * ````javascript
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an XML3DLoaderPlugin to the Viewer
 * var plugin = new XML3DLoaderPlugin(viewer, {
 *      id: "XML3DLoader",  // Default value
 *      workerScriptsPath : "../../src/plugins/XML3DLoader/zipjs/" // Path to zip.js workers dir
 * });
 *
 * // Load the 3DXML model
 * var model = plugin.load({ // Model is an Entity
 *     id: "myModel",
 *     src: "./models/xml3d/3dpreview.3dxml",
 *     scale: [0.1, 0.1, 0.1],
 *     rotate: [90, 0, 0],
 *     translate: [100,0,0],
 *     edges: true
 * });
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model via the entity
 * model.highlighted = true;
 *
 * // Find the model Entity by ID
 * model = viewer.scene.models["myModel"];
 *
 * // Destroy the model
 * model.destroy();
 * ````
 * ## Loading MetaModels
 *
 * We have the option to load a {@link MetaModel} that contains a hierarchy of {@link MetaObject}s that classifes the objects within
 * our 3DXML model.
 *
 * This is useful for building a tree view to navigate the objects, using {@link TreeViewPlugin}.
 *
 * Let's load the model again, this time creating a MetaModel:
 *
 * ````javascript
 * var model = plugin.load({
 *     id: "myModel",
 *     src: "./models/xml3d/3dpreview.3dxml",
 *     scale: [0.1, 0.1, 0.1],
 *     rotate: [90, 0, 0],
 *     translate: [100,0,0],
 *     edges: true,
 *
 *     createMetaModel: true // <<-------- Create a MetaModel
 * });
 * ````
 *
 * The MetaModel can then be found on the {@link Viewer}'s {@link MetaScene}, using the model's ID:
 *
 * ````javascript
 * const metaModel = viewer.metaScene.metaModels["myModel"];
 * ````
 *
 * Now we can use {@link TreeViewPlugin} to create a tree view to navigate our model's objects:
 *
 * ````javascript
 * import {TreeViewPlugin} from "xeokit-sdk.es.js""xeokit-sdk.es.js";
 *
 * const treeView = new TreeViewPlugin(viewer, {
 *     containerElement: document.getElementById("myTreeViewContainer")
 * });
 *
 * const treeView = new TreeViewPlugin(viewer, {
 *      containerElement: document.getElementById("treeViewContainer"),
 *      autoExpandDepth: 3, // Initially expand tree three storeys deep
 *      hierarchy: "containment",
 *      autoAddModels: false
 * });
 *
 * model.on("loaded", () => {
 *      treeView.addModel(model.id);
 * });
 * ````
 *
 * Note that only the TreeViewPlugin "containment" hierarchy makes sense for an XML3D model. A "types" hierarchy
 * does not make sense because XML3DLoaderPlugin will set each {@link MetaObject#type} to "Default", and "storeys"
 * does not make sense because that requires some of the MetaObject#type values to be "IfcBuildingStorey".
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_TreeView)]
 *
 * ## Material Type
 *
 * Although 3DXML only supports Phong materials, XML3DLoaderPlugin is able to convert them to physically-based materials.
 *
 * The plugin supports three material types:
 *
 * | Material Type | Material Components Loaded  | Description | Example |
 * |:--------:|:----:|:-----:|:-----:|
 * | "PhongMaterial" (default) | {@link PhongMaterial}  | Non-physically-correct Blinn-Phong shading model | [Run example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_materialType_Phong) |
 * | "MetallicMaterial" | {@link MetallicMaterial} | Physically-accurate specular-glossiness shading model | [Run example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_materialType_Metallic) |
 * | "SpecularMaterial" | {@link SpecularMaterial} | Physically-accurate metallic-roughness shading model | [Run example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_materialType_Specular) |
 *
 * <br>
 * Let's load our model again, this time converting the 3DXML Blinn-Phong materials to {@link SpecularMaterial}s:
 *
 * ````javascript
 * var model = plugin.load({ // Model is an Entity
 *     id: "myModel",
 *     src: "./models/xml3d/3dpreview.3dxml",
 *     materialtype: "SpecularMaterial": true"
 * });
 * ````
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_3DXML_materialType_Specular)]
 *
 * @class XML3DLoaderPlugin
 */

class XML3DLoaderPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="XML3DLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} cfg.workerScriptsPath Path to the directory that contains the
     * bundled [zip.js](https://gildas-lormeau.github.io/zip.js/) archive, which is a dependency of this plugin. This directory
     * contains the script that is used by zip.js to instantiate Web workers, which assist with unzipping the 3DXML, which is a ZIP archive.
     * @param {String} [cfg.materialType="PhongMaterial"] What type of materials to create while loading: "MetallicMaterial" to create {@link MetallicMaterial}s, "SpecularMaterial" to create {@link SpecularMaterial}s or "PhongMaterial" to create {@link PhongMaterial}s. As it loads XML3D's Phong materials, the XMLLoaderPlugin will do its best approximate conversion of those to the specified workflow.
     * @param {Boolean} [cfg.createMetaModel=false] When true, will create a {@link MetaModel} for the model in {@link MetaScene#metaModels}.
     */
    constructor(viewer, cfg = {}) {

        super("XML3DLoader", viewer, cfg);

        if (!cfg.workerScriptsPath) {
            this.error("Config expected: workerScriptsPath");
            return
        }

        this._workerScriptsPath = cfg.workerScriptsPath;

        /**
         * @private
         */
        this._loader = new XML3DSceneGraphLoader(this, cfg);

        /**
         * Supported 3DXML schema versions
         * @property supportedSchemas
         * @type {string[]}
         */
        this.supportedSchemas = this._loader.supportedSchemas;
    }

    /**
     * Loads a 3DXML model from a file into this XML3DLoaderPlugin's {@link Viewer}.
     *
     * Creates a tree of {@link Entity}s within the Viewer's {@link Scene} that represents the model.
     *
     * @param {*} params  Loading parameters.
     * @param {String} params.id ID to assign to the model's root {@link Entity}, unique among all components in the Viewer's {@link Scene}.
     * @param {String} [params.src] Path to a 3DXML file.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Entity} with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model's World-space 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model's World-space scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the 3DXML. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {String} [params.materialType="PhongMaterial"] What type of materials to create while loading: "MetallicMaterial" to create {@link MetallicMaterial}s, "SpecularMaterial" to create {@link SpecularMaterial}s or "PhongMaterial" to create {@link PhongMaterial}s. As it loads XML3D's Phong materials, the XMLLoaderPlugin will do its best approximate conversion of those to the specified workflow.
     * @param {Boolean} [params.createMetaModel=false] When true, will create a {@link MetaModel} for the model in {@link MetaScene#metaModels}.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}
     */
    load(params = {}) {

        params.workerScriptsPath = this._workerScriptsPath;

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const modelNode = new Node(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        const src = params.src;

        if (!src) {
            this.error("load() param expected: src");
            return modelNode; // Return new empty model
        }

        this._loader.load(this, modelNode, src, params);

        return modelNode;
    }
}

export {XML3DLoaderPlugin}