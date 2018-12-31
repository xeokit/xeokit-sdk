import {Plugin} from "./../../../viewer/Plugin.js";
import {BigModel} from "../../../scene/bigModels/BigModel.js";
import {GLTFBigModelLoader} from "./GLTFBigModelLoader.js";
import {utils} from "../../../scene/utils.js";

/**
 * {@link Viewer} plugin that loads large scale models from [glTF](https://www.khronos.org/gltf/).
 *
 * * For each model loaded, creates a {@link Model} within its {@link Viewer}'s {@link Scene}.
 * * See the {@link GLTFLoaderPlugin#load} method for parameters that you can configure each {@link Model} with as you load it.
 * * Can also load metadata for each {@link Model} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 * * Can configure each {@link Model} with a local transformation.
 * * Can attach each {@link Model} as a child of a given {@link Node}.
 *
 * @example
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFBigModelsLoader to the Viewer
 * var plugin = new GLTFBigModelsLoader(viewer, {
 *      id: "GLTFBigModelsLoader"  // Default value
 * });
 *
 * // We can also get the plugin by its ID on the Viewer
 * plugin = viewer.plugins.GLTFBigModelsLoader;
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
 * @class GLTFBigModelLoader
 */
class GLTFBigModelLoader extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFBigModelLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {

        super("GLTFBigModelLoader", viewer, cfg);

        /**
         * @private
         */
        this._loader = new GLTFBigModelLoader(cfg);

        /**
         * {@link Model}s currently loaded by this Plugin.
         * @type {{String:Model}}
         */
        this.models = {};

        /**
         * Saves load params for bookmarks.
         * @private
         */
        this._modelLoadParams = {};
    }

    /**
     Loads a large-scale glTF model from the file system into the viewer.

     @param params {*} Configs
     @param [params.id] {String} Optional ID, unique among all components in the parent {@link Scene},
     generated automatically when omitted.
     @param [params.objectId] {String} Optional entity classification when using within a semantic data model. See the {@link Node} documentation for usage.
     @param [params.meta] {String:Object} Optional map of user-defined metadata to attach to this GLTFModel.
     @param [params.parent] The parent Object.
     @param [params.visible=true] {Boolean}  Indicates if this GLTFModel is visible.
     @param [params.culled=false] {Boolean}  Indicates if this GLTFModel is culled from view.
     @param [params.pickable=true] {Boolean}  Indicates if this GLTFModel is pickable.
     @param [params.clippable=true] {Boolean} Indicates if this GLTFModel is clippable.
     @param [params.outlined=false] {Boolean} Whether an outline is rendered around this GLTFModel.
     @param [params.ghosted=false] {Boolean} Whether this GLTFModel is rendered ghosted.
     @param [params.highlighted=false] {Boolean} Whether this GLTFModel is rendered highlighted.
     @param [params.selected=false] {Boolean} Whether this GLTFModel is rendered selected.
     @param [params.edges=false] {Boolean} Whether this GLTFModel is rendered with edges emphasized.
     @param [params.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
     @param [params.opacity=1.0] {Number} Opacity factor, multiplies by the rendered fragment alpha.
     @param [params.position=[0,0,0]] {Float32Array} The GLTFModel's local 3D position.
     @param [params.scale=[1,1,1]] {Float32Array} The GLTFModel's local scale.
     @param [params.rotation=[0,0,0]] {Float32Array} The GLTFModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     @param [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} GLTFThe Model's local modelling transform matrix. Overrides the position, scale and rotation parameters.
     @param [params.src] {String} Path to a glTF file.
     @param  [params.metaModelSrc]{String} Path to an optional matadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     @param [params.lambertMaterials=false] {Boolean} When true, gives each {@link Mesh} the same {@link LambertMaterial} and a {@link Mesh#colorize} value set the to diffuse color extracted from the glTF material. This is typically used for CAD models with huge amounts of objects, and will ignore textures.
     @param [params.quantizeGeometry=true] {Boolean} When true, quantizes geometry to reduce memory and GPU bus usage.
     @param [params.combineGeometry=true] {Boolean} When true, combines geometry vertex buffers to improve rendering performance.
     @param [params.backfaces=false] {Boolean} When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     @param [params.edgeThreshold=20] {Number} When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     @param [params.handleNode] {Function} Optional callback to mask which {@link Node}s are loaded. Each Object will only be loaded when this callback returns ````true``` for its ID.
     */
    load(params) {
        const self = this;
        const id = params.id;
        if (!id) {
            this.error("load() param expected: id");
            return;
        }
        const src = params.src;
        if (!src) {
            this.error("load() param expected: src");
            return;
        }
        if (this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists in viewer: ${id}`);
            return;
        }
        params = utils.apply(params, {
            modelId: id // Registers the Node on viewer.scene.models
        });
        var bigModel = new BigModel(this.viewer.scene, params);
        this._modelLoadParams[id] = params;
        if (params.metaModelSrc) {
            const metaModelSrc = params.metaModelSrc;
            utils.loadJSON(metaModelSrc, function (metadata) {
                self.viewer.createMetadata(id, metadata);
                self._loader.load(bigModel, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model metadata for model '${id} from  '${metaModelSrc}' - ${errMsg}`);
            });
        } else {
            this._loader.load(bigModel, src, params);
        }
        this.models[id] = bigModel;
        bigModel.once("destroyed", () => {
            delete this.models[id];
            delete this._modelLoadParams[id];
            this.viewer.destroyMetadata(id);
            this.fire("unloaded", id);
        });
        return bigModel;
    }


    /**
     * Unloads a {@link Model} that was previously loaded by this Plugin.
     *
     * @param {String} id  ID of model to unload.
     */
    unload(id) {
        const model = this.models;
        if (!model) {
            this.error(`unload() model with this ID not found: ${id}`);
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
     * @private
     */
    writeBookmark(bookmark) {
        bookmark[this.id] = this._modelLoadParams;
    }

    /**
     * @private
     */
    readBookmarkAsynch(bookmark, ok) {
        this.clear();
        var modelLoadParams = bookmark[this.id];
        if (modelLoadParams) {
            var modelParamsList = [];
            for (const id in modelLoadParams) {
                modelParamsList.push(modelLoadParams[id]);
            }
            if (modelParamsList.length === 0) {
                ok();
                return;
            }
            this._loadModel(modelParamsList, modelParamsList.length - 1, ok);
        }
    }

    _loadModel(modelLoadParams, i, ok) {
        this.load(modelLoadParams[i], () =>{
            if (i === 0) {
                ok();
            } else {
                this._loadModel(modelLoadParams, i - 1, ok);
            }
        });
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

export {GLTFBigModelLoader}
