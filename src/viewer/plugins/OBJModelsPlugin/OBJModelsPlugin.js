import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {OBJModel} from "./../../../xeogl/OBJModel/OBJModel.js";

/**
 * A viewer plugin that loads models from [OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) files.
 *
 * For each model loaded, creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within its
 * {@link Viewer}'s [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
 *
 * See the {@link OBJModelsPlugin#load} method for parameters that you can configure
 * each [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with as you load it.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an OBJModelsPlugin to the Viewer
 * var plugin = new GLTFModelsPlugin(viewer, {
 *      id: "OBJModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.OBJModels;
 *
 * // Load the glTF model
 * // These params can include all the xeogl.OBJModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/myObjModel.obj",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true
 * });
 *
 * // Recall that the model is a xeogl.Model
 *
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model via the xeogl.Model
 * model.translate = [200,0,0];
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the xeogl.Model itself
 * model.destroy();
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

    /**
     * Loads an OBJ model from a file into this OBJModelsPlugin's {@link Viewer}.
     *
     * Creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the [xeogl.Model](http://xeogl.org/docs/classes/Model.html),
     * unique among all components in the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {String} [params.src] Path to an OBJ file.
     *
     * @param {xeogl.Object} [params.parent] The parent [xeogl.Object](http://xeogl.org/docs/classes/Object.html),
     * if we want to graft the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) into a xeogl object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeogl renders the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{xeogl.Model}} A [xeogl.Model](http://xeogl.org/docs/classes/Model.html) representing the loaded OBJ model.
     */
    load(params) {
        return super.load(params);
    }
}

export {OBJModelsPlugin}