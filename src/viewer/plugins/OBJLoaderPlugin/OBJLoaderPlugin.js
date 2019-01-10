import {Plugin} from "././../../../viewer/Plugin.js";
import {Node} from "./../../../scene/nodes/Node.js";
import {utils} from "./../../../scene/utils.js";
import {OBJLoader} from "./OBJLoader.js";

/**
 * {@link Viewer} plugin that loads models from [OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) files.
 *
 * * For each model loaded, creates a {@link Node} within the {@link Viewer}'s {@link Scene}.
 * * See the {@link OBJLoaderPlugin#load} method for parameters that you can configure each {@link Node} with as you load it.
 * * Can also load metadata for each {@link Node} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 * * Can configure each {@link Node} with a local transformation.
 * * Can attach each {@link Node} as a child of a given {@link Node}.
 *
 * ## Usage
 *
 * [[Run this example](/examples/#loading_OBJ_SportsCar)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {OBJLoaderPlugin} from "../src/viewer/plugins/OBJLoaderPlugin/OBJLoaderPlugin.js";
 *
 * // Create a xeokit Viewer and arrange the camera
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * viewer.camera.orbitPitch(20);
 *
 * // Add a GLTFLoaderPlugin to the Viewer
 * const objLoader = new OBJLoaderPlugin(viewer);
 *
 * // Load an OBJ model
 * const model = objLoader.load({ // Model is a Node
 *      id: "myModel",
 *      src: "./models/obj/sportsCar/sportsCar.obj",
 *      edges: true
 * });
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", () => {
 *      viewer.cameraFlight.flyTo(model);
 * })
 *
 * // Update properties of the model's Node
 * model.highlighted = true;
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the model's Node
 * model.destroy();
 * ````
 *
 * @class OBJLoaderPlugin
 */
class OBJLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="OBJLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {

        super("OBJLoader", viewer, cfg);

        /**
         * @private
         */
        this._loader = new OBJLoader(cfg);

        /**
         * Models currently loaded by this Plugin.
         * @type {{String:Node}}
         */
        this.models = {};
    }

    /**
     * Loads an OBJ model from a file into this OBJLoader's {@link Viewer}.
     *
     * Creates a tree of {@link Node}s within the Viewer's {@link Scene} that represents the model.
     *
     * @param {*} params  Loading parameters.
     * @param {String} params.id ID to assign to the {@link Node} unique among all components in the Viewer's {@link Scene}.
     * @param {String} params.src Path to an OBJ file.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {Object} [params.parent] The parent {@link Node}, if we want to graft the model root {@link Node} into a xeokit object hierarchy.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Node} with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model root {@link Node}'s local 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model root {@link Node}'s local scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model root {@link Node}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model root {@link Node}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {{Node}} A {@link Node} tree representing the loaded OBJ model.
     */
    load(params = {}) {

        const self = this;

        if (this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        var modelNode = new Node(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        const modelId = modelNode.id;  // In case ID was auto-generated
        const src = params.src;

        if (!src) {
            this.error("load() param expected: src");
            return modelNode;
        }

        if (params.metaModelSrc) {
            const metaModelSrc = params.metaModelSrc;
            utils.loadJSON(metaModelSrc, function (modelMetadata) {
                self.viewer.metaScene.createMetaModel(modelId, modelMetadata);
                self._loader.load(modelNode, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model modelMetadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
            });
        } else {
            this._loader.load(modelNode, src, params);
        }

        this.models[modelId] = modelNode;

        modelNode.once("destroyed", () => {
            delete this.models[modelId];
            this.viewer.metaScene.destroyMetaModel(modelId);
            this.fire("unloaded", modelId);
        });

        return modelNode;
    }

    /**
     * Unloads a model that was previously loaded by this OBJLoaderPlugin.
     *
     * @param {String} id  ID of model to unload.
     */
    unload(id) {
        const modelNode = this.models;
        if (!modelNode) {
            this.error(`unload() model with this ID not found: ${id}`);
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
     * Unloads models loaded by this OBJLoaderPlugin.
     */
    clear() {
        for (const id in this.models) {
            this.models[id].destroy();
        }
    }

    /**
     * Destroys this OBJLoaderPlugin, after first destroying any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {OBJLoaderPlugin}