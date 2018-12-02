import {BIMServerModel} from "./BIMServerModel.js";
import {PreloadQuery} from "./preloadQuery.js";
import {BIMServerGeometryLoader} from "./BIMServerGeometryLoader.js";

/**
 * @private
 */
class BIMServerModelLoader {

    constructor(viewer, bimServerClient, bimSurfer) {
        this.viewer = viewer;
        this.bimServerClient = bimServerClient;
        this.bimSurfer = bimSurfer;
    }

    loadFullModel(apiModel) {
        return new Promise(function (resolve, reject) {

            var model = new BIMServerModel(apiModel);

            apiModel.query(PreloadQuery, function () {
            }).done(function () {
                var oids = [];
                apiModel.getAllOfType("IfcProduct", true, function (object) {
                    oids.push(object.oid);
                });
                o.loadOids(model, oids);
                resolve(model);
            });
        });
    }

    loadObjects(apiModel, objects) {
        return new Promise(function (resolve, reject) {
            var model = new BimServerModel(apiModel);

            var oids = [];
            objects.forEach(function (object) {
                oids.push(object.oid);
            });
            this.loadOids(model, oids);
            resolve(model);
        });
    }

    loadOids(model, oids) {
        var oidToGuid = {};
        var guidToOid = {};

        var oidGid = {};

        oids.forEach(function (oid) {
            model.apiModel.get(oid, function (object) {
                if (object.object._rgeometry != null) {
                    var gid = object.object._rgeometry._i;
                    var guid = object.object.GlobalId;
                    oidToGuid[oid] = guid;
                    guidToOid[guid] = oid;
                    oidGid[gid] = oid;
                }
            });
        });

        var viewer = this.viewer;

        viewer._idMapping.toGuid.push(oidToGuid);
        viewer._idMapping.toId.push(guidToOid);

        viewer.taskStarted();

        viewer.createModel(model.apiModel.roid);

        var loader = new BIMServerGeometryLoader(model.api, viewer, model, model.apiModel.roid, this.globalTransformationMatrix);

        loader.addProgressListener(function (progress, nrObjectsRead, totalNrObjects) {
            if (progress == "start") {
                console.log("Started loading geometries");
//					self.fire("loading-started");
            } else if (progress == "done") {
                console.log("Finished loading geometries (" + totalNrObjects + " objects received)");
//					self.fire("loading-finished");
                viewer.taskFinished();
            }
        });

        loader.setLoadOids(oidGid);

        // viewer.clear(); // For now, until we support multiple models through the API

        viewer.on("tick", function () { // TODO: Fire "tick" event from xeoViewer
            loader.process();
        });

        loader.start();
    }

    setGlobalTransformationMatrix = function (globalTransformationMatrix) {
        this.globalTransformationMatrix = globalTransformationMatrix;
    }

}

export {BIMServerModelLoader};