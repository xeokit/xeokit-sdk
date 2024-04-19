import {Plugin, SceneModel, utils} from "../../viewer/index.js"
import {GLTFSceneModelLoader} from "./GLTFSceneModelLoader.js";

import {GLTFDefaultDataSource} from "./GLTFDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

/**
 * {@link Viewer} plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 *
 * * Loads all glTF formats, including embedded and binary formats.
 * * Loads physically-based materials and textures.
 * * Creates an {@link Entity} representing each model it loads, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the model, which is indicated by each glTF ````node```` that has a ````name```` attribute. Those Entities will have {@link Entity#isObject} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space, along with initial properties for all the model's {@link Entity}s.
 * * Not recommended for large models. For best performance with large glTF datasets, we recommend first converting them
 * to ````.xkt```` format (eg. using [convert2xkt](https://github.com/xeokit/xeokit-convert)), then loading
 * the ````.xkt```` using {@link XKTLoaderPlugin}.
 *
 * ## Metadata
 *
 * GLTFLoaderPlugin can also load an accompanying JSON metadata file with each model, which creates a {@link MetaModel} corresponding
 * to the model {@link Entity} and a {@link MetaObject} corresponding to each object {@link Entity}.
 *
 * Each {@link MetaObject} has a {@link MetaObject#type}, which indicates the classification of its corresponding {@link Entity}. When loading
 * metadata, we can also provide GLTFLoaderPlugin with a custom lookup table of initial values to set on the properties of each type of {@link Entity}. By default, GLTFLoaderPlugin
 * uses its own map of default colors and visibilities for IFC element types.
 *
 * ## Usage
 *
 * In the example below we'll load a house plan model from a [binary glTF file](/examples/models/gltf/schependomlaan/), along
 * with an accompanying JSON [IFC metadata file](/examples/metaModels/schependomlaan/).
 *
 * This will create a bunch of {@link Entity}s that represents the model and its objects, along with a {@link MetaModel} and {@link MetaObject}s
 * that hold their metadata.
 *
 * Since this model contains IFC types, the GLTFLoaderPlugin will set the initial colors of object {@link Entity}s according
 * to the standard IFC element colors in the GLTFModel's current map. Override that with your own map via property {@link GLTFLoaderPlugin#objectDefaults}.
 *
 * Read more about this example in the user guide on [Viewing BIM Models Offline](https://www.notion.so/xeokit/Viewing-an-IFC-Model-with-xeokit-c373e48bc4094ff5b6e5c5700ff580ee).
 *
 * ````javascript
 * import {Viewer, GLTFLoaderPlugin} from "xeokit-sdk.es.js";
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
 * var model = gltfLoader.load({                                    // Returns an Entity that represents the model
 *      id: "myModel",
 *      src: "./models/gltf/OTCConferenceCenter/scene.gltf",
 *      metaModelSrc: "./models/gltf/OTCConferenceCenter/metaModel.json",     // Creates a MetaModel (see below)
 *      edges: true
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
 *      const objectIds = viewer.metaScene.getObjectIDsInSubtree(objectId);   // IDs of leaf sub-objects
 *      const aabb = viewer.scene.getAABB(objectIds);                   // Axis-aligned boundary of the leaf sub-objects
 *
 *      // 2
 *      viewer.scene.setObjectsSelected(objectIds, true);
 *
 *      // 3
 *      viewer.cameraFlight.flyTo(aabb);
 * });
 *
 * // Find the model Entity by ID
 * model = viewer.scene.models["myModel"];
 *
 * // Destroy the model
 * model.destroy();
 * ````
 *
 * ## Transforming
 *
 * We have the option to rotate, scale and translate each  *````.glTF````* model as we load it.
 *
 * This lets us load multiple models, or even multiple copies of the same model, and position them apart from each other.
 *
 * In the example below, we'll scale our model to half its size, rotate it 90 degrees about its local X-axis, then
 * translate it 100 units along its X axis.
 *
 * ````javascript
 * const model = gltfLoader.load({
 *      src: "./models/gltf/Duplex/scene.gltf",
 *      metaModelSrc: "./models/gltf/Duplex/Duplex.json",
 *      rotation: [90,0,0],
 *      scale: [0.5, 0.5, 0.5],
 *      position: [100, 0, 0]
 * });
 * ````
 *
 * ## Including and excluding IFC types
 *
 * We can also load only those objects that have the specified IFC types. In the example below, we'll load only the
 * objects that represent walls.
 *
 * ````javascript
 * const model = gltfLoader.load({
 *     id: "myModel",
 *      src: "./models/gltf/OTCConferenceCenter/scene.gltf",
 *      metaModelSrc: "./models/gltf/OTCConferenceCenter/metaModel.json",
 *      includeTypes: ["IfcWallStandardCase"]
 * });
 * ````
 *
 * We can also load only those objects that **don't** have the specified IFC types. In the example below, we'll load only the
 * objects that do not represent empty space.
 *
 * ````javascript
 * const model = gltfLoader.load({
 *     id: "myModel",
 *      src: "./models/gltf/OTCConferenceCenter/scene.gltf",
 *      metaModelSrc: "./models/gltf/OTCConferenceCenter/metaModel.json",
 *      excludeTypes: ["IfcSpace"]
 * });
 * ````
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
     * @param {Object} [cfg.dataSource] A custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments. Defaults to an instance of {@link GLTFDefaultDataSource}, which loads over HTTP.
     */
    constructor(viewer, cfg = {}) {

        super("GLTFLoader", viewer, cfg);

        this._sceneModelLoader = new GLTFSceneModelLoader(this, cfg);

        this.dataSource = cfg.dataSource;
        this.objectDefaults = cfg.objectDefaults;
    }

    /**
     * Sets a custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments.
     *
     * Default value is {@link GLTFDefaultDataSource}, which loads via an XMLHttpRequest.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new GLTFDefaultDataSource();
    }

    /**
     * Gets the custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments.
     *
     * Default value is {@link GLTFDefaultDataSource}, which loads via an XMLHttpRequest.
     *
     * @type {Object}
     */
    get dataSource() {
        return this._dataSource;
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
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a glTF file, as an alternative to the ````gltf```` parameter.
     * @param {*} [params.gltf] glTF JSON, as an alternative to the ````src```` parameter.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file, as an alternative to the ````metaModelJSON```` parameter.
     * @param {*} [params.metaModelJSON] JSON model metadata, as an alternative to the ````metaModelSrc```` parameter.
     * @param {{String:Object}} [params.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}.
     * @param {String[]} [params.includeTypes] When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {String[]} [params.excludeTypes] When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.origin=[0,0,0]] The double-precision World-space origin of the model's coordinates.
     * @param {Number[]} [params.position=[0,0,0]] The single-precision position, relative to ````origin````.
     * @param {Number[]} [params.scale=[1,1,1]] The model's scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's orientation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````.
     * @param {Boolean} [params.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) is enabled for the model. SAO is configured by the Scene's {@link SAO} component. Only works when {@link SAO#enabled} is also ````true````
     * @param {Boolean} [params.pbrEnabled=true] Indicates if physically-based rendering (PBR) is enabled for the model. Overrides ````colorTextureEnabled````. Only works when {@link Scene#pbrEnabled} is also ````true````.
     * @param {Boolean} [params.colorTextureEnabled=true] Indicates if base color texture rendering is enabled for the model. Overridden by ````pbrEnabled````.  Only works when {@link Scene#colorTextureEnabled} is also ````true````.
     * @param {Boolean} [params.backfaces=true] When true, always show backfaces, even on objects for which the glTF material is single-sided. When false, only show backfaces on geometries whenever the glTF material is double-sided.
     * @param {Number} [params.edgeThreshold=10] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Boolean} [params.dtxEnabled=true] When ````true```` (default) use data textures (DTX), where appropriate, to
     * represent the returned model. Set false to always use vertex buffer objects (VBOs). Note that DTX is only applicable
     * to non-textured triangle meshes, and that VBOs are always used for meshes that have textures, line segments, or point
     * primitives. Only works while {@link DTX#enabled} is also ````true````.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}
     */
    load(params = {}) {

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const sceneModel = new SceneModel(this.viewer.scene, utils.apply(params, {
            isModel: true,
            dtxEnabled: params.dtxEnabled
        }));

        const modelId = sceneModel.id;  // In case ID was auto-generated

        if (!params.src && !params.gltf) {
            this.error("load() param expected: src or gltf");
            return sceneModel; // Return new empty model
        }

        if (params.metaModelSrc || params.metaModelJSON) {

            const objectDefaults = params.objectDefaults || this._objectDefaults || IFCObjectDefaults;

            const processMetaModelJSON = (metaModelJSON) => {

                this.viewer.metaScene.createMetaModel(modelId, metaModelJSON, {
                    includeTypes: params.includeTypes,
                    excludeTypes: params.excludeTypes
                });

                this.viewer.scene.canvas.spinner.processes--;

                let includeTypes;
                if (params.includeTypes) {
                    includeTypes = {};
                    for (let i = 0, len = params.includeTypes.length; i < len; i++) {
                        includeTypes[params.includeTypes[i]] = true;
                    }
                }

                let excludeTypes;
                if (params.excludeTypes) {
                    excludeTypes = {};
                    if (!includeTypes) {
                        includeTypes = {};
                    }
                    for (let i = 0, len = params.excludeTypes.length; i < len; i++) {
                        includeTypes[params.excludeTypes[i]] = true;
                    }
                }

                params.readableGeometry = false;

                params.handleGLTFNode = (modelId, glTFNode, actions) => {

                    const name = glTFNode.name;

                    if (!name) {
                        return true; // Continue descending this node subtree
                    }

                    const nodeId = name;
                    const metaObject = this.viewer.metaScene.metaObjects[nodeId];
                    const type = (metaObject ? metaObject.type : "DEFAULT") || "DEFAULT";

                    actions.createEntity = {
                        id: nodeId,
                        isObject: true // Registers the Entity in Scene#objects
                    };

                    const props = objectDefaults[type];

                    if (props) { // Set Entity's initial rendering state for recognized type

                        if (props.visible === false) {
                            actions.createEntity.visible = false;
                        }

                        if (props.colorize) {
                            actions.createEntity.colorize = props.colorize;
                        }

                        if (props.pickable === false) {
                            actions.createEntity.pickable = false;
                        }

                        if (props.opacity !== undefined && props.opacity !== null) {
                            actions.createEntity.opacity = props.opacity;
                        }
                    }

                    return true; // Continue descending this glTF node subtree
                };

                if (params.src) {
                    this._sceneModelLoader.load(this, params.src, metaModelJSON, params, sceneModel);
                } else {
                    this._sceneModelLoader.parse(this, params.gltf, metaModelJSON, params, sceneModel);
                }
            };

            if (params.metaModelSrc) {

                const metaModelSrc = params.metaModelSrc;

                this.viewer.scene.canvas.spinner.processes++;

                this._dataSource.getMetaModel(metaModelSrc, (metaModelJSON) => {

                    this.viewer.scene.canvas.spinner.processes--;

                    processMetaModelJSON(metaModelJSON);

                }, (errMsg) => {
                    this.error(`load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
                    this.viewer.scene.canvas.spinner.processes--;
                });

            } else if (params.metaModelJSON) {

                processMetaModelJSON(params.metaModelJSON);
            }

        } else {

            params.handleGLTFNode = (modelId, glTFNode, actions) => {

                const name = glTFNode.name;

                if (!name) {
                    return true; // Continue descending this node subtree
                }

                const id = name;

                actions.createEntity = { // Create an Entity for this glTF scene node
                    id: id,
                    isObject: true // Registers the Entity in Scene#objects
                };

                return true; // Continue descending this glTF node subtree
            };


            if (params.src) {
                this._sceneModelLoader.load(this, params.src, null, params, sceneModel);
            } else {
                this._sceneModelLoader.parse(this, params.gltf, null, params, sceneModel);
            }
        }

        sceneModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return sceneModel;
    }

    /**
     * Destroys this GLTFLoaderPlugin.
     */
    destroy() {
        super.destroy();
    }
}

export {GLTFLoaderPlugin}