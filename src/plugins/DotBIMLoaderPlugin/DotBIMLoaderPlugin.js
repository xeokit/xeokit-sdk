import {Plugin, SceneModel, utils} from "../../viewer/index.js"
import {math} from "../../viewer/scene/math/math.js";
import {DotBIMDefaultDataSource} from "./DotBIMDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

/**
 * {@link Viewer} plugin that loads models from [.bim](https://dotbim.net/) format.
 *
 * [<img src="https://xeokit.github.io/xeokit-sdk/assets/images/DotBIMLoaderPlugin-house.png">](https://xeokit.github.io/xeokit-sdk/examples/buildings/#dotbim_House)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/buildings/#dotbim_House)]
 *
 * * Creates an {@link Entity} representing each .bim model it loads, which will have {@link Entity#isModel} set ````true````
 * and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the .bim model. Those Entities will have {@link Entity#isObject}
 * set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space,
 * along with initial properties for all the model's {@link Entity}s.
 * * Allows to mask which types we want to load.
 * * Allows to configure initial viewer state for specified types (color, visibility, selection, highlighted, X-rayed, pickable, etc).
 *
 * ## Usage
 *
 * In the example below we'll load a house model from a [.bim file](/assets/models/dotbim/House.bim).
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
 * // 2. Load a .bim building model, emphasizing the edges to make it look nicer
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const dotBIMLoader = new DotBIMLoaderPlugin(viewer);
 *
 * // 2
 * var model = dotBIMLoader.load({                                    // Returns an Entity that represents the model
 *      id: "myModel",
 *      src: "House.bim",
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
 *      src: "House.bim",
 *      rotation: [90,0,0],
 *      position: [100, 0, 0]
 * });
 * ````
 *
 * ## Including and excluding types
 *
 * We can also load only those objects that have the specified types. In the example below, we'll load only the
 * objects that represent walls.
 *
 * ````javascript
 * const model = dotBIMLoader.load({
 *     id: "myModel",
 *      src: "House.bim",
 *      includeTypes: ["IfcWallStandardCase"]
 * });
 * ````
 *
 * We can also load only those objects that **don't** have the specified types. In the example below, we'll load only the
 * objects that do not represent empty space.
 *
 * ````javascript
 * const model = dotBIMLoader.load({
 *     id: "myModel",
 *      src: "House.bim",
 *      excludeTypes: ["IfcSpace"]
 * });
 * ````
 *
 * # Configuring initial object appearances
 *
 * We can specify the custom initial appearance of loaded objects according to their types.
 *
 * This is useful for things like:
 *
 * * setting the colors to our objects according to their types,
 * * automatically hiding ````IfcSpace```` objects, and
 * * ensuring that ````IfcWindow```` objects are always transparent.
 * <br>
 * In the example below, we'll load a model, while configuring ````IfcSpace```` elements to be always initially invisible,
 * and ````IfcWindow```` types to be always translucent blue.
 *
 * ````javascript
 * const myObjectDefaults = {
 * 
 *      IfcSpace: {
 *          visible: false
 *      },
 *      IfcWindow: {
 *          colorize: [0.337255, 0.303922, 0.870588], // Blue
 *          opacity: 0.3
 *      },
 * 
 *      //...
 * 
 *      DEFAULT: {
 *          colorize: [0.5, 0.5, 0.5]
 *      }
 * };
 *
 * const model4 = dotBIMLoader.load({
 *      id: "myModel4",
 *      src: "House.bim",
 *      objectDefaults: myObjectDefaults // Use our custom initial default states for object Entities
 * });
 * ````
 *
 * When we don't customize the appearance of types, as just above, then IfcSpace elements tend to obscure other
 * elements, which can be confusing.
 *
 * It's often helpful to make IfcSpaces transparent and unpickable, like this:
 *
 * ````javascript
 * const dotBIMLoader = new DotBIMLoaderPlugin(viewer, {
 *    objectDefaults: {
 *        IfcSpace: {
 *            pickable: false,
 *            opacity: 0.2
 *        }
 *    }
 * });
 * ````
 *
 * Alternatively, we could just make IfcSpaces invisible, which also makes them unpickable:
 *
 * ````javascript
 * const dotBIMLoader = new DotBIMLoaderPlugin(viewer, {
 *    objectDefaults: {
 *        IfcSpace: {
 *            visible: false
 *        }
 *    }
 * });
 * ````
 *
 * # Configuring a custom data source
 *
 * By default, DotBIMLoaderPlugin will load *````.bim````* files and metadata JSON over HTTP.
 *
 * In the example below, we'll customize the way DotBIMLoaderPlugin loads the files by configuring it with our own data source
 * object. For simplicity, our custom data source example also uses HTTP, using a couple of xeokit utility functions.
 *
 * ````javascript
 * import {utils} from "xeokit-sdk.es.js";
 *
 * class MyDataSource {
 * 
 *      constructor() {
 *      }
 * 
 *      // Gets the contents of the given .bim file in a JSON object
 *      getDotBIM(src, ok, error) {
 *          utils.loadJSON(dotBIMSrc,
 *             (json) => {
 *                 ok(json);
 *             },
 *             function (errMsg) {
 *                 error(errMsg);
 *             });
 *      }
 * }
 *
 * const dotBIMLoader2 = new DotBIMLoaderPlugin(viewer, {
 *       dataSource: new MyDataSource()
 * });
 *
 * const model5 = dotBIMLoader2.load({
 *      id: "myModel5",
 *      src: "House.bim"
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

            const dbMeshLoaded = {};

            const projectId = math.createUUID();
            const siteId = math.createUUID();
            const buildingId = math.createUUID();
            const buildingStoryId = math.createUUID();

            const metaModelData = {
                metaObjects: [
                    {
                        id: projectId,
                        name: "Project",
                        type: "Project",
                        parent: null
                    },
                    {
                        id: siteId,
                        name: "Site",
                        type: "Site",
                        parent: projectId
                    },
                    {
                        id: buildingId,
                        name: "Building",
                        type: "Building",
                        parent: siteId
                    },
                    {
                        id: buildingStoryId,
                        name: "BuildingStorey",
                        type: "BuildingStorey",
                        parent: buildingId
                    }
                ],
                propertySets: []
            };

            const parseDBMesh = (dbMeshId, element) => {
                if (dbMeshLoaded[dbMeshId]) {
                    return;
                }

                const dbMesh = fileData.meshes.find(obj => {
                    return obj.mesh_id === element.mesh_id;
                });
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

                const vector = element.vector;
                const rotation = element.rotation;
                const props = objectDefaults ? objectDefaults[elementType] || objectDefaults["DEFAULT"] : null;
                let visible = true;
                let pickable = true;

                if (element.face_colors === undefined) {

                    parseDBMesh(dbMeshId, element);

                    const meshId = `${objectId}-mesh-${dbMeshId}`;

                    let color = element.color ? [element.color.r / 255.0, element.color.g / 255.0, element.color.b / 255.0] : [1, 1, 1];
                    let opacity = element.color ? element.color.a / 255.0 : 1.0;

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
                        color: color,
                        opacity: opacity,
                        quaternion: rotation && (rotation.qz !== 0 || rotation.qy !== 0 || rotation.qx !== 0 || rotation.qw !== 1.0) ? [rotation.qx, rotation.qy, rotation.qz, rotation.qw] : undefined,
                        position: vector ? [vector.x, vector.y, vector.z] : undefined
                    });

                    sceneModel.createEntity({
                        id: objectId,
                        meshIds: [meshId],
                        visible: visible,
                        pickable: pickable,
                        isObject: true
                    });
                }
                else {
                    let faceColors = element.face_colors;
                    let coloredTrianglesDictionary = {};
                    let currentTriangleIndicesCount = 0;
                    let dbMesh = fileData.meshes.find(obj => {
                        return obj.mesh_id === element.mesh_id;
                    });
                    for (let i = 0, len = faceColors.length; i < len; i+=4) {
                        let faceColor = [faceColors[i], faceColors[i+1], faceColors[i+2], faceColors[i+3]];
                        if (coloredTrianglesDictionary[faceColor] === undefined) {
                            coloredTrianglesDictionary[faceColor] = [];
                        }
                        let indexForPoint0 = dbMesh.indices[currentTriangleIndicesCount];
                        let x0 = dbMesh.coordinates[indexForPoint0*3];
                        let y0 = dbMesh.coordinates[indexForPoint0*3+1];
                        let z0 = dbMesh.coordinates[indexForPoint0*3+2];
                        let indexForPoint1 = dbMesh.indices[currentTriangleIndicesCount+1];
                        let x1 = dbMesh.coordinates[indexForPoint1*3];
                        let y1 = dbMesh.coordinates[indexForPoint1*3+1];
                        let z1 = dbMesh.coordinates[indexForPoint1*3+2];
                        let indexForPoint2 = dbMesh.indices[currentTriangleIndicesCount+2];
                        let x2 = dbMesh.coordinates[indexForPoint2*3];
                        let y2 = dbMesh.coordinates[indexForPoint2*3+1];
                        let z2 = dbMesh.coordinates[indexForPoint2*3+2];
                        coloredTrianglesDictionary[faceColor].push(x0, y0, z0, x1, y1, z1, x2, y2, z2);

                        currentTriangleIndicesCount += 3;
                    }
                    let meshIds = [];
                    for (const [faceColor, trianglesCoordinates] of Object.entries(coloredTrianglesDictionary)) {
                        sceneModel.createGeometry({
                            id: `${dbMeshId}-${faceColor}`,
                            primitive: "triangles",
                            positions: trianglesCoordinates,
                            indices: [...Array(trianglesCoordinates.length / 3).keys()]
                        });
                        const meshId = `${objectId}-mesh-${dbMeshId}-${faceColor}`;
                        const faceColorArray = faceColor.split(',').map(Number);

                        let color = [faceColorArray[0] / 255.0, faceColorArray[1] / 255.0, faceColorArray[2] / 255.0];
                        let opacity = faceColorArray[3] / 255.0;

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
                            geometryId: `${dbMeshId}-${faceColor}`,
                            color: color,
                            opacity: opacity,
                            quaternion: rotation && (rotation.qz !== 0 || rotation.qy !== 0 || rotation.qx !== 0 || rotation.qw !== 1.0) ? [rotation.qx, rotation.qy, rotation.qz, rotation.qw] : undefined,
                            position: vector ? [vector.x, vector.y, vector.z] : undefined
                        });
                        meshIds.push(meshId);
                    }
                    sceneModel.createEntity({
                        id: objectId,
                        meshIds: meshIds,
                        visible: visible,
                        pickable: pickable,
                        isObject: true
                    });
                }

                let properties = [];
                for (let infoKey in info) {
                    properties.push({
                        name: infoKey,
                        value: info[infoKey]
                    });
                }
                metaModelData.propertySets.push({
                    id: objectId,
                    name: "Properties",
                    properties: properties
                });

                metaModelData.metaObjects.push({
                    id: objectId,
                    name: info && info.Name && info.Name !== "None" ? info.Name : `${element.type} ${objectId}`,
                    type: element.type,
                    parent: buildingStoryId,
                    propertySetIds: [objectId]
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
