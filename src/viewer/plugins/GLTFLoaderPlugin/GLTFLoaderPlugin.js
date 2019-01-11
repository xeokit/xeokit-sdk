import {utils} from "./../../../scene/utils.js"
import {Node} from "./../../../scene/nodes/Node.js";
import {Plugin} from "./../../Plugin.js";
import {GLTFLoader} from "./GLTFLoader.js";
import {IFCObjectDefaults} from "./../../../viewer/metadata/IFCObjectDefaults.js";

/**
 * A {@link Viewer} plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * * For each model loaded, creates a {@link Node} representing the model within the {@link Viewer}'s {@link Scene}.
 * * The {@link Node} will have {@link Node#isModel} set ````true```` and will be registered by {@link Node#id} in {@link Scene#models}.
 * * Can configure each {@link Node} with a local transformation.
 * * Can attach each {@link Node} as a child of a given {@link Node}.
 * * Can also load a {@link MetaModel} corresponding to the {@link Node} into {@link Viewer#metaScene} - more info: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata).
 *
 * ## Usage
 *
 * In the example below we'll load the Schependomlaan model from a [glTF file](/examples/models/gltf/schependomlaan/), along
 * with an accompanying JSON [IFC metadata file](/examples/metaModels/schependomlaan/).
 *
 * This will create a {@link Node} that represents the model, which is the root of a tree of {@link Entity}s ({@link Node}s
 * and {@link Mesh}es) that represent the model objects.
 *
 * This will also load a {@link MetaModel}, which contains a {@link MetaObject} for each {@link Entity}. The {@link MetaModel} will
 * have an {@link MetaModel#id} that matches the root {@link Node#id}, and will be registered by that ID on {@link Viewer#metaScene}.
 *
 * The ````node```` elements in the glTF file represent IFC objects. Each ````node```` provides its IFC object ID in
 * its ````name```` attribute.
 *
 * GLTFLoaderPlugin creates an {@link Entity} within the tree from each glTF ````node````. For each {@link Entity}, GLTFLoader maps the
 * object ID to a {@link MetaObject}. Then, using the {@link MetaObject}'s IFC type, GLTFLoader finds the initial visibility and color
 * for the {@link Entity} in the lookup map provided by {@link IFCObjectDefaults}, which specifies the default initial
 * visible states of IFC objects. For example, an "IfcWindow" is transparent and unpickable, while an "IfcSpace" is invisible.
 *
 * You can override that map with your own if needed (see {@link GLTFLoaderPlugin#objectDefaults}.
 *
 * [[Run this example](/examples/#BIMOffline_metadata_Schependomlaan)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a Viewer,
 * // 2. Arrange the camera,
 * // 3. Tweak the selection material (tone it down a bit)
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // 2
 * viewer.camera.orbitPitch(20);
 * viewer.camera.orbitYaw(-45);
 *
 * // 3
 * viewer.scene.selectedMaterial.fillAlpha = 0.1;
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a glTF loader plugin,
 * // 2. Load a glTF building model and JSON IFC metadata
 * // 3. Emphasis the edges to make it look nice
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * // 2
 * const model = gltfLoader.load({                                     // Creates a Node representing the model
 *      id: "myModel",
 *      src: "./models/gltf/schependomlaan/scene.gltf",
 *      metaModelSrc: "./metaModels/schependomlaan/metaModel.json",     // Creates a MetaModel (see below)
 *      edges: true,
 *      lambertMaterial: true
 * });
 *
 * model.on("loaded", () => {
 *
 *      //--------------------------------------------------------------------------------------------------------------
 *      // 1. Find metadata on the third storey
 *      // 2. Select all the objects in the building's third storey
 *      // 3. Fit the camera to all the objects on the third storey
 *      //--------------------------------------------------------------------------------------------------------------
 *
 *      // 1
 *      const metaModel = viewer.metaScene.metaModels["myModel"];       // MetaModel with ID "myModel"
 *      const metaObject
 *          = viewer.metaScene.metaObjects["0u4wgLe6n0ABVaiXyikbkA"];   // MetaObject with ID "0u4wgLe6n0ABVaiXyikbkA"
 *
 *      const name = metaObject.name;                                   // "01 eerste verdieping"
 *      const type = metaObject.type;                                   // "IfcBuildingStorey"
 *      const parent = metaObject.parent;                               // MetaObject with type "IfcBuilding"
 *      const children = metaObject.children;                           // Array of child MetaObjects
 *      const objectId = metaObject.id;                                 // "0u4wgLe6n0ABVaiXyikbkA"
 *      const objectIds = viewer.metaScene.getSubObjectIDs(objectId);   // IDs of leaf sub-objects
 *      const aabb = viewer.scene.getAABB(objectIds);                   // Axis-aligned boundary of the leaf sub-objects
 *
 *      // 2
 *      viewer.scene.setObjectsSelected(objectIds, true);
 *
 *      // 3
 *      viewer.cameraFlight.flyTo(aabb);
 * });
 *
 * // You can unload the model via the plugin
 * plugin.unload("myModel");
 *
 * // Or unload it by calling destroy() on the model's Node
 * model.destroy();
 * ````
 *
 * @class GLTFLoaderPlugin
 */
class GLTFLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.
     */
    constructor(viewer, cfg = {}) {

        super("GLTFLoader", viewer, cfg);

        /**
         * @private
         */
        this._loader = new GLTFLoader(this, cfg);

        /**
         * Models currently loaded by this Plugin.
         * @type {{String:Node}}
         */
        this.models = {};

        this.objectDefaults = cfg.objectDefaults;
    }

    /**
     * Sets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    set objectDefaults(value) {
        this._objectDefaults = value || IFCObjectDefaults;
    }

    /**
     * Gets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     * Loads a glTF model from a file into this GLTFLoaderPlugin's {@link Viewer}.
     *
     * Creates a tree of {@link Node}s within the Viewer's {@link Scene} that represents the model.
     *
     * The root {@link Node} will have {@link Node#isModel} set true to indicate that it represents a model, and will
     * therefore be registered in {@link Scene#models}.
     *
     * @param {*} params  Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Node#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} params.src Path to a glTF file.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file (see tutorial: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {{String:Object}} [params.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}.
     * @param {Node} [params.parent] The parent {@link Node}, if we want to graft the model's root {@link Node} into a scene graph hierarchy.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model {@link Node}'s local 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model {@link Node}'s local scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model root {@link Node}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model {@link Node}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.lambertMaterial=true]  When true, gives each {@link Mesh} the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the glTF material. This is typically used for large CAD models and will cause loading to ignore textures in the glTF.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {Node} A {@link Node} representing the loaded glTF model.
     */
    load(params = {}) {

        const self = this;

        if (this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const modelNode = new Node(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        const modelId = modelNode.id;  // In case ID was auto-generated
        const src = params.src;

        if (!src) {
            this.error("load() param expected: src");
            return modelNode; // Return new empty model
        }

        if (params.metaModelSrc) {

            const metaModelSrc = params.metaModelSrc;
            const objectDefaults = params.objectDefaults || this._objectDefaults || IFCObjectDefaults;

            this.viewer.scene.canvas.spinner.processes++;

            utils.loadJSON(metaModelSrc, (modelMetadata) => {

                self.viewer.metaScene.createMetaModel(modelId, modelMetadata);

                self.viewer.scene.canvas.spinner.processes--;

                params.handleGLTFNode = function (modelId, glTFNode, actions) {

                    // The "name" property of the glTF scene node contains the object ID, with which we can find a MetaObject
                    // in the MetaModel we just loaded. We'll create Node components in the Scene for all the nodes as we
                    // descend into them, but will give special treatment to those nodes that have a "name", ie. set initial
                    // state for those according to the MetaModel.

                    const name = glTFNode.name;

                    if (!name) {
                        return true; // Continue descending this node subtree
                    }

                    const nodeId = name;
                    const metaObject = self.viewer.metaScene.metaObjects[nodeId];
                    const type = (metaObject ? metaObject.type : "DEFAULT") || "DEFAULT";

                    actions.createNode = { // Create a Node for this glTF scene node
                        id: nodeId,
                        isObject: true // Registers the Node in Scene#objects
                    };

                    const props = objectDefaults[type];

                    if (props) { // Set Node's initial rendering state for recognized type

                        if (props.visible === false) {
                            actions.createNode.visible = false;
                        }

                        if (props.colorize) {
                            actions.createNode.colorize = props.colorize;
                        }

                        if (props.pickable === false) {
                            actions.createNode.pickable = false;
                        }

                        if (props.opacity !== undefined && props.opacity !== null) {
                            actions.createNode.opacity = props.opacity;
                        }
                    }

                    return true; // Continue descending this glTF node subtree
                };

                self._loader.load(this, modelNode, src, params);

            }, function (errMsg) {
                self.error(`load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
                self.viewer.scene.canvas.spinner.processes--;
            });
        } else {
            this._loader.load(this, modelNode, src, params);
        }

        this.models[modelId] = modelNode;

        modelNode.once("destroyed", () => {
            delete this.models[modelId];
            this.viewer.metaScene.destroyMetaModel(modelId);
            this.fire("unloaded", modelId);
        });

        return modelNode;
    }

    /**
     * Unloads a model that was loaded by this GLTFLoaderPlugin.
     *
     * @param {String} modelId  ID of model to unload.
     */
    unload(modelId) {
        const modelNode = this.models;
        if (!modelNode) {
            this.error(`unload() model with this ID not found: ${modelId}`);
            return;
        }
        modelNode.destroy();
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
     * Unloads models loaded by this GLTFLoaderPlugin.
     */
    clear() {
        for (const modelId in this.models) {
            this.models[modelId].destroy();
        }
    }

    /**
     * Destroys this BIMServerLoaderPlugin, after first unloading any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {GLTFLoaderPlugin}