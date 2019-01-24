import {Plugin} from "./../../Plugin.js";
import {BigModel} from "../../../scene/bigModels/BigModel.js";

import {BIMServerBigGeometryLoader} from "./lib/BIMServerBigGeometryLoader.js";
import {loadMetaModel} from "./lib/loadMetaModel.js";
import {IFCObjectDefaults} from "./../../../viewer/metadata/IFCObjectDefaults.js";

/**
 * {@link Viewer} plugin that loads models from a [BIMServer](http://bimserver.org) (1.5 or later).
 *
 * In the example below, we'll load the latest revision of a project's model.
 *
 * Read more about this example in the [Loading IFC Models from BIMServer](https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer) user guide.
 *
 * @example
 * import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
 * import {Viewer} from "../../../src/viewer/Viewer.js";
 * import {BIMServerBigLoaderPlugin} from "../../../src/viewer/plugins/BIMServerBigLoaderPlugin/BIMServerBigLoaderPlugin.js";
 *
 * const bimServerAddress = "http://localhost:8082";
 * const username = "admin@bimserver.org";
 * const password = "admin";
 * const poid = 131073;
 *
 * // Create a Viewer
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * // Create a BIMServer client
 * const bimServerClient = new BimServerClient(bimServerAddress);
 *
 * // Add a BIMServerBigLoaderPlugin that uses the client
 * const BIMServerBigLoaderPlugin = new BIMServerBigLoaderPlugin(viewer, {
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
 *             // Load the latest revision of the project
 *
 *             const roid = project.lastRevisionId;
 *             const schema = project.schema;
 *
 *             const model = BIMServerBigLoaderPlugin.load({ // Returns a xeokit.Model
 *                 id: "myModel",
 *                 poid: poid,
 *                 roid: roid,
 *                 schema: schema,
 *                 edges: true,                    // Render with emphasized edges
 *                 lambertMaterial: true,         // Lambertian flat-shading instead of Blinn/Phong
 *                 scale: [0.001, 0.001, 0.001],   // Shrink the model a bit
 *                 rotation: [-90, 0, 0]           // Rotate model for World +Y "up"
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
 * @class BIMServerBigLoaderPlugin
 */
class BIMServerBigLoaderPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="BIMServerModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} cfg.bimServerClient A BIMServer client API instance.
     */
    constructor(viewer, cfg) {

        super("BIMServerModels", viewer, cfg);

        /**
         * Version of BIMServer supported by this plugin.
         * @type {string}
         */
        this.BIMSERVER_VERSION = "1.5";

        if (!cfg.bimServerClient) {
            this.error("Config expected: bimServerClient");
        }

        /**
         * The BIMServer API.
         * @type {BIMServerClient}
         */
        this.bimServerClient = cfg.bimServerClient;

        /**
         * IFC types that are hidden by default.
         * @type {{IfcOpeningElement: boolean, IfcSpace: boolean}}
         */
        this.hiddenTypes = {
            "IfcOpeningElement": true,
            "IfcSpace": true
        };

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
     * Loads a model from a BIMServer into this GLTFLoaderPlugin's {@link Viewer}.
     *
     * Creates a {@link BigModel} within the Viewer's {@link Scene} that represents the model.
     *
     * The {@link BigModel} will have {@link BigModel#isModel} set true to indicate that it represents a model, and will therefore be registered in {@link Scene#models}.
     *
     * @param {Object} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link BigModel#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {Number} params.poid ID of the model's project within BIMServer.
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     * @param {{String:Object}} [params.objectDefaults] Map of initial default states for each loaded {@link BigModelNode} that represents an object. Default value for this parameter is {@link IFCObjectDefaults}.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The {@link BigModel}'s local 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model {@link BigModel}'s local scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model root {@link BigModel}'s local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model {@link BigModel}'s local modeling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.lambertMaterial=false]  When true, gives each {@link Mesh} the same {@link LambertMaterial} and a ````colorize````
     * value set the to diffuse color extracted from the glTF material. This is typically used for large CAD models and will cause loading to ignore textures in the glTF.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {BigModel} A {@link BigModel} representing the loaded glTF model.
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

        if (this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const xeokitBigModel = new BigModel(scene, params);
        const objectDefaults = params.objectDefaults || this._objectDefaults || IFCObjectDefaults;

        var onTick;

        if (!modelId) {
            this.error("load() param expected: modelId");
            return xeokitBigModel; // TODO: Finalize?
        }

        if (!poid) {
            this.error("load() param expected: poid");
            return xeokitBigModel; // TODO: Finalize?
        }

        if (!roid) {
            this.error("load() param expected: roid");
            return xeokitBigModel; // TODO: Finalize?
        }

        if (!schema) {
            this.error("load() param expected: schema");
            return xeokitBigModel; // TODO: Finalize?
        }

        const logging = !!params.logging;

        scene.canvas.spinner.processes++;


        bimServerClient.getModel(poid, roid, schema, false, bimServerClientModel => {  // TODO: Preload not necessary combined with the bruteforce tree

            loadMetaModel(viewer, modelId, poid, roid, bimServerClientModel).then(function () {

                xeokitBigModel.once("destroyed", function () {
                    viewer.metaScene.destroyMetaModel(modelId);
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

                const loader = new BIMServerBigGeometryLoader(bimServerClient, bimServerClientModel, roid, null, {

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

                    createGeometry: function (geometryDataId, positions, normals, indices) {
                        const geometryId = `${modelId}.${geometryDataId}`;
                        xeokitBigModel.createGeometry({
                            id: geometryId,
                            primitive: "triangles",
                            positions: positions,
                            normals: normals,
                            indices: indices
                        });
                    },

                    createMeshInstancingGeometry: function (geometryDataId, matrix, color) {
                        const meshId = `${modelId}.${geometryDataId}.mesh`;
                        const geometryId = `${modelId}.${geometryDataId}`;
                        xeokitBigModel.createMesh({
                            id: meshId,
                            geometryId: geometryId,
                            matrix: matrix,
                            color: color
                        });
                    },

                    createMeshSpecifyingGeometry: function (geometryDataId, positions, normals, indices, matrix, color) {
                        const meshId = `${modelId}.${geometryDataId}.mesh`;
                        xeokitBigModel.createMesh({
                            id: meshId,
                            primitive: "triangles",
                            positions: positions,
                            normals: normals,
                            indices: indices,
                            matrix: matrix,
                            color: color
                        });
                    },

                    createNode(id, geometryDataId, ifcType) { // Pass in color to set transparency
                        id = oidToGuid[id];
                        const meshId = `${modelId}.${geometryDataId}.mesh`;
                        if (scene.objects[id]) {
                            self.error(`Can't create object - object with id ${id} already exists`);
                            return;
                        }
                        if (scene.components[id]) {
                            self.error(`Can't create object - scene component with this ID already exists: ${id}`);
                            return;
                        }
                        const visible = !self.hiddenTypes[ifcType];
                        xeokitBigModel.createNode({
                            id: id,
                            meshIds: [meshId],
                            visible: visible
                        });
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
                        xeokitBigModel.finalize();
                        xeokitBigModel.fire("loaded");

                    }
                });

                loader.setLoadOids(oids); // TODO: Why do we do this?

                onTick = viewer.scene.on("tick", () => {
                    loader.process();
                });

                loader.start();
            });
        });

        return xeokitBigModel;
    };


    /**
     * Unloads a model that was previously loaded by this BIMServerBigLoaderPlugin.
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
     * Unloads models loaded by this BIMServerBigLoaderPlugin.
     */
    clear() {
        for (const modelId in this.models) {
            this.models[modelId].destroy();
        }
    }

    /**
     * Destroys this BIMServerBigLoaderPlugin, after first unloading any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {BIMServerBigLoaderPlugin}