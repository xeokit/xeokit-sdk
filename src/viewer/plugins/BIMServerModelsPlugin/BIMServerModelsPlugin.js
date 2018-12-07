import {Plugin} from "./../../Plugin.js";
import {
    LambertMaterial,
    PhongMaterial,
    Geometry,
    Object as xeoglObjectClass,
    Model as xeoglModelClass,
    Mesh
} from "./../../../xeogl/xeogl.module.js";
import {preloadQuery} from "./lib/preloadQuery.js";
import {BIMServerGeometryLoader} from "./lib/BIMServerGeometryLoader.js";
import {defaultMaterials} from "./lib/defaultMaterials.js";
import {BIMServerModel} from "./lib/BIMServerModel.js";
import {utils} from "./lib/utils.js";

/**
 * A viewer plugin that loads models from a [BIMServer](http://bimserver.org).
 *
 * For each model loaded, BIMServerModelsPlugin creates a [xeogl.Model](http://xeogl.org/docs/classes/Model.html) within its
 * {@link Viewer}'s [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html). You can load multiple models into the same
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
 * Since xeogl's default World "up" direction is +Y, while the model's "up" is +Z, we'll rotate the
 * model 90 degrees about the X-axis as we load it. Note that we could also instead configure xeogl to use +Z as "up".
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
 * const bimServerAPI = new BimServerClient(bimServerAddress);
 *
 * // Add a BIMServerModelsPlugin to the Viewer, configured with the BIMServerClient
 * const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, {
 *     bimServerAPI: bimServerAPI
 * });
 *
 * // Initialize the BIMServer client
 * bimServerAPI.init(() => {
 *
 *     // Login to BIMServer
 *     bimServerAPI.login(username, password, () => {
 *
 *         // Query a project by ID
 *         bimServerAPI.call("ServiceInterface", "getProjectByPoid", {
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
 *             const model = bimServerModelsPlugin.load({ // Returns a xeogl.Model
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
 *             const scene = viewer.scene;  // xeogl.Scene
 *             const camera = scene.camera; // xeogl.Camera
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
 * @class BIMServerModelsPlugin
 */
class BIMServerModelsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="BIMServerModels"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {BimServerClient} cfg.bimServerAPI A BIMServer client API instance.
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
     * Loads a <a href="http://xeogl.org/docs/classes/Model.html">xeogl.Model</a> from BIMServer into the {@link Viewer}'s <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>.
     *
     * @param {*} params  Loading parameters.
     *
     * @param {String} params.id ID to assign to the [xeogl.Model](http://xeogl.org/docs/classes/Model.html),
     * unique among all components in the Viewer's [xeogl.Scene](http://xeogl.org/docs/classes/Scene.html).
     *
     * @param {Number} params.poid ID of the model's project within BIMServer.
     *
     * @param {Number} params.roid ID of the model's revision within BIMServer. See the class example for how to query the latest project revision ID via the BIMServer client API.
     *
     * @param {Number} params.schema The model's IFC schema. See the class example for how to query the project's schema via the BIMServer client API.
     *
     * @param {xeogl.Object} [params.parent] A parent [xeogl.Object](http://xeogl.org/docs/classes/Object.html),
     * if we want to graft the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) into a xeogl object hierarchy.
     *
     * @param {Boolean} [params.edges=false] Whether or not xeogl renders the [xeogl.Model](http://xeogl.org/docs/classes/Model.html) with edges emphasized.
     *
     * @param {Float32Array} [params.position=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local 3D position.
     *
     * @param {Float32Array} [params.scale=[1,1,1]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s
     * local scale.
     *
     * @param {Float32Array} [params.rotation=[0,0,0]] The [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local
     * rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * @param {Float32Array} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The
     * [xeogl.Model](http://xeogl.org/docs/classes/Model.html)'s local modelling transform matrix. Overrides
     * the position, scale and rotation parameters.
     *
     * @param {Boolean} [params.lambertMaterials=true]  When true, gives each [xeogl.Mesh](http://xeogl.org/docs/classes/Mesh.html)
     * the same [xeogl.LambertMaterial](http://xeogl.org/docs/classes/LambertMaterial.html) and a ````colorize````
     * value set the to the corresponding IFC element color. This is typically used for large models, for a lower
     * memory footprint and smoother performance.
     *
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces.
     *
     * @param {Number} [params.edgeThreshold=20] When ghosting, highlighting, selecting or edging, this is the threshold
     * angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     *
     * @returns {{xeogl.Model}} A [xeogl.Model](http://xeogl.org/docs/classes/Model.html) representing the loaded BIMserver model.
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

        const edges = !!params.edges;
        const lambertMaterials = params.lambertMaterials !== false;
        const quantizeGeometry = params.quantizeGeometry !== false;
        //const combineGeometry = params.combineGeometry !== false;
        const combineGeometry = false; // Combination is way too slow ATM
        const logging = !!params.logging;

        scene.canvas.spinner.processes++;

        const xeoglModel = new xeoglModelClass(scene, params);

        const xeoglMaterial = lambertMaterials ? new LambertMaterial(scene, {
            backfaces: true
        }) : new PhongMaterial(scene, {
            diffuse: [1.0, 1.0, 1.0]
        });

        bimServerAPI.getModel(poid, roid, schema, false, apiModel => {  // TODO: Preload not necessary combined with the bruteforce tree

            let fired = false;

            apiModel.query(preloadQuery, () => {

                if (!fired) {

                    fired = true;

                    const bimServerModel = new BIMServerModel(bimServerAPI, apiModel);

                    bimServerModel.getTree().then(function (tree) {

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

                        visit(tree);

                        idMapping.toGuid.push(oidToGuid);
                        idMapping.toId.push(guidToOid);

                        const models = {};

                        models[bimServerModel.apiModel.roid] = bimServerModel.apiModel; // TODO: Ugh. Undecorate some of the newly created classes

                        const roid = params.roid;

                        const loader = new BIMServerGeometryLoader(bimServerAPI, bimServerModel, roid, null, {

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
                                new Geometry(xeoglModel, {
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
                                const xeoglObject = new xeoglObjectClass(xeoglModel, {
                                    id: objectId,
                                   // guid: guid,
                                    entityType: ifcType,
                                    matrix: matrix,
                                    colorize: color, // RGB
                                    opacity: color[3], // A
                                    visibility: !self.hiddenTypes[ifcType],
                                    edges: edges
                                });
                                xeoglModel.addChild(xeoglObject, false);
                                for (let i = 0, len = geometryDataIds.length; i < len; i++) {
                                    const xeoglMesh = new Mesh(xeoglModel, {
                                        geometry: `${modelId}.${geometryDataIds[i]}`,
                                        material: xeoglMaterial
                                    });
                                    xeoglObject.addChild(xeoglMesh, true);
                                    xeoglMesh.colorize = color; // HACK: Overrides state inheritance
                                    xeoglMesh.opacity = color[3]; // A
                                }
                            },

                            addGeometryToObject(oid, geometryDataId) {
                                const objectId = `${modelId}.${oid}`;
                                const xeoglObject = xeoglModel.scene.components[objectId];
                                if (!xeoglObject) {
                                    //self.error(`Can't find object with id ${objectId}`);
                                    return;
                                }
                                const geometryId = `${modelId}.${geometryDataId}`;
                                const xeoglMesh = new Mesh(xeoglModel, {
                                    geometry: geometryId,
                                    material: xeoglMaterial
                                });
                                //  xeoglMesh.colorize = color; // HACK: Overrides state inheritance
                                xeoglObject.addChild(xeoglMesh, true);
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
                                xeoglModel.fire("loaded");

                            }
                        });

                        loader.setLoadOids(oids); // TODO: Why do we do this?

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