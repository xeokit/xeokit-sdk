import {Plugin} from "./../../Plugin.js";
import {LambertMaterial} from "../../../scene/materials/LambertMaterial.js";
import {PhongMaterial} from "../../../scene/materials/PhongMaterial.js";
import {Geometry} from "../../../scene/geometry/Geometry.js";
import {Object3D} from "../../../scene/objects/Object3D.js";
import {GroupModel} from "../../../scene/models/GroupModel.js";
import {Mesh} from "../../../scene/mesh/Mesh.js";


import {BIMServerGeometryLoader} from "./lib/BIMServerGeometryLoader.js";
import {defaultMaterials} from "./lib/defaultMaterials.js";

/**
 * A viewer plugin that loads models from a [BIMServer](http://bimserver.org).
 *
 * Tested with bimserverjar-1.5.117.jar and IFC schema ifc2x3tc1.
 *
 * For each model loaded, BIMServerModelsPlugin creates a {@link Model} within its
 * {@link Viewer}'s {@link Scene}. You can load multiple models into the same
 * Viewer, giving each its own position, scale and orientation. You can also load multiple copies of the same model.
 *
 * A BIMServerModelsPlugin is configured with a BIMServerClient, which is a class provided by the BIMServer JavaScript
 * API that provides a client interface through which you can query BIMServer and download models. We use that class to
 * query BIMServer's database, while BIMServerModelsPlugin uses it to download models.
 *
 * In the example below, we'll load the latest revision of a project's model. We'll assume that we have a BIMServer
 * instance running and serving requests on port 8082, with a model loaded for project ID ````131073````. We'll get
 * the file that defines the BIMServer JavaScript API from the BIMServer, which ensures that we have the right
 * version of the API for the BIMServer version.
 *
 * Since xeokit's default World "up" direction is +Y, while the model's "up" is +Z, we'll rotate the
 * model 90 degrees about the X-axis as we load it. Note that we could also instead configure xeokit to use +Z as "up".
 *
 * Note that BIMServerModelsPlugin works with BIMServer V1.5 or later.
 *
 * Read more about this example, as well as how to set up the BIMServer instance and load a model, in the
 * [Loading IFC Models from BIMServer](https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer) tutorial
 * in the xeokit SDK wiki.
 *
 * @example
 * import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
 * import {Viewer} from "../../../src/viewer/Viewer.js";
 * import {BIMServerModelsPlugin} from "../../../src/viewer/plugins/BIMServerModelsPlugin/BIMServerModelsPlugin.js";
 *
 * const bimServerAddress = "http://localhost:8082";
 * const username = "admin@bimserver.org";
 * const password = "admin";
 * const poid = 131073;     // Project ID
 *
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * // Create a BimServerClient
 * const bimServerClient = new BimServerClient(bimServerAddress);
 *
 * // Add a BIMServerModelsPlugin to the Viewer, configured with the BIMServerClient
 * const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, {
 *     bimServerClient: bimServerClient
 * });
 *
 * // Initialize the BIMServer client
 * bimServerClient.init(() => {
 *
 *     // Login to BIMServer
 *     bimServerClient.login(username, password, () => {
 *
 *         // Query a project by ID
 *         bimServerClient.call("ServiceInterface", "getProjectByPoid", {
 *             poid: poid
 *         }, (project) => {
 *
 *             // From the project info returned by BIMServerClient, we'll get the ID of the latest
 *             // model revision and the version of the IFC schema to which the model conforms.
 *
 *             // Load the latest revision of the project
 *
 *             const roid = project.lastRevisionId;
 *             const schema = project.schema;
 *
 *             const model = bimServerModelsPlugin.load({ // Returns a xeokit.Model
 *                 id: "myModel",
 *                 poid: poid,                      // Project ID
 *                 roid: roid,                      // Revision ID
 *                 schema: schema,                  // Schema version
 *                 edges: true,                     // Render with emphasized edges (default is false)
 *                 lambertMaterials: true,          // Lambertian flat-shading instead of default Blinn/Phong
 *                 scale: [0.001, 0.001, 0.001],    // Shrink the model a bit
 *                 rotation: [-90, 0, 0]            // Rotate model for World +Y "up"
 *             });
 *
 *             const scene = viewer.scene;  // xeokit.Scene
 *             const camera = scene.camera; // xeokit.Camera
 *
 *             model.on("loaded", () => { // When loaded, fit camera and start orbiting
 *                 camera.orbitPitch(20);
 *                 viewer.cameraFlight.flyTo(model);
 *                 scene.on("tick", () => {
 *                     camera.orbitYaw(0.3);
 *                 })
 *             });
 *         });
 *     });
 * });
 *
 * @class BIMServerLoaderPlugin
 */
class BIMServerLoaderPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="BIMServerLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {BimServerClient} cfg.bimServerClient A BIMServer client API instance.
     */
    constructor(viewer, cfg) {

        super("BIMServerLoader", viewer, cfg);

        if (!cfg.bimServerClient) {
            this.error("Config expected: bimServerClient");
        }

        /**
         * Version of BIMServer supported by this plugin.
         *
         *
         * @type {string}
         */
        this.BIMSERVER_VERSION = "1.5";

        /**
         * The BIMServer API client
         *
         * @property bimServerClient.
         * @type {BIMServerClient}
         */
        this.bimServerClient = cfg.bimServerClient;

        /**
         * IFC types that are hidden by default.
         *
         * @property hiddenTypes
         * @type {{IfcOpeningElement: boolean, IfcSpace: boolean}}
         */
        this.hiddenTypes = {
            "IfcOpeningElement": true,
            "IfcSpace": true
        };

        /**
         * IFCModels loaded by this BIMServerModelsPlugin.
         *
         * @property ifcModels
         * @type {{String: IFCModel}}
         */
        this.ifcModels = {};
    }

    /**
     * Loads a {@link Model} from BIMServer into the {@link Viewer}'s {@link Scene}.
     *
     * Creates IFC metadata for the {@link Model} within {@link Viewer#metadata}.
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the {@link Model},
     * unique among all components in the Viewer's {@link Scene}.
     *
     * @param {Number} params.poid ID of the model's project within BIMServer.
     *
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     *
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     *
     * @param {Object} [params.parent] A parent {@link Object3D},
     * if we want to graft the {@link Model} into a xeokit object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the {@link Model} with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The {@link Model}'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The {@link Model}'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The {@link Model}'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * {@link Model}'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterials=true]  When true, gives each {@link Mesh}
     * the same {@link LambertMaterial} and a ````colorize````
     * value set the to the corresponding IFC element color. This is typically used for large models, for a lower
     * memory footprint and smoother performance.
     *
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{Model}} A {@link Model} representing the loaded BIMserver model.
     */
    load(params) {

        const self = this;

        const modelId = params.id;
        const poid = params.poid;
        const roid = params.roid;
        const schema = params.schema;
        const viewer = this.viewer;
        const scene = viewer.scene;
        const bimServerClient = this.bimServerClient;
        const idMapping = { // This are arrays as multiple models might be loaded or unloaded.
            'toGuid': [],
            'toId': []
        };
        var onTick;

        if (!modelId) {
            this.error("load() param expected: id");
            return;
        }

        if (!poid) {
            this.error("load() param expected: poid");
            return;
        }

        if (!roid) {
            this.error("load() param expected: roid");
            return;
        }

        if (!schema) {
            this.error("load() param expected: schema");
            return;
        }

        if (scene.components[modelId]) {
            this.error("Component with this ID already exists in viewer: " + modelId);
            return;
        }

        const edges = !!params.edges;
        const lambertMaterials = params.lambertMaterials !== false;
        const quantizeGeometry = params.quantizeGeometry !== false;
        //const combineGeometry = params.combineGeometry !== false;
        const combineGeometry = false; // Combination is way too slow ATM
        const logging = !!params.logging;

        scene.canvas.spinner.processes++;

        const groupModel = new GroupModel(scene, params);

        const xeokitMaterial = lambertMaterials ? new LambertMaterial(groupModel, {
            backfaces: true
        }) : new PhongMaterial(groupModel, {
            diffuse: [1.0, 1.0, 1.0]
        });

        bimServerClient.getModel(poid, roid, schema, false, bimServerClientModel => {

            this.loadMetadata(modelId, bimServerClientModel).then(function () {

                groupModel.once("destroyed", function () {
                   viewer.destroyMetadata(modelId);
                });

                const oids = [];
                const oidToGuid = {};
                const guidToOid = {};

                const visit = n => {
                    oids[n.gid] = n.id;
                    oidToGuid[n.id] = n.guid;
                    guidToOid[n.guid] = n.id;
                    for (let i = 0; i < (n.children || []).length; ++i) {
                        visit(n.children[i]);
                    }
                };

                const structure = viewer.metadata.structures[modelId];

                visit(structure);

                idMapping.toGuid.push(oidToGuid);
                idMapping.toId.push(guidToOid);

                const loader = new BIMServerGeometryLoader(bimServerClient, bimServerClientModel, roid, null, {

                    log: function (msg) {
                        if (logging) {
                            self.log(msg);
                        }
                    },

                    error: function (msg) {
                        self.error(msg);
                    },

                    warn: function (msg) {
                        self.warn(msg);
                    },

                    gotModelBoundary: function (boundary) {

                        //console.log("boundary = " + boundary);

                        const xmin = boundary[0];
                        const ymin = boundary[1];
                        const zmin = boundary[2];
                        const xmax = boundary[3];
                        const ymax = boundary[4];
                        const zmax = boundary[5];

                        const diagonal = Math.sqrt(
                            Math.pow(xmax - xmin, 2) +
                            Math.pow(ymax - ymin, 2) +
                            Math.pow(zmax - zmin, 2));

                        const scale = 100 / diagonal;

                        const center = [
                            scale * ((xmax + xmin) / 2),
                            scale * ((ymax + ymin) / 2),
                            scale * ((zmax + zmin) / 2)
                        ];

                        // TODO

                        //o.viewer.setScale(scale); // Temporary until we find a better scaling system.

                    },

                    createGeometry: function (geometryDataId, positions, normals, indices, reused) {
                        const geometryId = `${modelId}.${geometryDataId}`;
                        new Geometry(groupModel, {
                            id: geometryId,
                            primitive: "triangles",
                            positions: positions,
                            normals: normals,
                            indices: indices,
                            quantized: quantizeGeometry,
                            combined: combineGeometry
                        });
                    },

                    createObject(oid, geometryDataIds, ifcType, matrix) {
                        const objectId = `${modelId}.${oid}`;
                        if (scene.entities[objectId]) {
                            self.error(`Can't create object - object with id ${objectId} already exists`);
                            return;
                        }
                        if (scene.components[objectId]) {
                            self.error(`Can't create object - scene component with this ID already exists: ${objectId}`);
                            return;
                        }
                        ifcType = ifcType || "DEFAULT";
                        //  const guid = (objectId.includes("#")) ? utils.CompressGuid(objectId.split("#")[1].substr(8, 36).replace(/-/g, "")) : null; // TODO: Computing GUID looks like a performance bottleneck
                        const color = defaultMaterials[ifcType] || defaultMaterials["DEFAULT"];
                        const xeokitObject = new Object3D(groupModel, {
                            id: objectId,
                            // guid: guid,
                            entityType: ifcType,
                            matrix: matrix,
                            colorize: color, // RGB
                            opacity: color[3], // A
                            visibility: !self.hiddenTypes[ifcType],
                            edges: edges
                        });
                        groupModel.addChild(xeokitObject, false);
                        for (let i = 0, len = geometryDataIds.length; i < len; i++) {
                            const xeokitMesh = new Mesh(groupModel, {
                                geometry: `${modelId}.${geometryDataIds[i]}`,
                                material: xeokitMaterial
                            });
                            xeokitObject.addChild(xeokitMesh, true);
                            xeokitMesh.colorize = color; // HACK: Overrides state inheritance
                            xeokitMesh.opacity = color[3]; // A
                        }
                    },

                    addGeometryToObject(oid, geometryDataId) {
                        const objectId = `${modelId}.${oid}`;
                        const xeokitObject = groupModel.scene.components[objectId];
                        if (!xeokitObject) {
                            //self.error(`Can't find object with id ${objectId}`);
                            return;
                        }
                        const geometryId = `${modelId}.${geometryDataId}`;
                        const xeokitMesh = new Mesh(groupModel, {
                            geometry: geometryId,
                            material: xeokitMaterial
                        });
                        //  xeokitMesh.colorize = color; // HACK: Overrides state inheritance
                        xeokitObject.addChild(xeokitMesh, true);
                    }
                });

                loader.addProgressListener((progress, nrObjectsRead, totalNrObjects) => {
                    if (progress === "start") {
                        if (logging) {
                            self.log("Started loading geometries");
                        }
                    } else if (progress === "done") {
                        if (logging) {
                            self.log(`Finished loading geometries (${totalNrObjects} objects received)`);
                        }
                        viewer.scene.off(onTick);
                        scene.canvas.spinner.processes--;

                        groupModel.fire("loaded");

                        viewer.fire("loaded", groupModel);
                        self.fire("loaded", groupModel);
                    }
                });

                loader.setLoadOids(oids); // TODO: Why do we do this?

                onTick = viewer.scene.on("tick", () => {
                    loader.process();
                });

                loader.start();
            });
        });

        return groupModel;
    }

    loadMetadata(modelId, bimServerClientModel) {

        function isArray(value) {
            return Object.prototype.toString.call(value) === "[object Array]";
        }

        const self = this;

        return new Promise(function (resolve, reject) {

            const query = {
                defines: {
                    Representation: {type: "IfcProduct", field: "Representation"},
                    ContainsElementsDefine: {
                        type: "IfcSpatialStructureElement",
                        field: "ContainsElements",
                        include: {
                            type: "IfcRelContainedInSpatialStructure",
                            field: "RelatedElements",
                            includes: ["IsDecomposedByDefine", "ContainsElementsDefine", "Representation"]
                        }
                    },
                    IsDecomposedByDefine: {
                        type: "IfcObjectDefinition",
                        field: "IsDecomposedBy",
                        include: {
                            type: "IfcRelDecomposes",
                            field: "RelatedObjects",
                            includes: ["IsDecomposedByDefine", "ContainsElementsDefine", "Representation"]
                        }
                    },
                },
                queries: [
                    {type: "IfcProject", includes: ["IsDecomposedByDefine", "ContainsElementsDefine"]},
                    {type: "IfcRepresentation", includeAllSubtypes: true},
                    {type: "IfcProductRepresentation"},
                    {type: "IfcPresentationLayerWithStyle"},
                    {type: "IfcProduct", includeAllSubtypes: true},
                    {type: "IfcProductDefinitionShape"},
                    {type: "IfcPresentationLayerAssignment"},
                    {
                        type: "IfcRelAssociatesClassification",
                        includes: [
                            {type: "IfcRelAssociatesClassification", field: "RelatedObjects"},
                            {type: "IfcRelAssociatesClassification", field: "RelatingClassification"}
                        ]
                    },
                    {type: "IfcSIUnit"},
                    {type: "IfcPresentationLayerAssignment"}
                ]
            };

            bimServerClientModel.query(query, function () { }).done(function () {

                const entityCardinalities = { // Parent-child cardinalities for entities
                    'IfcRelDecomposes': 1,
                    'IfcRelAggregates': 1,
                    'IfcRelContainedInSpatialStructure': 1,
                    'IfcRelFillsElement': 1,
                    'IfcRelVoidsElement': 1
                };

                const clientObjectMap = {}; // Create a mapping from id->instance
                const clientObjectList = [];

                for (let clientObjectId in bimServerClientModel.objects) { // The root node in a dojo store should have its parent set to null, not just something that evaluates to false
                    const clientObject = bimServerClientModel.objects[clientObjectId].object;
                    clientObject.parent = null;
                    clientObjectMap[clientObject._i] = clientObject;
                    clientObjectList.push(clientObject);
                }

                const relationships = clientObjectList.filter(function (clientObject) { // Filter all instances based on relationship entities
                    return entityCardinalities[clientObject._t];
                });

                const parents = relationships.map(function (clientObject) { // Construct a tuple of {parent, child} ids
                    const keys = Object.keys(clientObject);
                    const related = keys.filter(function (key) {
                        return key.indexOf("Related") !== -1;
                    });
                    const relating = keys.filter(function (key) {
                        return key.indexOf("Relating") !== -1;
                    });
                    return [clientObject[relating[0]], clientObject[related[0]]];
                });

                const data = [];
                const visited = {};

                parents.forEach(function (a) {
                    const ps = isArray(a[0]) ? a[0] : [a[0]]; // Relationships in IFC can be one to one/many
                    const cs = isArray(a[1]) ? a[1] : [a[1]];
                    for (let i = 0; i < ps.length; ++i) {
                        for (let j = 0; j < cs.length; ++j) {
                            const parent = clientObjectMap[ps[i]._i]; // Look up the instance ids in the mapping
                            const child = clientObjectMap[cs[j]._i];
                            child.parent = parent.id = parent._i; // parent, id, hasChildren are significant attributes in a dojo store
                            child.id = child._i;
                            parent.hasChildren = true;
                            if (!visited[child.id]) { // Make sure to only add instances once
                                data.push(child);
                            }
                            if (!visited[parent.id]) {
                                data.push(parent);
                            }
                            visited[parent.id] = visited[child.id] = true;
                        }
                    }
                });

                const newObjects = data.map(function (clientObject) {
                    var object = {
                        id: clientObject.id,
                        name: clientObject.Name,
                        type: clientObject._t,
                        guid: clientObject.GlobalId
                    };
                    if (clientObject.parent !== undefined && clientObject.parent !== null) {
                        object.parent = clientObject.parent;
                    }
                    if (clientObject._rgeometry !== null && clientObject._rgeometry !== undefined) {
                        object.gid = clientObject._rgeometry._i
                    }
                    if (clientObject.hasChildren) {
                        object.children = [];
                    }
                    return object;
                });

            //    console.log(JSON.stringify({objects: newObjects}, null, "\t"));

                self.viewer.createMetadata(modelId, { objects: newObjects });

                resolve();
            });
        });
    }

    /**
     * @private
     */
    send(name, value) {
        //...
    }

    /**
     * @private
     */
    writeBookmark(bookmark) {
        //...
    }

    /**
     * @private
     */
    readBookmark(bookmark, done) {
        //...
        done();
    }

    /**
     * Destroys this plugin.
     */
    destroy() {
        super.destroy();
    }
}

export {BIMServerLoaderPlugin}