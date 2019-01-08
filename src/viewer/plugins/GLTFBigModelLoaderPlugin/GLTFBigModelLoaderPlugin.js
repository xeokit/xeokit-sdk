import {Plugin} from "./../../../viewer/Plugin.js";
import {BigModel} from "../../../scene/bigModels/BigModel.js";
import {GLTFBigModelLoader} from "./GLTFBigModelLoader.js";
import {utils} from "../../../scene/utils.js";

/**
 * {@link Viewer} plugin that loads large scale models from [glTF](https://www.khronos.org/gltf/).
 *
 * * For each model loaded, creates a {@link BigModel} within its {@link Viewer}'s {@link Scene}.
 * * See the {@link GLTFBigModelLoaderPlugin#load} method for parameters that you can configure each {@link BigModel} with as you load it.
 * * Can also load metadata for each {@link BigModel} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 *
 * @example
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFBigModelLoaderPlugin} from "../src/viewer/plugins/GLTFBigModelLoaderPlugin/GLTFLoaderPlugin.js";
 *
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFLoaderPlugin to the Viewer
 * var plugin = new GLTFBigModelLoaderPlugin(viewer, {
 *      id: "GLTFBigModelLoader"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.GLTFBigModelLoader;
 *
 * // Load the glTF model
 * const model = plugin.load({ // Model is a BigModel
 *      id: "myModel",
 *      src: "models/myModel.gltf",
 *      metaModelSrc: "models/myModelMetadata.json", // Optional metadata JSON
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
 * // Update properties of the BigModel
 * model.highlighted = true;
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the BigModel itself
 * model.destroy();
 *
 * @class GLTFBigModelLoader
 */
class GLTFBigModelLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.modelId="GLTFBigModelLoaderPlugin"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Function} [cfg.handleNode] Optional callback to control how {@link BigModelNode}s are created as the glTF node hierarchy is parsed. See usage examples.
     */
    constructor(viewer, cfg = {}) {

        super("GLTFBigModelLoader", viewer, cfg);

        this._handleNode = cfg.handleNode;

        /**
         * @private
         */
        this._loader = new GLTFBigModelLoader(cfg);

        /**
         * {@link Model}s currently loaded by this Plugin.
         * @type {{String:Model}}
         */
        this.models = {};

        /**
         * Saves load params for bookmarks.
         * @private
         */
        this._modelLoadParams = {};
    }

    /**
     * Loads a large-scale glTF model from a file into this GLTFBigModelLoaderPlugin's {@link Viewer}.
     *
     * Creates a {@link BigModel} within the Viewer's {@link Scene} that represents the model.
     *
     * @param {*} params  Loading parameters.
     * @param {String} [params.model] ID to assign to the root {@link Node#modelId}, unique among all components in the Viewer's {@link Scene}.
     * @param {String} params.src Path to a glTF file.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {Node} [params.parent] The parent {@link Node}, if we want to graft the model's root {@link Node} into a xeokit object hierarchy.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Float32Array} [params.position=[0,0,0]] The model {@link Node}'s local 3D position.
     * @param {Float32Array} [params.scale=[1,1,1]] The model {@link Node}'s local scale.
     * @param {Float32Array} [params.rotation=[0,0,0]] The model root {@link Node}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model {@link Node}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.lambertMaterial=false]  When true, gives each {@link Mesh} the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the glTF material. This is typically used for large CAD models and will cause loading to ignore textures in the glTF.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Function} [params.handleNode] Optional callback to control how {@link Node}s and {@link Mesh}s are created as the glTF node hierarchy is parsed. See usage examples.
     * @returns {BigModel} A {@link BigModel} representing the loaded glTF model.
     */
    load(params) {
        const self = this;

        var bigModel = new BigModel(this.viewer.scene, params);
        const modelId = params.modelId;
        const src = params.src;

        if (!src) {
            this.error("load() param expected: src");
            return;
        }

        params.handleNode = params.handleNode || this._handleNode || function(modelId, glTFNode, actions) {
            const name = glTFNode.name;
            if (!name) {
                return true; // Continue descending this node subtree
            }
            actions.createNode = {
                objectId: name
            };
            return true;
        };

        if (params.metaModelSrc) {
            const metaModelSrc = params.metaModelSrc;
            this.viewer.scene.canvas.spinner.processes++;
            utils.loadJSON(metaModelSrc, (modelMetadata) => {
                self.viewer.metaScene.createMetaModel(modelId, modelMetadata);
                self.viewer.scene.canvas.spinner.processes--;
                self._loader.load(this, bigModel, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
                self.viewer.scene.canvas.spinner.processes--;
            });
        } else {
            this._loader.load(this, bigModel, src, params);
        }

        this.models[modelId] = bigModel;


        bigModel.once("destroyed", () => {
            delete this.models[modelId];
            this.viewer.metaScene.destroyMetaModel(modelId);
            this.fire("unloaded", modelId);
        });

        return bigModel;
    }


    /**
     * Unloads a model that was previously loaded by this Plugin.
     *
     * @param {String} modelId  ID of model to unload.
     */
    unload(modelId) {
        const model = this.models;
        if (!model) {
            this.error(`unload() model with this ID not found: ${modelId}`);
            return;
        }
        model.destroy();
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
     * Unloads models loaded by this plugin.
     */
    clear() {
        for (const modelId in this.models) {
            this.models[modelId].destroy();
        }
    }

    /**
     * Destroys this plugin, after first destroying any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {GLTFBigModelLoaderPlugin}
