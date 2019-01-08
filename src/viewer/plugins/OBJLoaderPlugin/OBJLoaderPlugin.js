import {Plugin} from "././../../../viewer/Plugin.js";
import {Node} from "./../../../scene/nodes/Node.js";
import {utils} from "./../../../scene/utils.js";
import {OBJLoader} from "./OBJLoader.js";

/**
 * {@link Viewer} plugin that loads models from [OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) files.
 *
 * * For each model loaded, creates a {@link Node} within its {@link Viewer}'s {@link Scene}.
 * * See the {@link OBJLoaderPlugin#load} method for parameters that you can configure each {@link Node} with as you load it.
 * * Can also load metadata for each {@link Node} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 * * Can configure each {@link Node} with a local transformation.
 * * Can attach each {@link Node} as a child of a given {@link Node}.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an OBJLoader to the Viewer
 * var objLoader = new OBJLoaderPlugin(viewer, {
 *      id: "OBJModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * objLoader = viewer.plugins.OBJModels;
 *
 * // Load the OBJ
 * const model = objLoader.load({ // Model is a Node
 *      id: "myModel",
 *      src: "models/myObjModel.obj",
 *      src: "models/myObjModelMetadata.json",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // When the Node has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.scene.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the Node
 * model.highlighted = true;
 *
 * // You can unload the Node via the plugin
 * objLoader.unload("myModel");
 *
 * // Or unload it by calling destroy() on the Node itself
 * model.destroy();
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
     * @param {Float32Array} [params.position=[0,0,0]] The model root {@link Node}'s local 3D position.
     * @param {Float32Array} [params.scale=[1,1,1]] The model root {@link Node}'s local scale.
     * @param {Float32Array} [params.rotation=[0,0,0]] The model root {@link Node}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model root {@link Node}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {{Node}} A {@link Node} tree representing the loaded OBJ model.
     */
    load(params = {}) {

        var node = new Node(this.viewer.scene, params);

        const id = params.id;
        if (!id) {
            this.error("load() param expected: id");
            return node;
        }

        const src = params.src;
        if (!src) {
            this.error("load() param expected: src");
            return node;
        }

        if (this.viewer.scene.components[id]) {
            this.error(`Component with this id already exists in viewer: ${id}`);
            return node;
        }

        if (params.metaModelSrc) {
            const metaModelSrc = params.metaModelSrc;
            utils.loadJSON(metaModelSrc, function (modelMetadata) {
                self.viewer.metaScene.createMetaModel(id, modelMetadata);
                self._loader.load(node, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model modelMetadata for model '${id} from  '${metaModelSrc}' - ${errMsg}`);
            });
        } else {
            this._loader.load(node, src, params);
        }

        this.models[id] = node;

        node.once("destroyed", () => {
            delete this.models[id];
            this.viewer.metaScene.destroyMetaModel(id);
            this.fire("unloaded", id);
        });

        return node;
    }

    /**
     * Unloads a model that was previously loaded by this Plugin.
     *
     * @param {String} id  ID of model to unload.
     */
    unload(id) {
        const node = this.models;
        if (!node) {
            this.error(`unload() model with this ID not found: ${id}`);
            return;
        }
        node.destroy();
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
        for (const id in this.models) {
            this.models[id].destroy();
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

export {OBJLoaderPlugin}