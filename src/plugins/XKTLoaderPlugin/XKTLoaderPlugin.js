import {utils} from "../../viewer/scene/utils.js"
import {PerformanceModel} from "../../viewer/scene/PerformanceModel/PerformanceModel.js";
import {Plugin} from "../../viewer/Plugin.js";
import {XKTDefaultDataSource} from "./XKTDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

import "./lib/pako.js";


const decompressColor = (function () {
    const color2 = new Float32Array(3);
    return function (color) {
        color2[0] = color[0] / 255.0;
        color2[1] = color[1] / 255.0;
        color2[2] = color[2] / 255.0;
        return color2;
    };
})();

/**
 * A {@link Viewer} plugin that loads models from xeokit's *````.xkt````* format.
 *
 * <img src="https://user-images.githubusercontent.com/83100/55674490-c93c2e00-58b5-11e9-8a28-eb08876947c0.gif">
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_XKT_Duplex)]
 *
 * ## Overview
 *
 * * XKTLoaderPlugin is the most efficient way to load models in xeokit.
 * * An *````.xkt````* file is a single BLOB, compressed using geometry quantization
 * and [pako](https://nodeca.github.io/pako/).
 * * The *````.xkt````* format does not support textures or physically-based materials.
 * * Configure the position, scale and rotation of each model as you load it.
 * * Configure default initial states for objects by their IFC types.
 * * Filter what objects get loaded according to IFC types.
 * * Configure a custom data source for your *````.xkt````* and IFC metadata files.
 *
 * ## Creating *````.xkt````* files
 *
 * Use the node.js-based [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool to convert your ````glTF````BIM files to *````.xkt````* format.
 *
 * ## Scene representation
 *
 * When loading a model, XKTLoaderPlugin creates an {@link Entity} that represents the model, which
 * will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id}
 * in {@link Scene#models}. The XKTLoaderPlugin also creates an {@link Entity} for each object within the
 * model. Those Entities will have {@link Entity#isObject} set ````true```` and will be registered
 * by {@link Entity#id} in {@link Scene#objects}.
 *
 * ## Metadata
 *
 * XKTLoaderPlugin can also load an accompanying JSON metadata file with each model, which creates a {@link MetaModel} corresponding
 * to the model {@link Entity} and a {@link MetaObject} corresponding to each object {@link Entity}.
 *
 * Each {@link MetaObject} has a {@link MetaObject#type}, which indicates the classification of its corresponding {@link Entity}. When loading
 * metadata, we can also configure XKTLoaderPlugin with a custom lookup table of initial values to set on the properties of each type of {@link Entity}. By default, XKTLoaderPlugin
 * uses its own map of default colors and visibilities for IFC element types.
 *
 * ## Usage
 *
 * In the example below we'll load the Schependomlaan model from a [.xkt file](http://xeokit.github.io/xeokit-sdk/examples/models/xeokit/schependomlaan/), along
 * with an accompanying JSON [IFC metadata file](http://xeokit.github.io/xeokit-sdk/examples/metaModels/schependomlaan/).
 *
 * This will create a bunch of {@link Entity}s that represents the model and its objects, along with a {@link MetaModel} and {@link MetaObject}s
 * that hold their metadata.
 *
 * Since this model contains IFC types, the XKTLoaderPlugin will set the initial appearance of each object {@link Entity} according to its IFC type in {@link XKTLoaderPlugin#objectDefaults}.
 *
 * Read more about this example in the user guide on [Viewing BIM Models Offline](https://github.com/xeokit/xeokit-sdk/wiki/Viewing-BIM-Models-Offline).
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_metadata_Schependomlaan)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a Viewer,
 * // 2. Arrange the camera
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // 2
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a XKTLoaderPlugin,
 * // 2. Load a building model and JSON IFC metadata
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * // 2
 * const model = xktLoader.load({                                       // Returns an Entity that represents the model
 *     id: "myModel",
 *     src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *     metaModelSrc: "./metaModels/schependomlaan/metaModel.json",     // Creates a MetaModel (see below)
 *     edges: true
 * });
 *
 * model.on("loaded", () => {
 *
 *     //--------------------------------------------------------------------------------------------------------------
 *     // 1. Find metadata on the third storey
 *     // 2. Select all the objects in the building's third storey
 *     // 3. Fit the camera to all the objects on the third storey
 *     //--------------------------------------------------------------------------------------------------------------
 *
 *     // 1
 *     const metaModel = viewer.metaScene.metaModels["myModel"];       // MetaModel with ID "myModel"
 *     const metaObject
 *          = viewer.metaScene.metaObjects["0u4wgLe6n0ABVaiXyikbkA"];  // MetaObject with ID "0u4wgLe6n0ABVaiXyikbkA"
 *
 *     const name = metaObject.name;                                   // "01 eerste verdieping"
 *     const type = metaObject.type;                                   // "IfcBuildingStorey"
 *     const parent = metaObject.parent;                               // MetaObject with type "IfcBuilding"
 *     const children = metaObject.children;                           // Array of child MetaObjects
 *     const objectId = metaObject.id;                                 // "0u4wgLe6n0ABVaiXyikbkA"
 *     const objectIds = viewer.metaScene.getObjectIDsInSubtree(objectId);   // IDs of leaf sub-objects
 *     const aabb = viewer.scene.getAABB(objectIds);                   // Axis-aligned boundary of the leaf sub-objects
 *
 *     // 2
 *     viewer.scene.setObjectsSelected(objectIds, true);
 *
 *     // 3
 *     viewer.cameraFlight.flyTo(aabb);
 * });
 *
 * // Find the model Entity by ID
 * model = viewer.scene.models["myModel"];
 *
 * // Destroy the model
 * model.destroy();
 * ````
 *
 * ## Including and excluding IFC types
 *
 * We can also load only those objects that have the specified IFC types. In the example below, we'll load only the
 * objects that represent walls.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_includeTypes)]
 *
 * ````javascript
 * const model2 = xktLoader.load({
 *     id: "myModel2",
 *     src: "./models/xkt/OTCConferenceCenter/OTCConferenceCenter.xkt",
 *     metaModelSrc: "./metaModels/OTCConferenceCenter/metaModel.json",
 *     includeTypes: ["IfcWallStandardCase"]
 * });
 * ````
 *
 * We can also load only those objects that **don't** have the specified IFC types. In the example below, we'll load only the
 * objects that do not represent empty space.
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_excludeTypes)]
 *
 * ````javascript
 * const model3 = xktLoader.load({
 *     id: "myModel3",
 *     src: "./models/xkt/OTCConferenceCenter/OTCConferenceCenter.xkt",
 *     metaModelSrc: "./metaModels/OTCConferenceCenter/metaModel.json",
 *     excludeTypes: ["IfcSpace"]
 * });
 * ````
 *
 * ## Configuring initial IFC object appearances
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_XKT_objectDefaults)]
 *
 * ````javascript
 * const myObjectDefaults = {
 *      IfcRoof: {
 *          colorize: [0.337255, 0.803922, 0.270588],
 *          priority: 0
 *      },
 *      IfcSlab: {
 *          colorize: [0.837255, 0.603922, 0.670588],
 *          priority: 0
 *      },
 *      IfcWall: {
 *          colorize: [0.537255, 0.537255, 0.837255],
 *          priority: 0
 *      },
 *      IfcWallStandardCase: {
 *          colorize: [0.537255, 0.337255, 0.237255],
 *          priority: 0
 *      },
 *
 *      //...
 *
 *      DEFAULT: {
 *          colorize: [0.5, 0.5, 0.5],
 *          priority: 10
 *      }
 * };
 *
 * const model4 = xktLoader.load({
 *      id: "myModel4",
 *      src: "./models/xkt/duplex/duplex.xkt",
 *      metaModelSrc: "./metaModels/duplex/metaModel.json", // Creates a MetaObject instances in scene.metaScene.metaObjects
 *      objectDefaults: myObjectDefaults // Use our custom initial default states for object Entities
 * });
 * ````
 *
 * ## Configuring a custom data source
 *
 * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/#loading_XKT_dataSource)]
 *
 * ````javascript
 * import {utils} from "./../src/viewer/scene/utils.js";
 *
 * class MyDataSource {
 *
 *      constructor() {
 *      }
 *
 *      // Gets metamodel JSON
 *      getMetaModel(metaModelSrc, ok, error) {
 *          console.log("MyDataSource#getMetaModel(" + metaModelSrc + ", ... )");
 *          utils.loadJSON(metaModelSrc,
 *              (json) => {
 *                  ok(json);
 *              },
 *              function (errMsg) {
 *                  error(errMsg);
 *              });
 *      }
 *
 *      // Gets the contents of the given .xkt file in an arraybuffer
 *      getXKT(src, ok, error) {
 *          console.log("MyDataSource#getXKT(" + xKTSrc + ", ... )");
 *          utils.loadArraybuffer(src,
 *              (arraybuffer) => {
 *                  ok(arraybuffer);
 *              },
 *              function (errMsg) {
 *                  error(errMsg);
 *              });
 *      }
 * }
 *
 * const xktLoader2 = new XKTLoaderPlugin(viewer, {
 *       dataSource: new MyDataSource()
 * });
 *
 * const model5 = xktLoader2.load({
 *      id: "myModel5",
 *      src: "./models/xkt/duplex/duplex.xkt",
 *      metaModelSrc: "./metaModels/duplex/metaModel.json" // Creates a MetaObject instances in scene.metaScene.metaObjects
 * });
 * ````
 * @class XKTLoaderPlugin
 */
class XKTLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="XKTLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.
     * @param {Object} [cfg.dataSource] A custom data source through which the XKTLoaderPlugin can load model and metadata files. Defaults to an instance of {@link XKTDefaultDataSource}, which loads uover HTTP.
     * @param {String[]} [cfg.includeTypes] When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {String[]} [cfg.excludeTypes] When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     */
    constructor(viewer, cfg = {}) {

        super("XKTLoader", viewer, cfg);

        this.dataSource = cfg.dataSource;
        this.objectDefaults = cfg.objectDefaults;
        this.includeTypes = cfg.includeTypes;
        this.excludeTypes = cfg.excludeTypes;
    }

    /**
     * Sets a custom data source through which the XKTLoaderPlugin can load models and metadata.
     *
     * Default value is {@link XKTDefaultDataSource}, which loads via HTTP.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new XKTDefaultDataSource();
    }

    /**
     * Gets the custom data source through which the XKTLoaderPlugin can load models and metadata.
     *
     * Default value is {@link XKTDefaultDataSource}, which loads via HTTP.
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
     * Sets the whitelist of the IFC types loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject#type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    set includeTypes(value) {
        this._includeTypes = value;
    }

    /**
     * Gets the whitelist of the IFC types loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to only load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject#type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    get includeTypes() {
        return this._includeTypes;
    }

    /**
     * Sets the blacklist of IFC types that are never loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to **not** load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject#type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    set excludeTypes(value) {
        this._excludeTypes = value;
    }

    /**
     * Gets the blacklist of IFC types that are never loaded by this XKTLoaderPlugin.
     *
     * When loading models with metadata, causes this XKTLoaderPlugin to **not** load objects whose types are in this
     * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject#type}.
     *
     * Default value is ````undefined````.
     *
     * @type {String[]}
     */
    get excludeTypes() {
        return this._excludeTypes;
    }

    /**
     * Loads a .xkt model into this XKTLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a *````.xkt````* file, as an alternative to the ````xkt```` parameter.
     * @param {ArrayBuffer} [params.xkt] The *````.xkt````* file data, as an alternative to the ````src```` parameter.
     * @param {String} [params.metaModelSrc] Path to an optional metadata file, as an alternative to the ````metaModelData```` parameter (see user guide: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {*} [params.metaModelData] JSON model metadata, as an alternative to the ````metaModelSrc```` parameter (see user guide: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {{String:Object}} [params.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}.
     * @param {String[]} [params.includeTypes] When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {String[]} [params.excludeTypes] When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model World-space 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model's World-space scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.edges=false] Indicates if the model's edges are initially emphasized.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
     */
    load(params = {}) {

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const performanceModel = new PerformanceModel(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        const modelId = performanceModel.id;  // In case ID was auto-generated

        if (!params.src && !params.xkt) {
            this.error("load() param expected: src or xkt");
            return performanceModel; // Return new empty model
        }

        const options = {};

        if (params.metaModelSrc || params.metaModelData) {

            const includeTypes = params.includeTypes || this._includeTypes;
            const excludeTypes = params.excludeTypes || this._excludeTypes;

            const processMetaModelData = (metaModelData) => {

                this.viewer.metaScene.createMetaModel(modelId, metaModelData, {
                    includeTypes: includeTypes,
                    excludeTypes: excludeTypes
                });

                this.viewer.scene.canvas.spinner.processes--;

                if (includeTypes) {
                    options.includeTypesMap = {};
                    for (let i = 0, len = includeTypes.length; i < len; i++) {
                        options.includeTypesMap[includeTypes[i]] = true;
                    }
                }

                if (excludeTypes) {
                    options.excludeTypesMap = {};
                    for (let i = 0, len = excludeTypes.length; i < len; i++) {
                        options.excludeTypesMap[excludeTypes[i]] = true;
                    }
                }

                if (params.src) {
                    this._loadModel(params.src, params, options, performanceModel);

                } else {
                    this._parseModel(params.xkt, params, options, performanceModel);
                }
            };

            if (params.metaModelSrc) {

                const metaModelSrc = params.metaModelSrc;

                this.viewer.scene.canvas.spinner.processes++;

                this._dataSource.getMetaModel(metaModelSrc, (metaModelData) => {

                    this.viewer.scene.canvas.spinner.processes--;

                    processMetaModelData(metaModelData);

                }, (errMsg) => {
                    this.error(`load(): Failed to load model metadata for model '${modelId} from  '${metaModelSrc}' - ${errMsg}`);
                    this.viewer.scene.canvas.spinner.processes--;
                });

            } else if (params.metaModelData) {

                processMetaModelData(params.metaModelData);
            }

        } else {

            if (params.src) {
                this._loadModel(params.src, params, options, performanceModel);

            } else {
                this._parseModel(params.xkt, params, options, performanceModel);
            }
        }

        performanceModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return performanceModel;
    }

    _loadModel(src, params, options, performanceModel) {
        const spinner = this.viewer.scene.canvas.spinner;
        spinner.processes++;
        this._dataSource.getXKT(params.src, (arrayBuffer) => {
                this._parseModel(arrayBuffer, params, options, performanceModel);
                spinner.processes--;
                this.viewer.scene.once("tick", () => {
                    performanceModel.fire("loaded", true);
                });
            },
            (errMsg) => {
                spinner.processes--;
                this.error(errMsg);
                performanceModel.fire("error", errMsg);
            });
    }

    _parseModel(arrayBuffer, params, options, performanceModel) {
        const compressedData = XKTLoaderPlugin._extractData(arrayBuffer);
        const decompressedData = XKTLoaderPlugin._decompressData(compressedData);
        this._loadDataIntoModel(decompressedData, options, performanceModel);
    }

    static _extractData(arrayBuffer) {

        const dataView = new DataView(arrayBuffer);
        const dataArray = new Uint8Array(arrayBuffer);
        const numElements = dataView.getUint32(0, true);
        const elements = [];

        var byteOffset = (numElements + 1) * 4;
        for (var i = 0; i < numElements; i++) {
            const elementSize = dataView.getUint32((i + 1) * 4, true);
            elements.push(dataArray.slice(byteOffset, byteOffset + elementSize));
            byteOffset += elementSize;
        }

        return {

            positions: elements[0],
            normals: elements[1],
            indices: elements[2],
            edgeIndices: elements[3],

            colors: elements[4],
            matrices: elements[5],
            opacities: elements[6],
            aabbs: elements[7],

            meshPositions: elements[8],
            meshNormals: elements[9],
            meshIndices: elements[10],
            meshEdgesIndices: elements[11],

            meshColors: elements[12],
            meshMatrices: elements[13],
            meshOpacities: elements[14],
            meshAABBs: elements[15],

            entityIDs: elements[16],
            entityMeshes: elements[17],
            entityIsObjects: elements[18],

            positionsDecodeMatrix: elements[19]
        };
    }

    static _decompressData(compressedData) {

        return {

            positions: pako.inflate(compressedData.positions.buffer),
            normals: pako.inflate(compressedData.normals.buffer),
            indices: pako.inflate(compressedData.indices.buffer),
            edgeIndices: pako.inflate(compressedData.edgeIndices.buffer),

            colors: pako.inflate(compressedData.colors.buffer),
            matrices: pako.inflate(compressedData.matrices.buffer),
            opacities: pako.inflate(compressedData.opacities.buffer),
            aabbs: pako.inflate(compressedData.aabbs.buffer),

            meshPositions: pako.inflate(compressedData.meshPositions.buffer),
            meshNormals: pako.inflate(compressedData.meshNormals.buffer),
            meshIndices: pako.inflate(compressedData.meshIndices.buffer),
            meshEdgesIndices: pako.inflate(compressedData.meshEdgesIndices.buffer),

            meshColors: pako.inflate(compressedData.meshColors.buffer),
            meshMatrices: pako.inflate(compressedData.meshMatrices.buffer),
            meshOpacities: pako.inflate(compressedData.meshOpacities.buffer),
            meshAABBs: pako.inflate(compressedData.meshAABBs.buffer),

            entityIDs: pako.inflate(compressedData.entityIDs, {to: 'string'}),
            entityMeshes: pako.inflate(compressedData.entityMeshes.buffer),
            entityIsObjects: pako.inflate(compressedData.entityIsObjects),

            positionsDecodeMatrix: pako.inflate(compressedData.positionsDecodeMatrix),
        };
    }

    _loadDataIntoModel(data, options, performanceModel) {

        const positions = new Uint16Array(data.positions.buffer);
        const normals = new Int8Array(data.normals.buffer);
        const indices = new Uint32Array(data.indices.buffer);
        const edgeIndices = new Uint32Array(data.edgeIndices.buffer);

        const colors = new Uint8Array(data.colors.buffer);
        const matrices = new Float32Array(data.matrices.buffer);
        const opacities = new Uint8Array(data.opacities.buffer);
        const aabbs = new Float32Array(data.aabbs.buffer);

        const meshPositions = new Uint32Array(data.meshPositions.buffer);
        const meshIndices = new Uint32Array(data.meshIndices.buffer);
        const meshEdgesIndices = new Uint32Array(data.meshEdgesIndices.buffer);

        const meshColors = new Uint32Array(data.meshColors.buffer);
        const meshMatrices = new Uint32Array(data.meshMatrices.buffer);
        const meshNormals = new Uint32Array(data.meshNormals.buffer);
        const meshOpacities = new Uint32Array(data.meshOpacities.buffer);
        const meshAABBs = new Uint32Array(data.meshAABBs.buffer);

        const entityIDs = JSON.parse(data.entityIDs);
        const entityMeshes = new Uint32Array(data.entityMeshes.buffer);
        const entityIsObjects = new Uint8Array(data.entityIsObjects.buffer);

        const positionsDecodeMatrix = new Float32Array(data.positionsDecodeMatrix.buffer);

        const numMeshes = meshColors.length;
        const numEntities = entityMeshes.length;

        //------------------------------------------------------------------
        // TODO: Only load meshes for whitelisted/non-blacklisted entities
        //------------------------------------------------------------------

        for (let meshIdx = 0; meshIdx < numMeshes; meshIdx++) {

            const last = (meshIdx === (numMeshes - 1));

            const meshCfg = {

                id: performanceModel.id + "." + meshIdx,

                primitive: "triangles",
                positions: positions.slice(meshPositions [meshIdx], last ? meshPositions.length : meshPositions [meshIdx + 1]),
                normals: normals.slice(meshNormals [meshIdx], last ? meshNormals.length : meshNormals [meshIdx + 1]),
                indices: indices.slice(meshIndices [meshIdx], last ? meshIndices.length : meshIndices [meshIdx + 1]),
                edgeIndices: edgeIndices.slice(meshEdgesIndices [meshIdx], last ? meshEdgesIndices.length : meshEdgesIndices [meshIdx + 1]),

                positionsAndNormalsCompressed: true,
                positionsDecodeMatrix: positionsDecodeMatrix,

                color: decompressColor(colors.slice(meshColors [meshIdx], last ? meshColors.length : meshColors [meshIdx + 1])),
                matrix: matrices.slice(meshMatrices [meshIdx], meshMatrices [meshIdx] + 16),
                opacity: opacities [meshOpacities [meshIdx]] / 255.0,

                aabb: aabbs.slice(meshAABBs [meshIdx], meshAABBs [meshIdx] + 6)
            };

            performanceModel.createMesh(meshCfg);
        }

        for (let entityIdx = 0; entityIdx < numEntities; entityIdx++) {

            const last = (entityIdx === numEntities - 1);
            const meshIds = [];

            for (let meshIdx = entityMeshes [entityIdx], to = last ? entityMeshes.length : entityMeshes [entityIdx + 1]; meshIdx < to; meshIdx++) {
                meshIds.push(performanceModel.id + "." + meshIdx);
            }

            const entityId = entityIDs [entityIdx];
            const entityCfg = {
                id: entityId,
                isObject: (entityIsObjects [entityIdx] === 1),
                meshIds: meshIds,
            };

            const metaObject = this.viewer.metaScene.metaObjects[entityId];

            if (metaObject) {

                const props = this.objectDefaults[metaObject.type || "DEFAULT"];

                if (props) {
                    if (props.visible === false) {
                        entityCfg.visible = false;
                    }
                    if (props.colorize) {
                        entityCfg.colorize = props.colorize;
                    }
                    if (props.pickable === false) {
                        entityCfg.pickable = false;
                    }
                    if (props.opacity !== undefined && props.opacity !== null) {
                        entityCfg.opacity = props.opacity;
                    }
                }
            }

            performanceModel.createEntity(entityCfg);
        }

        performanceModel.finalize();
    }
}

export {XKTLoaderPlugin}