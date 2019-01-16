import {utils} from "./../../../scene/utils.js"
import {Node} from "./../../../scene/nodes/Node.js";
import {Plugin} from "./../../Plugin.js";
import {XML3DLoader} from "./XML3DLoader.js";

/**
 * {@link Viewer} plugin that loads models from [3DXML](https://en.wikipedia.org/wiki/3DXML) files.
 *
 * For each model loaded, creates a {@link Node} within its
 * {@link Viewer}'s {@link Scene}.
 *
 * Note that the name of this plugin is intentionally munged to "XML3D" because a JavaScript
 * class name cannot begin with a numeral.
 *
 * An 3DXML model is a zip archive that bundles multiple XML files and assets. Internally, the XML3DLoaderPlugin uses the
 * [zip.js](https://gildas-lormeau.github.io/zip.js/) library to unzip them before loading. The zip.js library uses
 * [Web workers](https://www.w3.org/TR/workers/) for fast unzipping, so XML3DLoaderPlugin requires that we configure it
 * with a ````workerScriptsPath```` property specifying the directory where zip.js keeps its Web worker script. See
 * the example for how to do that.
 *
 * See the {@link XML3DLoaderPlugin#load} method for parameters that you can configure
 * each {@link Node} with as you load it.
 *
 * @example
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
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.XML3DLoader;
 *
 * // Load the 3DXML model
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/my3DXMLModel.3dxml",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model via the xeokit.Node
 * model.highlighted = true;
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the xeokit.Node itself
 * model.destroy();
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
        this._loader = new XML3DLoader(this, cfg);

        /**
         * Models currently loaded by this Plugin.
         * @type {{String:Node}}
         */
        this.models = {};

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
     * Creates a tree of {@link Node}s within the Viewer's {@link Scene} that represents the model.
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the {@link Node},
     * unique among all components in the Viewer's {@link Scene}.
     *
     * @param {String} [params.src] Path to a 3DXML file.
     *
     * @param {String} [params.metaModelSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     *
     * @param {Object} [params.parent] The parent {@link Node},
     * if we want to graft the {@link Node} into a xeokit object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Node} with edges emphasized.
     *
     * @param {Number[]} [params.position=[0,0,0]] The {@link Node}'s
     * local 3D position.
     *
     * @param {Number[]} [params.scale=[1,1,1]] The {@link Node}'s
     * local scale.
     *
     * @param {Number[]} [params.rotation=[0,0,0]] The {@link Node}'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * {@link Node}'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterial=false]  When true, gives each {@link Mesh}
     * the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the 3DXML material. This is typically used for large CAD models and
     * will cause loading to ignore textures in the 3DXML.
     *
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the 3DXML.
     * When false, ignores backfaces.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{Node}} A {@link Node} representing the loaded 3DXML model.
     */
    load(params = {}) {

        params.workerScriptsPath = this._workerScriptsPath;

        const self = this;

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

    /**
     * Unloads a model that was loaded by this GLTFLoaderPlugin.
     *
     * @param {String} modelId  ID of model to unload.
     */
    unload(modelId) {
        const modelNode = this.models;
        if (!modelNode) {
            this.error(`unload() model with this ID not found: ${modelId}`);
            return;
        }
        modelNode.destroy();
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clear":
                this.clear();
                break;
        }
    }

    /**
     * Unloads models loaded by this GLTFLoaderPlugin.
     */
    clear() {
        for (const modelId in this.models) {
            this.models[modelId].destroy();
        }
    }

    /**
     * Destroys this BIMServerLoaderPlugin, after first unloading any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {XML3DLoaderPlugin}