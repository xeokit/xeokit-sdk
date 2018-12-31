import {utils} from "./../../../scene/utils.js"
import {Node} from "./../../../scene/nodes/Node.js";
import {Plugin} from "./../../Plugin.js";
import {GLTFLoader} from "./GLTFLoader.js";

/**
 * {@link Viewer} plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * * For each model loaded, creates a {@link Model} within its {@link Viewer}'s {@link Scene}.
 * * See the {@link GLTFLoaderPlugin#load} method for parameters that you can configure each {@link Model} with as you load it.
 * * Can also load metadata for each {@link Model} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 * * Can configure each {@link Model} with a local transformation.
 * * Can attach each {@link Model} as a child of a given {@link Node}.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFLoaderPlugin to the Viewer
 * var plugin = new GLTFLoaderPlugin(viewer, {
 *      id: "GLTFLoader"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.GLTFLoader;
 *
 * // Load the glTF model
 * const model = plugin.load({
 *      modelId: "myModel",
 *      src: "models/mygltfModel.gltf",
 *      metaModelSrc: "models/mygltfModelMetadata.json", // Optional metadata JSON
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
 * // Update properties of the Model
 * model.highlighted = true;
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the Model itself
 * model.destroy();
 *
 * @class GLTFLoaderPlugin
 */
class GLTFLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {

        super("GLTFLoader", viewer, cfg);

        /**
         * @private
         */
        this._loader = new GLTFLoader(this, cfg);

        /**
         * {@link Model}s currently loaded by this Plugin.
         * @type {{String:Node}}
         */
        this.models = {};
    }

    /**
     * Loads a glTF model from a file into this GLTFLoaderPlugin's {@link Viewer}.
     *
     * Creates a {@link Model} within the Viewer's {@link Scene}.
     *
     * @param {*} params  Loading parameters.
     * @param {String} params.modelId ID to assign to the {@link Model}, unique among all components in the Viewer's {@link Scene}.
     * @param {String} params.src Path to a glTF file.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file
     * (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {Node} [params.parent] The parent {@link Node}, if we want to graft the {@link Model} into a xeokit object hierarchy.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Model} with edges emphasized.
     * @param {Float32Array} [params.position=[0,0,0]] The {@link Model}'s local 3D position.
     * @param {Float32Array} [params.scale=[1,1,1]] The {@link Model}'s local scale.
     * @param {Float32Array} [params.rotation=[0,0,0]] The {@link Model}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The {@link Model}'s local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.lambertMaterials=false]  When true, gives each {@link Mesh} the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the glTF material. This is typically used for large CAD models and will cause loading to ignore textures in the glTF.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Function} [params.handleNode] Optional callback to control how {@link Node}s and {@link Mesh}s are created as the glTF node hierarchy is parsed. See usage examples.
     * @returns {Model} A {@link Model} representing the loaded glTF model.
     */
    load(params={}) {

        var node = new Node(this.viewer.scene, params);

        const self = this;
        const modelId = params.modelId;

        if (!modelId) {
            this.error("load() param expected: modelId");
            return node;
        }

        const src = params.src;

        if (!src) {
            this.error("load() param expected: src");
            return node;
        }

        if (this.viewer.scene.components[modelId]) {
            this.error(`Component with this ID already exists in viewer: ${modelId}`);
            return node;
        }

        params.handleNode = params.handleNode || function(modelId, nodeInfo, actions) {
            const name = nodeInfo.name;
            if (!name) {
                return true; // Continue descending this node subtree
            }
            const objectId = name;
            actions.createObject = {
                objectId: objectId
            };
            return true;
        };

        if (params.metaModelSrc) {
            const metaModelSrc = params.metaModelSrc;
            utils.loadJSON(metaModelSrc, (modelMetadata) => {
                // self.viewer.metaScene.transform(modelMetadata);
                // console.log(JSON.stringify(modelMetadata), null, "\t");
                self.viewer.metaScene.createMetaModel(modelId, modelMetadata);
                self._loader.load(this, node, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
            });
        } else {
            this._loader.load(this, node, src, params);
        }

        this.models[modelId] = node;

        node.once("destroyed", () => {
            delete this.models[modelId];
            this.viewer.metaScene.destroyMetaModel(modelId);
            this.fire("unloaded", modelId);
        });

        return node;
    }

    /**
     * Unloads a {@link Model} that was previously loaded by this Plugin.
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


export {GLTFLoaderPlugin}