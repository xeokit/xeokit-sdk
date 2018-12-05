import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {STLModel} from "./../../../xeogl/STLModel/STLModel.js";

/**
 * A viewer plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> format.
 *
 * @example
 * // Create a viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Create an STLModels plugin within the viewer
 * var plugin = new SSTLModelsPlugin(viewer, {
 *      id: "STLModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the viewer
 * plugin = viewer.plugins.STLModels;
 *
 * // Load the STL model
 * // These params can include all the xeogl.STLModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "./models/stl/mystlmodel.obj"
 * });
 *
 * // The model is a xeogl.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * @class STLModelsPlugin
 */
class STLModelsPlugin extends ModelsPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="STLModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("STLModels", viewer, STLModel, cfg);
    }

    // TODO: comment
    load(params) {
        return super.load(params);
    }
}

export {STLModelsPlugin}