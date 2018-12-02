import {Plugin} from "./../../Plugin.js";
import {Geometry, Object as xeoglObjectClass, Model as xeoglModelClass, Mesh} from "./../../../../libs/xeogl/xeogl.module.js";
import {preloadQuery} from "./lib/preloadQuery.js";
import {BIMServerGeometryLoader} from "./lib/BIMServerGeometryLoader.js";
import {defaultMaterials} from "./lib/defaultMaterials.js";
import {BIMServerModel} from "./lib/BIMServerModel.js";
import {utils} from "./lib/utils.js";

/**
 A viewer plugin that loads models from a [BIMServer](http://bimserver.org) instance.

 @class BIMServerModelsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer
 @param bimServerAPI {Object} The BIMServer client API
 */
class BIMServerModelsPlugin extends Plugin {

    constructor(viewer, bimServerAPI) {

        super("bimServerModels", viewer);

        /**
         * Version of BIMServer supported by this plugin.
         * @type {string}
         */
        this.BIMSERVER_VERSION = "1.5";

        /**
         * The BIMServer API.
         */
        this.bimServerAPI = bimServerAPI;

        /**
         * IFC types that are hidden by default.
         * @type {{IfcOpeningElement: boolean, IfcSpace: boolean}}
         */
        this.hiddenTypes = {
            "IfcOpeningElement": true,
            "IfcSpace": true
        };

        this._idMapping = { // This are arrays as multiple models might be loaded or unloaded.
            'toGuid': [],
            'toId': []
        };

    }

    /**
     * Loads a model from BIMServer into the viewer via the plugin's BIMServer API client.
     * @param params
     * @returns {Promise}
     */
    load(params) {
        if (!params.id) {
            this.error("load() param expected: id");
            return;
        }
        if (this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + id);
            return;
        }
        const bimServerAPI = this.bimServerAPI;
        const self = this;
        return new Promise((resolve, reject) => {
            bimServerAPI.getModel(params.poid, params.roid, params.schema, false,
                apiModel => {  // TODO: Preload not necessary combined with the bruteforce tree
                    let fired = false;
                    apiModel.query(preloadQuery, () => {
                        if (!fired) {
                            fired = true;
                            const bimServerModel = new BIMServerModel(bimServerAPI, apiModel);
                            self._loadModel(params, bimServerModel);
                            resolve(bimServerModel);
                        }
                    });
                });
        });
    };

    /**
     * @private
     */
    _loadModel(params, bimServerModel) {

        const bimServerAPI = this.bimServerAPI;
        const viewer = this.viewer;
        const self = this;
        let onTick;

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

            self._idMapping.toGuid.push(oidToGuid);
            self._idMapping.toId.push(guidToOid);

            const models = {};

            models[bimServerModel.apiModel.roid] = bimServerModel.apiModel; // TODO: Ugh. Undecorate some of the newly created classes

            const modelId = params.id;

            var xeoglModel = self._createModel(modelId);

            const roid = params.roid;

            const loader = new BIMServerGeometryLoader(bimServerAPI, self.viewer, bimServerModel, roid);

            loader.addProgressListener((progress, nrObjectsRead, totalNrObjects) => {
                if (progress == "start") {
                    self.log("Started loading geometries");
                } else if (progress == "done") {
                    self.log(`Finished loading geometries (${totalNrObjects} objects received)`);
                    viewer.scene.off(onTick);
                }
            });

            loader.setLoadOids(oids);
            //loader.setLoadOids([bimServerModel.apiModel.roid], oids);

            onTick = viewer.scene.on("tick", () => {
                loader.process();
            });

            loader.start();
        });
    };

    /**
     * @private
     */
    _createModel(modelId) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        if (scene.models[modelId]) {
            this.log(`Can't create model within viewer - scene model with id ${modelId} already exists`);
            return;
        }
        if (scene.components[modelId]) {
            this.log(`Can't create model within viewer - scene component with this ID already exists: ${modelId}`);
            return;
        }
        const xeoglModel = new xeoglModelClass(scene, {
            id: modelId
        });
        return xeoglModel;
    }

    /**
     * @private
     */
    _createGeometry(modelId, geometryId, positions, normals, colors, indices) {
        const scene = this.scene;
        const model = scene.models[modelId];
        if (!model) {
            this.error(`Can't create geometry - model not found: ${modelId}`);
            return;
        }
        new Geometry(model, { // Geometry will be destroyed with the Model
            id: `${modelId}.${geometryId}`,
            primitive: "triangles",
            positions,
            normals,
            colors,
            indices
        });
    }

    /**
     * Called by BimServerGeometryLoader
     * @private
     */
    _createObject(modelId, roid, oid, objectId, geometryIds, ifcType, matrix) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const model = scene.models[modelId];
        if (!model) {
            this.error(`Can't create object - model not found: ${modelId}`);
            return;
        }
        objectId = `${modelId}.${objectId}`;
        if (scene.entities[objectId]) {
            this.error(`Can't create object - object with id ${objectId} already exists`);
            return;
        }
        if (scene.components[objectId]) {
            this.error(`Can't create object - scene component with this ID already exists: ${objectId}`);
            return;
        }
        ifcType = ifcType || "DEFAULT";
        const guid = (objectId.includes("#")) ? utils.CompressGuid(objectId.split("#")[1].substr(8, 36).replace(/-/g, "")) : null; // TODO: Computing GUID looks like a performance bottleneck
        const color = defaultMaterials[ifcType] || defaultMaterials["DEFAULT"];
        const object = new xeoglObjectClass(model, { // Object will be destroyed with the Model
            id: objectId,
            guid,
            entityType: ifcType, // xeogl semantic models are generic, not limited to IFC
            matrix,
            colorize: color, // RGB
            opacity: color[3], // A
            visibility: !this.hiddenTypes[ifcType]
        });
        // TODO: Call model._addComponent to register child Object?
        model.addChild(object, false); // Object is child of Model, does not inherit visible states from Model
        for (let i = 0, len = geometryIds.length; i < len; i++) { // Create child Meshes of Object
            const mesh = new Mesh(model, { // Each Mesh will be destroyed with the Model
                geometry: `${modelId}.${geometryIds[i]}`
            });
            mesh.colorize = color; // HACK: Overrides state inheritance
            object.addChild(mesh, true); // Mesh is child of Object, inherits visibility states from Object
        }
        return object;
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

export {BIMServerModelsPlugin}