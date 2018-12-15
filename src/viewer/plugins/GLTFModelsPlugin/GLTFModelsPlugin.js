import {_apply} from "../../../xeokit/xeokit.module.js"
import {GLTFModel} from "././../../../xeokit/GLTFModel/GLTFModel.js";

import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";

/**
 * A viewer plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * For each model loaded, creates a [xeokit.Model](http://xeokit.org/docs/classes/Model.html) within its
 * {@link Viewer}'s [xeokit.Scene](http://xeokit.org/docs/classes/Scene.html).
 *
 * See the {@link GLTFModelsPlugin#load} method for parameters that you can configure
 * each [xeokit.Model](http://xeokit.org/docs/classes/Model.html) with as you load it.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin to the Viewer
 * var plugin = new GLTFModelsPlugin(viewer, {
 *      id: "GLTFModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.GLTFModels;
 *
 * // Load the glTF model
 * // These params can include all the xeokit.GLTFModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/mygltfmodel.gltf",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // Recall that the model is a xeokit.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model via the xeokit.Model
 * model.translate = [200,0,0];
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the xeokit.Model itself
 * model.destroy();
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
     * Loads a glTF model from a file into this GLTFModelsPlugin's {@link Viewer}.
     *
     * Creates a [xeokit.Model](http://xeokit.org/docs/classes/Model.html) within the Viewer's [xeokit.Scene](http://xeokit.org/docs/classes/Scene.html).
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the [xeokit.Model](http://xeokit.org/docs/classes/Model.html),
     * unique among all components in the Viewer's [xeokit.Scene](http://xeokit.org/docs/classes/Scene.html).
     *
     * @param {String} params.src Path to a glTF file.
     *
     * @param {String} [params.metadataSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     *
     * @param {xeokit.Object} [params.parent] The parent [xeokit.Object](http://xeokit.org/docs/classes/Object.html),
     * if we want to graft the [xeokit.Model](http://xeokit.org/docs/classes/Model.html) into a xeokit object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the [xeokit.Model](http://xeokit.org/docs/classes/Model.html) with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The [xeokit.Model](http://xeokit.org/docs/classes/Model.html)'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The [xeokit.Model](http://xeokit.org/docs/classes/Model.html)'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The [xeokit.Model](http://xeokit.org/docs/classes/Model.html)'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * [xeokit.Model](http://xeokit.org/docs/classes/Model.html)'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterials=false]  When true, gives each [xeokit.Mesh](http://xeokit.org/docs/classes/Mesh.html)
     * the same [xeokit.LambertMaterial](http://xeokit.org/docs/classes/LambertMaterial.html) and a ````colorize````
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
     * [xeokit.Objects](http://xeokit.org/docs/classes/Object.html) and
     * [xeokit.Meshes](http://xeokit.org/docs/classes/Meshes.html) are created as the glTF node hierarchy is
     * parsed. See usage examples.
     *
     * @returns {{xeokit.Model}} A [xeokit.Model](http://xeokit.org/docs/classes/Model.html) representing the loaded glTF model.
     */
    load(params) {

        var modelId = params.id;
        var self = this;

        return super.load(_apply(params, {
            handleNode: function (nodeInfo, actions) {
                return self.defaultHandleNode(modelId, nodeInfo, actions);
            }
        }));
    }

    defaultHandleNode(modelId, nodeInfo, actions) {
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