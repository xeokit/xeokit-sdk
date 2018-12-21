import {Plugin} from "./../../Plugin.js";
import {BigModel} from "../../../scene/bigModels/BigModel.js";

import {BIMServerBigGeometryLoader} from "./lib/BIMServerBigGeometryLoader.js";
import {loadMetaModel} from "./lib/loadMetaModel.js";
import {defaultMaterials} from "./lib/defaultMaterials.js";


/**
 * A viewer plugin that loads models from a [BIMServer](http://bimserver.org) (1.5 or later).
 *
 * In the example below, we'll load the latest revision of a project's model.
 *
 * Read more about this example in the [Loading IFC Models from BIMServer](https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer) tutorial.
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
 *                 lambertMaterials: true,         // Lambertian flat-shading instead of Blinn/Phong
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
    }

    /**
     * Loads a {@link Model} from BIMServer into the {@link Viewer}'s {@link Scene}.
     *
     * @param {Object} params Loading parameters. As well as the parameters required by this  method, this can also include configs for the {@link Model} that this method will create.
     * @param {String} params.id ID to assign to the model, unique among all components in the Viewer's {@link Scene}.
     * @param {Number} params.poid ID of the model's project within BIMServer.
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     * @param {Float32Array} [params.position=[0,0,0]] Local 3D position.
     * @param {Float32Array} [params.scale=[1,1,1]] Local scale.
     * @param {Float32Array} [params.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.edges=false] When true, will emphasise edges when rendering the model.
     * @param {Boolean} [params.logging=false] Set this true to log some info to the console while loading.
     * @returns {GroupModel} A {@link Model} representing the loaded model.
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

        const logging = !!params.logging;

        scene.canvas.spinner.processes++;

        const xeokitBigModel = new BigModel(scene, params);

        bimServerClient.getModel(poid, roid, schema, false, bimServerClientModel => {  // TODO: Preload not necessary combined with the bruteforce tree

            loadMetaModel(viewer, modelId, poid, roid, bimServerClientModel).then(function () {

                xeokitBigModel.once("destroyed", function () {
                    viewer.metaScene.destroyMetaModel(modelId);
                });

                const oids = [];
                const oidToGuid = {};
                const guidToOid = {};

                const visit = metaObject => {
                    oids[metaObject.gid] = metaObject.extId;
                    oidToGuid[metaObject.extId] = metaObject.objectId;
                    guidToOid[metaObject.objectId] = metaObject.extId;
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

                    createObject(objectId, geometryDataId, ifcType) { // Pass in color to set transparency
                        objectId = oidToGuid[objectId];
                        const meshId = `${modelId}.${geometryDataId}.mesh`;
                        if (scene.objects[objectId]) {
                            self.error(`Can't create object - object with id ${objectId} already exists`);
                            return;
                        }
                        if (scene.components[objectId]) {
                            self.error(`Can't create object - scene component with this ID already exists: ${objectId}`);
                            return;
                        }
                        const visible = !self.hiddenTypes[ifcType];
                        xeokitBigModel.createObject({
                            objectId: objectId,
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

export {BIMServerBigLoaderPlugin}