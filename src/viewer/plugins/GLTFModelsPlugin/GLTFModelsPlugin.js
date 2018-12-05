import {_apply} from "../../../xeogl/xeogl.module.js"
import {GLTFModel} from "././../../../xeogl/GLTFModel/GLTFModel.js";

import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";

/**
 * A viewer plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * // Create a viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Create a GLTFModels plugin within the viewer
 * var plugin = new GLTFModelsPlugin(viewer, {
 *      id: "GLTFModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the viewer
 * plugin = viewer.plugins.GLTFModels;
 *
 * // Load the glTF model
 * // These params can include all the xeogl.GLTFModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "./models/gltf/mygltfmodel.gltf"
 * });
 *
 * // The model is a xeogl.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * @class GLTFModelsPlugin
 */
class GLTFModelsPlugin extends ModelsPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("GLTFModels", viewer, GLTFModel, cfg);
    }

    /**
     Loads a glTF model from the file system into the viewer.
     */
    load(params) {

        var modelId = params.id;
        var self = this;

        return super.load(_apply(params, {
            handleNode: function (nodeInfo, actions) {
                return self._defaultHhandleNode(modelId, nodeInfo, actions);
            }
        }));
    }

    _defaultHhandleNode(modelId, nodeInfo, actions) {
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

export {GLTFModelsPlugin}