import {Node} from "./../../../scene/nodes/Node.js";
import {Plugin} from "./../../Plugin.js";
import {STLLoader} from "./STLLoader.js";

/**
 * {@link Viewer} plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> files.
 *
 * For each model loaded, creates a {@link Node} within its {@link Viewer}'s {@link Scene}.
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
 * will create a separate {@link Mesh} for each group of faces that share the same vertex colors. This option only works with binary STL files.
 *
 * See the {@link STLLoaderPlugin#load} method for more info on loading options.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add an STLLoaderPlugin to the Viewer
 * var plugin = new STLLoaderPlugin(viewer, {
 *      id: "STLModels"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.STLModels;
 *
 * // Load the STL model
 * const model = plugin.load({ // Model is a Node
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
 * // When the model has loaded, fit it to view
 * model.on("loaded", function() {
 *      viewer.cameraFlight.flyTo(model);
 * });
 *
 * // Update properties of the model
 * model.translate = [200,0,0];
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the Node itself
 * model.destroy();
 *
 * @class STLLoaderPlugin
 */
class STLLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {

        super("STLLoader", viewer, cfg);

        /**
         * @private
         */
        this._loader = new STLLoader(this, cfg);

        /**
         * Models currently loaded by this Plugin.
         * @type {{String:Node}}
         */
        this.models = {};
    }

    /**
     * Loads an STL model from a file into this STLLoaderPlugin's {@link Viewer}.
     *
     * Creates a {@link Node} tree representing the model within the Viewer's {@link Scene}.
     *
     * @param {*} params  Loading parameters.
     * @param {String} params.id ID to assign to the model's {@link Node}, unique among all components in the Viewer's {@link Scene}.
     * @param {String} params.src Path to an STL file.
     * @param {Node} [params.parent] The parent {@link Node}, if we want to graft the model {@link Node} into a scene graph.
     * @param {Boolean} [params.edges=false] Whether or not xeogl renders the model with edges emphasized.
     * @param {Float32Array} [params.position=[0,0,0]] The model's local 3D position.
     * @param {Float32Array} [params.scale=[1,1,1]] The model's local scale.
     * @param {Float32Array} [params.rotation=[0,0,0]] The model's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the STL.  When false, ignores backfaces.
     * @param {Boolean} [params.smoothNormals=true] When true, automatically converts face-oriented normals to vertex normals for a smooth appearance.
     * @param {Number} [params.smoothNormalsAngleThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Boolean} [params.splitMeshes=true] When true, creates a separate {@link Mesh} for each group of faces that share the same vertex colors. Only works with binary STL.
     * @returns {Node} A {@link Node} tree representing the loaded STL model.
     */
    load(params) {

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
            this.error(`Component with this ID already exists in viewer: ${id}`);
            return;
        }

        this._loader.load(this, node, src, params);

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
        const model = this.models;
        if (!model) {
            this.error(`unload() model Node with this ID not found: ${id}`);
            return;
        }
        model.destroy();
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


export {STLLoaderPlugin}