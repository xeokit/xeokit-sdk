import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {OBJModel} from "./../../../xeogl/OBJModel/OBJModel.js";

/**
 * A viewer plugin that loads models from <a href="https://en.wikipedia.org/wiki/Wavefront_.obj_file">OBJ</a> format.
 *
 * @example
 *
 * // Create a viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Create an OBJModels plugin within the viewer
 * var plugin = new OBJModelsPlugin(viewer, {
 *      id: "OBJModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the viewer
 * plugin = viewer.plugins.OBJModels;
 *
 * // Load the OBJ model
 * // These params can include all the xeogl.OBJModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "./models/obj/myobjmodel.obj"
 * });
 *
 * // The model is a xeogl.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * @class OBJModelsPlugin
 */
class OBJModelsPlugin extends ModelsPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="OBJModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("OBJModels", viewer, OBJModel, cfg);
    }

    // TODO: comment
    load(params) {
        return super.load(params);
    }
}

export {OBJModelsPlugin}