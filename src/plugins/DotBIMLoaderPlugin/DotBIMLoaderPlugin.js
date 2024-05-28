import {Plugin, SceneModel, utils} from "../../viewer/index.js"
import {math} from "../../viewer/scene/math/math.js";
import {DotBIMDefaultDataSource} from "./DotBIMDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

/**
 * {@link Viewer} plugin that loads models from [.bim](https://dotbim.net/) format.
 *
 * * Creates an {@link Entity} representing each model it loads, which will have {@link Entity#isModel} set ````true````
 * and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the model. Those Entities will have {@link Entity#isObject}
 * set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space,
 * along with initial properties for all the model's {@link Entity}s.
 *
 * ## Usage
 *
 * In the example below we'll load a house model from a [.BIM file](/assets/models/dotbim/House.bim).
 *
 * This will create a bunch of {@link Entity}s that represents the model and its objects, along with
 * a {@link MetaModel} and {@link MetaObject}s that hold their metadata.
 *
 * ````javascript
 * import {Viewer, DotBIMLoaderPlugin} from "xeokit-sdk.es.js";
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
 * // 1. Create a .bim loader plugin,
 * // 2. Load a .bim building model
 * // 3. Emphasis the edges to make it look nice
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const dotBIMLoader = new DotBIMLoaderPlugin(viewer);
 *
 * // 2
 * var model = dotBIMLoader.load({                                    // Returns an Entity that represents the model
 *      id: "myModel",
 *      src: "../../assets/models/dotbim/House.bim",
 *      edges: true
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
 * We have the option to rotate, scale and translate each  *````.bim````* model as we load it.
 *
 * This lets us load multiple models, or even multiple copies of the same model, and position them apart from each other.
 *
 * In the example below, we'll rotate our model 90 degrees about its local X-axis, then
 * translate it 100 units along its X axis.
 *
 * ````javascript
 * const model = dotBIMLoader.load({
 *      src: "../../assets/models/dotbim/House.bim",
 *      rotation: [90,0,0],
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
 * const model = dotBIMLoader.load({
 *     id: "myModel",
 *      src: "../../assets/models/dotbim/House.bim",
 *      includeTypes: ["IfcWallStandardCase"]
 * });
 * ````
 *
 * We can also load only those objects that **don't** have the specified IFC types. In the example below, we'll load only the
 * objects that do not represent empty space.
 *
 * ````javascript
 * const model = dotBIMLoader.load({
 *     id: "myModel",
 *      src: "../../assets/models/dotbim/House.bim",
 *      excludeTypes: ["IfcSpace"]
 * });
 * ````
 * @class DotBIMLoaderPlugin
 */
