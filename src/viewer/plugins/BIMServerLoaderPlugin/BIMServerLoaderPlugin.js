import {Plugin} from "./../../Plugin.js";
import {LambertMaterial} from "../../../scene/materials/LambertMaterial.js";
import {PhongMaterial} from "../../../scene/materials/PhongMaterial.js";
import {MetallicMaterial} from "../../../scene/materials/MetallicMaterial.js";
import {SpecularMaterial} from "../../../scene/materials/SpecularMaterial.js";
import {ReadableGeometry} from "../../../scene/geometry/ReadableGeometry.js";
import {VBOGeometry} from "../../../scene/geometry/VBOGeometry.js";
import {Node} from "../../../scene/nodes/Node.js";
import {Mesh} from "../../../scene/mesh/Mesh.js";

import {BIMServerGeometryLoader} from "./lib/BIMServerGeometryLoader.js";
import {loadMetaModel} from "./lib/loadMetaModel.js";
import {IFCObjectDefaults} from "./../../../viewer/metadata/IFCObjectDefaults.js";
import {utils} from "../../../scene/utils.js";


/**
 * {@link Viewer} plugin that loads models from a [BIMServer](http://bimserver.org).
 *
 * Tested with bimserverjar-1.5.117.jar and IFC schema ifc2x3tc1.
 *
 * For each model loaded, BIMServerLoaderPlugin creates a {@link Model} within its
 * {@link Viewer}'s {@link Scene}. You can load multiple models into the same
 * Viewer, giving each its own position, scale and orientation. You can also load multiple copies of the same model.
 *
 * A BIMServerLoaderPlugin is configured with a BIMServerClient, which is a class provided by the BIMServer JavaScript
 * API that provides a client interface through which you can query BIMServer and download models. We use that class to
 * query BIMServer's database, while BIMServerLoaderPlugin uses it to download models.
 *
 * In the example below, we'll load the latest revision of a project's model. We'll assume that we have a BIMServer
 * instance running and serving requests on port 8082, with a model loaded for project ID ````131073````. We'll get
 * the file that defines the BIMServer JavaScript API from the BIMServer, which ensures that we have the right
 * version of the API for the BIMServer version.
 *
 * Since xeokit's default World "up" direction is +Y, while the model's "up" is +Z, we'll rotate the
 * model 90 degrees about the X-axis as we load it. Note that we could also instead configure xeokit to use +Z as "up".
 *
 * Note that BIMServerLoaderPlugin works with BIMServer V1.5 or later.
 *
 * Read more about this example, as well as how to set up the BIMServer instance and load a model, in the
 * [Loading IFC Models from BIMServer](https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer) tutorial
 * in the xeokit SDK wiki.
 *
 * @example
 * import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
 * import {Viewer} from "../../../src/viewer/Viewer.js";
 * import {BIMServerLoaderPlugin} from "../../../src/viewer/plugins/BIMServerLoaderPlugin/BIMServerLoaderPlugin.js";
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
 * // Add a BIMServerLoaderPlugin to the Viewer, configured with the BIMServerClient
 * const bimServerLoader = new BIMServerLoaderPlugin(viewer, {
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
 *             const model = bimServerLoader.load({ // Returns a xeokit.Model
 *                 id: "myModel",
 *                 poid: poid,                      // Project ID
 *                 roid: roid,                      // Revision ID
 *                 schema: schema,                  // Schema version
 *                 edges: true,                     // Render with emphasized edges (default is false)
 *                 lambertMaterial: true,          // Lambertian flat-shading instead of default Blinn/Phong
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
     * @param {Object} [cfg.objectDefaults] Map of initial default properties for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.
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

        this.objectDefaults = cfg.objectDefaults;
        this.readableGeometry = cfg.readableGeometry;
        this.materialWorkflow = cfg.materialWorkflow;

    }

    /**
     * Sets map of initial default properties for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @param {{String: Object}} objectDefaults The initial default properties map.
     */
    set objectDefaults(objectDefaults) {
        this._objectDefaults = objectDefaults || IFCObjectDefaults;
    }

    /**
     * Gets map of initial default properties for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @returns {{String: Object}} The default properties map.
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     * Sets whether each loaded {@link Mesh} gets a {@link ReadableGeometry} or a {@link VBOGeometry}.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} readableGeometry Specify ````true```` for {@link ReadableGeometry} else ````false```` for {@link VBOGeometry}.
     */
    set readableGeometry(readableGeometry) {
        this._readableGeometry = !!readableGeometry;
    }

    /**
     * Gets whether each loaded {@link Mesh} gets a {@link ReadableGeometry} or a {@link VBOGeometry}.
     *
     * @returns {Boolean} ````true```` for {@link ReadableGeometry} else ````false```` for {@link VBOGeometry}.
     */
    get readableGeometry() {
        return this._readableGeometry;
    }

    /**
     * Sets what type of materials to give each loaded {@link Mesh}.
     *
     * Options are:
     *
     * * ````"lambert"```` - (default) gives each {@link Mesh} the same shared {@link LambertMaterial}, with each mesh getting a different {@link Mesh#colorize} to specify its individual color.
     * * ````"phong"```` - gives each {@link Mesh} the same shared {@link PhongMaterial}, with each mesh getting a different {@link Mesh#colorize} to specify its individual color.
     *
     * @param {String} materialWorkflow Workflow - "lambert" (default) or "phong".
     */
    set materialWorkflow(materialWorkflow) {
        switch (materialWorkflow) {
            case "lambert":
                this._materialClass = LambertMaterial;
                break;

            case "phong":
                this._materialClass = PhongMaterial;
                break;

            default:
                this.error("Unsupported value for materialWorkflow: '" + materialWorkflow + "' - defaulting to 'lambert'");
                materialWorkflow = "lambert";
                this._materialClass = LambertMaterial;
        }

        this._materialWorkflow = materialWorkflow;
    }

    /**
     * Sets what type of materials to give each loaded {@link Mesh}.
     *
     * Options are:
     *
     * * ````"lambert"```` - (default) gives each {@link Mesh} the same shared {@link LambertMaterial}, with each mesh getting a different {@link Mesh#colorize} to specify its individual color.
     * * ````"phong"```` - gives each {@link Mesh} the same shared {@link PhongMaterial}, with each mesh getting a different {@link Mesh#colorize} to specify its individual color.
     *
     * @param {String} Workflow - "lambert" (default) or "phong".
     */
    get materialWorkflow() {
        return this._materialWorkflow;
    }

    /**
     * Loads a model from a BIMServer into this GLTFLoaderPlugin's {@link Viewer}.
     *
     * Creates a tree of {@link Node}s within the Viewer's {@link Scene} that represents the model.
     *
     * Creates a {@link MetaModel} within {@link Viewer#metaScene}.
     *
     * The root {@link Node} will have {@link Node#isModel} set true to indicate that it represents a model, and will therefore be registered in {@link Scene#models}.
     *
     * @param {Object} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Node#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {Number} params.poid ID of the model's project within BIMServer.
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     * @param {{String:Object}} [params.objectDefaults] Map of initial default properties for each loaded {@link Entity} that represents an object. Default value for this parameter is {@link IFCObjectDefaults}.
     * @param {Node} [params.parent] The parent {@link Node}, if we want to graft the model's root {@link Node} into a scene graph hierarchy.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model {@link Node}'s local 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model {@link Node}'s local scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model root {@link Node}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model {@link Node}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.materialWorkflow=false]  When true, gives each {@link Mesh} the same {@link LambertMaterial} and {@link Mesh#colorize} set the to diffuse color, for memory and rendering efficiency.
     * @param {Boolean} [params.readableGeometry=false] When true, gives each {@link Mesh} a {@link ReadableGeometry}, otherwise gives it a {@link VBOGeometry} by default for memory efficiency.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {Node} A {@link Node} representing the loaded BIMServer model.
     */
    load(params) {

        const self = this;

        const poid = params.poid;
        const roid = params.roid;
        const schema = params.schema;
        const viewer = this.viewer;
        const scene = viewer.scene;
        const bimServerClient = this.bimServerClient;

        const geometryClass = params.readableGeometry ? ReadableGeometry : VBOGeometry;

        const idMapping = { // This are arrays as multiple models might be loaded or unloaded.
            'toGuid': [],
            'toId': []
        };
        const objectDefaults = params.objectDefaults || this._objectDefaults || IFCObjectDefaults;

        var onTick;

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

        if (scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
            return;
        }

        const edges = !!params.edges;
        const materialWorkflow = params.materialWorkflow !== false;
        const compressGeometry = params.compressGeometry !== false;
        const logging = !!params.logging;

        scene.canvas.spinner.processes++;

        const modelNode = new Node(scene, params);

        const modelId = modelNode.id; // In case ID was auto-generated

        var singletonMaterial;

        switch (materialWorkflow) {

            case "lambert":
                singletonMaterial = new LambertMaterial(modelNode, {
                    backfaces: false
                });
                break;

            case "phong":
                singletonMaterial = new PhongMaterial(modelNode, {
                    backfaces: false
                });
                break;

            case "pbr":
                singletonMaterial = new LambertMaterial(modelNode, {
                    backfaces: false
                });
                break;

            default:
                this.error("load() param expected: schema");
        }

        bimServerClient.getModel(poid, roid, schema, false, bimServerClientModel => {

            loadMetaModel(viewer, modelId, poid, roid, bimServerClientModel).then(function () {

                modelNode.once("destroyed", function () {
                    viewer.metaScene.destroyMetaModel(id);
                });

                const oids = [];
                const oidToGuid = {};
                const guidToOid = {};

                const visit = metaObject => {
                    oids[metaObject.external.gid] = metaObject.external.extId;
                    oidToGuid[metaObject.external.extId] = metaObject.id;
                    guidToOid[metaObject.id] = metaObject.external.extId;
                    for (let i = 0; i < (metaObject.children || []).length; ++i) {
                        visit(metaObject.children[i]);
                    }
                };

                const metaModel = viewer.metaScene.metaModels[modelId];
                const rootMetaObject = metaModel.rootMetaObject;

                visit(rootMetaObject);

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
                        new geometryClass(modelNode, {
                            id: geometryId,
                            primitive: "triangles",
                            positions: positions,
                            normals: normals,
                            indices: indices,
                            compressGeometry: compressGeometry
                        });
                    },

                    createNode(oid, geometryDataIds, ifcType, matrix) {
                        const objectId = oidToGuid[oid];
                        if (scene.objects[objectId]) {
                            self.error(`Can't create object - object with id ${id} already exists`);
                            return;
                        }
                        if (scene.components[objectId]) {
                            self.error(`Can't create object - scene component with this ID already exists: ${objectId}`);
                            return;
                        }
                        ifcType = ifcType || "DEFAULT";
                        //  const guid = (objectId.includes("#")) ? utils.CompressGuid(objectId.split("#")[1].substr(8, 36).replace(/-/g, "")) : null; // TODO: Computing GUID looks like a performance bottleneck

                        const props = objectDefaults[ifcType] || {};

                        const xeokitObject = new Node(modelNode, {
                            id: objectId,
                            isObject: true,
                            matrix: matrix,
                            colorize: props.colorize,
                            opacity: props.opacity,
                            visibility: props.visible,
                            pickable: props.pickable,
                            edges: edges
                        });
                        modelNode.addChild(xeokitObject, false);
                        for (let i = 0, len = geometryDataIds.length; i < len; i++) {
                            const geometryId = `${modelId}.${geometryDataIds[i]}`;
                            const xeokitMesh = new Mesh(modelNode, {
                                geometry: geometryId,
                                material: singletonMaterial
                            });
                            xeokitObject.addChild(xeokitMesh, true);
                            xeokitMesh.colorize = props.colorize; // HACK: Overrides state inheritance
                            xeokitMesh.opacity = props.opacity;
                            xeokitMesh.pickable = props.pickable;
                            xeokitMesh.visible = props.visible;
                        }
                    },

                    addGeometryToObject(oid, geometryDataId) {
                        const objectId = oidToGuid[oid];
                        const xeokitObject = modelNode.scene.objects[objectId];
                        if (!xeokitObject) {
                            self.error(`Can't find object with id ${objectId}`);
                            return;
                        }
                        const geometryId = `${modelId}.${geometryDataId}`;
                        const xeokitMesh = new Mesh(modelNode, {
                            geometry: geometryId,
                            material: singletonMaterial
                        });
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

                        modelNode.fire("loaded");

                        viewer.fire("loaded", modelNode);
                        self.fire("loaded", modelNode);
                    }
                });

                loader.setLoadOids(oids); // TODO: Why do we do this?

                onTick = viewer.scene.on("tick", () => {
                    loader.process();
                });

                loader.start();
            });
        });

        return modelNode;
    }

    /**
     * Unloads a model that was loaded by this BIMServerLoaderPlugin.
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
     * Unloads all models loaded by this BIMServerLoaderPlugin.
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

export {BIMServerLoaderPlugin}