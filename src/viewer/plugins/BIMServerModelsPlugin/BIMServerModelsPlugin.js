import {Plugin} from "./../../Plugin.js";
import {Geometry, Object as xeoglObjectClass, Model as xeoglModelClass, Mesh} from "./../../../xeogl/xeogl.module.js";
import {preloadQuery} from "./lib/preloadQuery.js";
import {BIMServerGeometryLoader} from "./lib/BIMServerGeometryLoader.js";
import {defaultMaterials} from "./lib/defaultMaterials.js";
import {BIMServerModel} from "./lib/BIMServerModel.js";
import {utils} from "./lib/utils.js";

/**
 * A viewer plugin that loads models from a [BIMServer](http://bimserver.org) instance.
 *
 * In the example below, we'll load the latest revision of a model.
 *
 * Read more about this in the [Loading IFC Models from BIMServer](https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer) tutorial.
 *
 * @example
 * import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
 * import {Viewer} from "../../../src/viewer/Viewer.js";
 * import {BIMServerModelsPlugin} from "../../../src/viewer/plugins/BIMServerModelsPlugin/BIMServerModelsPlugin.js";
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
 *
 * const bimServerAPI = new BimServerClient(bimServerAddress);
 *
 * // Add a BIMServerModelsPlugin that uses the client
 *
 * const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, {
 *     bimServerAPI: bimServerAPI
 * });
 *
 * // Initialize the BIMServer client
 *
 * bimServerAPI.init(() => {
 *
 *     // Login to BIMServer
 *
 *     bimServerAPI.login(username, password, () => {
 *
 *         // Query a project by ID
 *
 *         bimServerAPI.call("ServiceInterface", "getProjectByPoid", {
 *             poid: poid
 *         }, (project) => {
 *
 *             // Load the latest revision of the project
 *
 *             const roid = project.lastRevisionId;
 *             const schema = project.schema;
 *
 *             const model = bimServerModelsPlugin.load({ // Returns a xeogl.Model
 *                 id: "myModel",
 *                 poid: poid,
 *                 roid: roid,
 *                 schema: schema,
 *                 scale: [0.001, 0.001, 0.001],   // Shrink the model a bit
 *                 rotation: [-90, 0, 0]           // Rotate model for World +Y "up"
 *             });
 *
 *             const scene = viewer.scene;  // xeogl.Scene
 *             const camera = scene.camera; // xeogl.Camera
 *
 *             model.on("loaded", () => {
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
 * @class BIMServerModelsPlugin
 */
class BIMServerModelsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="BIMServerModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} cfg.bimServerAPI A BIMServer client API instance.
     */
    constructor(viewer, cfg) {

        super("BIMServerModels", viewer, cfg);

        /**
         * Version of BIMServer supported by this plugin.
         * @type {string}
         */
        this.BIMSERVER_VERSION = "1.5";

        if (!cfg.bimServerAPI) {
            this.error("Config expected: bimServerAPI");
        }

        /**
         * The BIMServer API.
         */
        this.bimServerAPI = cfg.bimServerAPI;

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
     * Loads a model from BIMServer into the plugin's {@link Viewer}.
     *
     * @param {Object} params Loading parameters. As well as the parameters required by this  method, this can also include configs for the <a href="http://xeogl.org/docs/classes/Model.html">xeogl.Model</a> that this method will create.
     * @param {String} params.id ID to assign to the model, unique among all components in the Viewer's <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>.
     * @param {Number} params.poid ID of the model's project within BIMServer.
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     * @returns {xeogl.Model} A <a href="http://xeogl.org/docs/classes/Model.html">xeogl.Model</a> representing the loaded model
     */
    load(params) {

        const self = this;

        const modelId = params.id;
        const poid = params.poid;
        const roid = params.roid;
        const schema = params.schema;
        const viewer = this.viewer;
        const scene = viewer.scene;
        const bimServerAPI = this.bimServerAPI;
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

        scene.canvas.spinner.processes++;

        const xeoglModel = new xeoglModelClass(scene, params);

        bimServerAPI.getModel(poid, roid, schema, false, apiModel => {  // TODO: Preload not necessary combined with the bruteforce tree

            let fired = false;

            apiModel.query(preloadQuery, () => {

                if (!fired) {

                    fired = true;

                    const bimServerModel = new BIMServerModel(bimServerAPI, apiModel, xeoglModel);

                    bimServerModel.getTree().then(function (tree) {

                        const oids = [];
                        const oidToGuid = {};
                        const guidToOid = {};

                        const visit = n => {
                            if (self.BIMSERVER_VERSION == "1.4") {
                                oids.push(n.id);
                            } else {
                                oids[n.gid] = n.id;
                            }
                            oidToGuid[n.id] = n.guid;
                            guidToOid[n.guid] = n.id;
                            for (let i = 0; i < (n.children || []).length; ++i) {
                                visit(n.children[i]);
                            }
                        };

                        visit(tree);

                        idMapping.toGuid.push(oidToGuid);
                        idMapping.toId.push(guidToOid);

                        const models = {};

                        models[bimServerModel.apiModel.roid] = bimServerModel.apiModel; // TODO: Ugh. Undecorate some of the newly created classes

                        const roid = params.roid;

                        const loader = new BIMServerGeometryLoader(bimServerAPI, bimServerModel, roid, null, {


                            gotBoundary: function (boundary) {

                                console.log("boundary = " + boundary);

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

                            createGeometry: function (geometryId, positions, normals, colors, indices) {
                                //     console.log("createGeometry geometryId=" + geometryId + "");
                                const geometry = new Geometry(xeoglModel, { // Geometry will be destroyed with the Model
                                    id: `${modelId}.${geometryId}`,
                                    primitive: "triangles",
                                    positions: positions,
                                    normals: normals,
                                    colors: colors,
                                    indices: indices
                                });

                                // const xeoglMesh = new Mesh(xeoglModel, {
                                //     geometry: geometry
                                // });
                            },

                            createObject(oid, geometryIds, ifcType, matrix) {

                                if (geometryIds.length === 0) {
                                    return;
                                }

                                const objectId = `${modelId}.${oid}`;

                                console.log("createObject " + objectId);

                                if (scene.entities[objectId]) {
                                    self.error(`Can't create object - object with id ${objectId} already exists`);
                                    return;
                                }

                                if (scene.components[objectId]) {
                                    self.error(`Can't create object - scene component with this ID already exists: ${objectId}`);
                                    return;
                                }

                                ifcType = ifcType || "DEFAULT";

                                const guid = (objectId.includes("#")) ? utils.CompressGuid(objectId.split("#")[1].substr(8, 36).replace(/-/g, "")) : null; // TODO: Computing GUID looks like a performance bottleneck
                                const color = defaultMaterials[ifcType] || defaultMaterials["DEFAULT"];
                                const xeoglObject = new xeoglObjectClass(xeoglModel, {
                                    id: objectId,
                                    guid,
                                    entityType: ifcType,
                                    matrix,
                                    colorize: color, // RGB
                                    opacity: color[3], // A
                                    visibility: !self.hiddenTypes[ifcType]
                                });

                                xeoglModel.addChild(xeoglObject, false);

                                for (let i = 0, len = geometryIds.length; i < len; i++) {
                                    const xeoglMesh = new Mesh(xeoglModel, {
                                        geometry: `${modelId}.${geometryIds[i]}`
                                    });
                                    xeoglMesh.colorize = color; // HACK: Overrides state inheritance
                                    xeoglObject.addChild(xeoglMesh, true);
                                }
                            },

                            addGeometryToObject(objectId, geometryId) {
                                objectId = `${modelId}.${objectId}`;
                                const xeoglObject = xeoglModel.scene.components[objectId];
                                if (!xeoglObject) {
                                    //self.error(`Can't find object with id ${objectId}`);
                                    return;
                                }
                                const xeoglMesh = new Mesh(xeoglModel, {
                                    geometry: `${modelId}.${geometryId}`
                                });
                                xeoglMesh.colorize = color; // HACK: Overrides state inheritance
                                xeoglObject.addChild(xeoglMesh, true);
                            }
                        });

                        loader.addProgressListener((progress, nrObjectsRead, totalNrObjects) => {
                            if (progress == "start") {
                                self.log("Started loading geometries");
                            } else if (progress == "done") {
                                self.log(`Finished loading geometries (${totalNrObjects} objects received)`);
                                viewer.scene.off(onTick);
                                scene.canvas.spinner.processes--;
                                xeoglModel.fire("loaded");

                            }
                        });

                        loader.setLoadOids(oids);
                        //loader.setLoadOids([bimServerModel.apiModel.roid], oids);

                        onTick = viewer.scene.on("tick", () => {
                            loader.process();
                        });

                        loader.start();
                    });
                }
            });
        });

        return xeoglModel;
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

export {BIMServerModelsPlugin}