export class DotBIMLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="DotBIMLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.
     * @param {Object} [cfg.dataSource] A custom data source through which the DotBIMLoaderPlugin can load metadata, glTF and binary attachments. Defaults to an instance of {@link DotBIMDefaultDataSource}, which loads over HTTP.
     */
    constructor(viewer, cfg = {}) {

        super("DotBIMLoader", viewer, cfg);

        this.dataSource = cfg.dataSource;
        this.objectDefaults = cfg.objectDefaults;
    }

    /**
     * Sets a custom data source through which the DotBIMLoaderPlugin can .BIM files.
     *
     * Default value is {@link DotBIMDefaultDataSource}, which loads via an XMLHttpRequest.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new DotBIMDefaultDataSource();
    }

    /**
     * Gets the custom data source through which the DotBIMLoaderPlugin can load .BIM files.
     *
     * Default value is {@link DotBIMDefaultDataSource}, which loads via an XMLHttpRequest.
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
     * Loads a .BIM model from a file into this DotBIMLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a .BIM file, as an alternative to the ````bim```` parameter.
     * @param {*} [params.bim] .BIM JSON, as an alternative to the ````src```` parameter.
     * @param {{String:Object}} [params.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}.
     * @param {String[]} [params.includeTypes] When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {String[]} [params.excludeTypes] When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject#type} values in this list.
     * @param {Number[]} [params.origin=[0,0,0]] The double-precision World-space origin of the model's coordinates.
     * @param {Number[]} [params.position=[0,0,0]] The single-precision position, relative to ````origin````.
     * @param {Number[]} [params.scale=[1,1,1]] The model's scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's orientation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Boolean} [params.backfaces=true] When true, always show backfaces, even on objects for which the .BIM material is single-sided. When false, only show backfaces on geometries whenever the .BIM material is double-sided.
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
            backfaces: params.backfaces,
            dtxEnabled: params.dtxEnabled,
            rotation: params.rotation,
            origin: params.origin
        }));

        const modelId = sceneModel.id;  // In case ID was auto-generated

        if (!params.src && !params.dotBIM) {
            this.error("load() param expected: src or dotBIM");
            return sceneModel; // Return new empty model
        }

        const objectDefaults = params.objectDefaults || this._objectDefaults || IFCObjectDefaults;

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

        const parseDotBIM = (ctx) => {

            const fileData = ctx.fileData;
            const sceneModel = ctx.sceneModel;

            const dbMeshIndices = {};
            const dbMeshLoaded = {};

            const ifcProjectId = math.createUUID();
            const ifcSiteId = math.createUUID();
            const ifcBuildingId = math.createUUID();
            const ifcBuildingStoryId = math.createUUID();

            const metaModelData = {
                metaObjects: [{
                    id: ifcProjectId,
                    name: "Project Number",
                    type: "IfcProject",
                    parent: null
                },
                    {
                        id: ifcSiteId,
                        name: "Default",
                        type: "IfcSite",
                        parent: ifcProjectId
                    },
                    {
                        id: ifcBuildingId,
                        name: "",
                        type: "IfcBuilding",
                        parent: ifcSiteId
                    },
                    {
                        id: ifcBuildingStoryId,
                        name: "Level 1",
                        type: "IfcBuildingStorey",
                        parent: ifcBuildingId
                    }
                ],
                propertySets: []
            };


            for (let i = 0, len = fileData.meshes.length; i < len; i++) {
                const dbMesh = fileData.meshes[i];
                dbMeshIndices[dbMesh.mesh_id] = i;
            }

            const parseDBMesh = (dbMeshId) => {
                if (dbMeshLoaded[dbMeshId]) {
                    return;
                }
                const dbMeshIndex = dbMeshIndices[dbMeshId];
                const dbMesh = fileData.meshes[dbMeshIndex];
                sceneModel.createGeometry({
                    id: dbMeshId,
                    primitive: "triangles",
                    positions: dbMesh.coordinates,
                    indices: dbMesh.indices
                });
                dbMeshLoaded[dbMeshId] = true;
            }

            const dbElements = fileData.elements;
            for (let i = 0, len = dbElements.length; i < len; i++) {
                const element = dbElements[i];
                const elementType = element.type;
                if (excludeTypes && excludeTypes[elementType]) {
                    continue;

                }
                if (includeTypes && (!includeTypes[elementType])) {
                    continue;
                }
                const info = element.info;
                const objectId =
                    element.guid !== undefined
                        ? `${element.guid}`
                        : (info !== undefined && info.id !== undefined
                            ? info.id
                            : i);

                const dbMeshId = element.mesh_id;

                parseDBMesh(dbMeshId);

                const meshId = `${objectId}-mesh`;
                const vector = element.vector;
                const rotation = element.rotation;
                const props = objectDefaults ? objectDefaults[elementType] || objectDefaults["DEFAULT"] : null;

                let visible = true;
                let pickable = true;
                let color = element.color ? [element.color.r / 255, element.color.g / 255, element.color.b / 255] : [1, 1, 1];
                let opacity = element.color ? element.color.a / 255 : 1.0;

                if (props) {
                    if (props.visible === false) {
                        visible = false;
                    }
                    if (props.pickable === false) {
                        pickable = false;
                    }
                    if (props.colorize) {
                        color = props.colorize;
                    }
                    if (props.opacity !== undefined && props.opacity !== null) {
                        opacity = props.opacity;
                    }
                }

                sceneModel.createMesh({
                    id: meshId,
                    geometryId: dbMeshId,
                    color,
                    opacity,
                    quaternion: rotation && (rotation.qz !== 0 || rotation.qy !== 0 || rotation.qx !== 0 || rotation.qw !== 1.0) ? [rotation.qx, rotation.qy, rotation.qz, rotation.qw] : undefined,
                    position: vector ? [vector.x, vector.y, vector.z] : undefined
                });

                sceneModel.createEntity({
                    id: objectId,
                    meshIds: [meshId],
                    visible,
                    pickable,
                    isObject: true
                });

                metaModelData.metaObjects.push({
                    id: objectId,
                    name: info && info.Name && info.Name !== "None" ? info.Name : `${element.type} ${objectId}`,
                    type: element.type,
                    parent: ifcBuildingStoryId
                });
            }

            sceneModel.finalize();

            this.viewer.metaScene.createMetaModel(modelId, metaModelData);

            sceneModel.scene.once("tick", () => {
                if (sceneModel.destroyed) {
                    return;
                }
                sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                sceneModel.fire("loaded", true, false); // Don't forget the event, for late subscribers
            });
        }

        if (params.src) {
            const src = params.src;
            this.viewer.scene.canvas.spinner.processes++;
            this._dataSource.getDotBIM(src, (fileData) => { // OK
                    const ctx = {
                        fileData,
                        sceneModel,
                        nextId: 0,
                        error: function (errMsg) {
                        }
                    };
                    parseDotBIM(ctx);
                    this.viewer.scene.canvas.spinner.processes--;
                },
                (err) => {
                    this.viewer.scene.canvas.spinner.processes--;
                    this.error(err);
                });
        } else if (params.dotBIM) {
            const ctx = {
                fileData: params.dotBIM,
                sceneModel,
                nextId: 0,
                error: function (errMsg) {
                }
            };
            parseDotBIM(ctx);
        }

        sceneModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return sceneModel;
    }

    /**
     * Destroys this DotBIMLoaderPlugin.
     */
    destroy() {
        super.destroy();
    }
}
