import {utils} from "../../../scene/utils.js";
import {GLTFLoader} from "./GLTFLoader.js";
import {LoaderPlugin} from "../../LoaderPlugin.js";

/**
 * A viewer plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * For each model loaded, creates a {@link Model} within its
 * {@link Viewer}'s {@link Scene}.
 *
 * See the {@link GLTFLoaderPlugin#load} method for parameters that you can configure
 * each {@link Model} with as you load it.
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
 *      id: "myModel",
 *      src: "models/mygltfmodel.gltf",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // When the Model has loaded, fit it to view
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
class GLTFLoaderPlugin extends LoaderPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("GLTFLoader", viewer, new GLTFLoader(cfg), cfg);
    }

    /**
     * Loads a glTF model from a file into this GLTFLoaderPlugin's {@link Viewer}.
     *
     * Creates a {@link Model} within the Viewer's {@link Scene}.
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the {@link Model},
     * unique among all components in the Viewer's {@link Scene}.
     *
     * @param {String} params.src Path to a glTF file.
     *
     * @param {String} [params.metadataSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     *
     * @param {Object} [params.parent] The parent {@link Object3D}, if we want to graft the {@link Model} into a xeokit object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Model} with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The {@link Model}'s local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The {@link Model}'s local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The {@link Model}'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * {@link Model}'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterials=false]  When true, gives each {@link Mesh}
     * the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the glTF material. This is typically used for large CAD models and
     * will cause loading to ignore textures in the glTF.
     *
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF.
     * When false, ignores backfaces.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @param {Function} [params.handleNode] Optional callback to control how
     * {@link Object3D}s and {@link Mesh}s are created as the glTF node hierarchy is parsed. See usage examples.
     *
     * @returns {{Model}} A {@link Model} representing the loaded glTF model.
     */
    load(params) {
        var modelId = params.id;
        return super.load(utils.apply(params, {
            handleNode: function (nodeInfo, actions) {
                return GLTFLoaderPlugin.defaultHandleNode(modelId, nodeInfo, actions);
            }
        }));
    }

    static defaultHandleNode(modelId, nodeInfo, actions) {
        var name = nodeInfo.name;
        if (!name) {
            return true; // Continue descending this node subtree
        }
        actions.createObject = {
            id: modelId + "#" + name,
            entityType: "default",
            visible: true
        };
        return true; // Continue descending this glTF node subtree
    }
}

export {GLTFLoaderPlugin}