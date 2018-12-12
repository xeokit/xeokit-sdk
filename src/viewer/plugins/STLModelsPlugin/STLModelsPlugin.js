import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {STLModel} from "./../../../xeogl/STLModel/STLModel.js";

/**
 * A viewer plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> files.
 *
 * For each model loaded, creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within its
 * {@link Viewer}'s [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
 *
 * Supports both binary and ASCII formats.
 *
 * ## Smoothing STL Normals
 *
 * STL models are normally flat-shaded, however providing a ````smoothNormals```` parameter when loading gives a smooth
 * appearance. Triangles in STL are disjoint, where each triangle has its own separate vertex positions, normals and
 * (optionally) colors. This means that you can have gaps between triangles in an STL model. Normals for each triangle
 * are perpendicular to the triangle's surface, which gives the model a faceted appearance by default.
 *
 * The ```smoothNormals``` parameter causes the plugin to recalculate the STL normals, so that each normal's direction is
 * the average of the orientations of the triangles adjacent to its vertex. When smoothing, each vertex normal is set to
 * the average of the orientations of all other triangles that have a vertex at the same position, excluding those triangles
 * whose direction deviates from the direction of the vertice's triangle by a threshold given in
 * the ````smoothNormalsAngleThreshold```` loading parameter. This makes smoothing robust for hard edges.
 *
 * ## Creating Separate Meshes
 *
 * An STL model is normally one single mesh, however providing a ````splitMeshes```` parameter when loading
 * will create a separate [xeogl.Mesh](http://xeogl.org/docs/classes/Mesh.html) within the
 * [xeogl.Model](http://xeogl.org/docs/classes/Model.html) for each group of faces that share the same vertex colors.
 * This option only works with binary STL files.
 *
 * See the {@link STLModelsPlugin#load} method for parameters that you can configure
 * each [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with as you load it.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an STLModelsPlugin to the Viewer
 * var plugin = new GLTFModelsPlugin(viewer, {
 *      id: "STLModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.STLModels;
 *
 * // Load the glTF model
 * // These params can include all the xeogl.STLModel configs
 * const model = plugin.load({
 *      id: "myModel",
 *      src: "models/mySTLModel.stl",
 *      scale: [0.1, 0.1, 0.1],
 *      rotate: [90, 0, 0],
 *      translate: [100,0,0],
 *      edges: true,
 *      smoothNormals: true,                // Default
 *      smoothNormalsAngleThreshold: 20,    // Default
 *      splitMeshes: true                   // Default
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

    /**
     * Loads an STL model from a file into this STLModelsPlugin's {@link Viewer}.
     *
     * Creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the [xeogl.Model](http://xeogl.org/docs/classes/Model.html),
     * unique among all components in the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {String} params.src Path to an STL file.
     *
     * @param {String} [params.metadataSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
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
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the STL.
     * When false, ignores backfaces.
     *
     * @param {Boolean} [params.smoothNormals=true] When true, automatically converts face-oriented normals to vertex
     * normals for a smooth appearance.
     *
     * @param {Number} [params.smoothNormalsAngleThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @param {Boolean} [params.splitMeshes=true] When true, creates a
     * separate [xeogl.Mesh](http://xeogl.org/docs/classes/Mesh.html) for each group of faces that share the same vertex
     * colors. Only works with binary STL.
     *
     * @returns {{xeogl.Model}} A [xeogl.Model](http://xeogl.org/docs/classes/Model.html) representing the loaded STL model.
     */
    load(params) {
        return super.load(params);
    }
}

export {STLModelsPlugin}