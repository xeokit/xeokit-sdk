import {LoaderPlugin} from "./../../../viewer/LoaderPlugin.js";
import {OBJLoader} from "./OBJLoader.js";

/**
 * A viewer plugin that loads models from [OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) files.
 *
 * For each model loaded, creates a {@link Model} within its
 * {@link Viewer}'s {@link Scene}.
 *
 * See the {@link OBJLoaderPlugin#load} method for parameters that you can configure
 * each {@link Model} with as you load it.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an OBJLoader to the Viewer
 * var plugin = new GLTFModelsPlugin(viewer, {
 *      id: "OBJModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.OBJModels;
 *
 * // Load the OBJ
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/myObjModel.obj",
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
 * // You can unload the Model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the Model itself
 * model.destroy();
 *
 * @class OBJLoaderPlugin
 */
class OBJLoaderPlugin extends LoaderPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="OBJModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("OBJModels", viewer, new OBJLoader(cfg), cfg);
    }

    /**
     * Loads an OBJ model from a file into this OBJLoader's {@link Viewer}.
     *
     * Creates a {@link Model} within the Viewer's {@link Scene}.
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the {@link Model},
     * unique among all components in the Viewer's {@link Scene}.
     *
     * @param {String} params.src Path to an OBJ file.
     *
     * @param {String} [params.metadataSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     *
     * @param {Object} [params.parent] The parent {@link Object3D},
     * if we want to graft the {@link Model} into a xeokit object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Model} with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The {@link Model}'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The {@link Model}'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The {@link Model}'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * {@link Model}'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{Model}} A {@link Model} representing the loaded OBJ model.
     */
    load(params) {
        return super.load(params);
    }
}

export {OBJLoaderPlugin}