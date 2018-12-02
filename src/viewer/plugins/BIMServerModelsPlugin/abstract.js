import {BimServerClient} from "localhost:8080/apps/bimserverjavascriptapi/bimserverclient.js";
import {GeometryLoader} from "./lib/bimServerGeometryLoader";

const BIMSERVER_VERSION = "1.4";
const schema = null; // TODO: Find value for this

const bimServerAddress = "localhost:8080";
const username = "admin@bimserver.org";
const password = "admin";
const poid = 196609;

const bimServerClient = new BimServerClient(bimServerAddress);

const idMapping = { // This are arrays as multiple models might be loaded or unloaded.
    'toGuid': [],
    'toId': []
};

bimServerClient.init(() => { // Initialize BIMSServer client

    bimServerClient.login(username, password, () => { // Login to BIMServer

        bimServerClient.call("ServiceInterface", "getProjectByPoid", { // Get project
            poid: poid
        }, (apiProject) => {

            const roid = apiProject.lastRevisionId; // We'll load the latest revision Model of the project

            bimServerClient.getModel(poid, roid, schema, false,

                apiModel => {

                    apiModel.getTree().then(function (tree) {

                        const oids = [];
                        const oidToGuid = {};
                        const guidToOid = {};

                        const visit = node => {
                            oids[node.gid] = node.id;
                            oidToGuid[node.id] = node.guid;
                            guidToOid[node.guid] = node.id;
                            for (let i = 0; i < (node.children || []).length; ++i) {
                                visit(node.children[i]);
                            }
                        };

                        visit(tree);

                        idMapping.toGuid.push(oidToGuid);
                        idMapping.toId.push(guidToOid);

                        const modelId = apiModel.roid;

                        createModel(modelId);

                        var obj = [];

                        const groupId = o.roid;
                        const infoToOid = o.options.oids;

                        for (var k in infoToOid) {
                            var oid = parseInt(infoToOid[k]);

                            apiModel.get(oid, function (object) {

                                if (object.object._rgeometry != null) {

                                    if (object.model.objects[object.object._rgeometry] != null) {

                                        // Only if this data is preloaded, otherwise just don't include any gi

                                        object.getGeometry(function (geometryInfo) {

                                            obj.push({
                                                gid: object.object._rgeometry,
                                                oid: object.oid,
                                                object: object,
                                                info: geometryInfo.object
                                            });

                                        });
                                    } else {
                                        obj.push({gid: object.object._rgeometry, oid: object.oid, object: object});
                                    }
                                }
                            });
                        }
                        obj.sort(function (a, b) {
                            if (a.info != null && b.info != null) {
                                var topa = (a.info._emaxBounds.z + a.info._eminBounds.z) / 2;
                                var topb = (b.info._emaxBounds.z + b.info._eminBounds.z) / 2;
                                return topa - topb;
                            } else {
                                // Resort back to type
                                // TODO this is dodgy when some objects do have info, and others don't
                                return a.object.getType().localeCompare(b.object.getType());
                            }
                        });

                        var oids = [];
                        obj.forEach(function (wrapper) {
                            oids.push(wrapper.object.object._rgeometry._i);
                        });

                        var query = {
                            type: "GeometryInfo",
                            oids: oids,
                            include: {
                                type: "GeometryInfo",
                                field: "data"
                            }
                        };





                        bimServerClient.getMessagingSerializerByPluginClassName("org.bimserver.serializers.binarygeometry.BinaryGeometryMessagingSerializerPlugin", function (serializer) {

                            bimServerClient.call("Bimsie1ServiceInterface", "downloadByOids", {
                                    roids: [roid],
                                    oids: oids,
                                    serializerOid: serializer.oid,
                                    sync: false,
                                    deep: false
                                },

                                function (topicId) {

                                    bimServerClient.registerProgressHandler(topicId,

                                        function (topicId, state) { // progress handler
                                            if (topicId == o.topicId) {
                                                if (state.title == "Done preparing") {
                                                    if (!o.prepareReceived) {
                                                        o.prepareReceived = true;
                                                        o._downloadInitiated();
                                                    }
                                                }
                                                if (state.state == "FINISHED") {
                                                    o.bimServerApi.unregisterProgressHandler(o.topicId, o._progressHandler);
                                                }
                                            }
                                        },
                                        function (e) { // after registration

                                        });
                                });
                        });


                        const loader = new GeometryLoader(this.viewer, bimServerModel);

                        loader.addProgressListener((progress, nrObjectsRead, totalNrObjects) => {
                            if (progress == "start") {
                                self.log("Started loading geometries");
                            } else if (progress == "done") {
                                self.log(`Finished loading geometries (${totalNrObjects} objects received)`);
                                viewer.scene.off(onTick);
                            }
                        });

                        loader.setLoadOids([roid], oids);

                        onTick = viewer.scene.on("tick", () => {
                            loader.process();
                        });

                        loader.start();
                    });


                    const modelId = apiModel.roid;


                    bimServerClient.getMessagingSerializerByPluginClassName(
                        "org.bimserver.serializes.binarygeometry.BinaryGeometryMessagingSerializerPlugin", function (serializer) {

                            bimServerClient.call("Bimsie1ServiceInterface", "downloadByOids", {
                                roids: [roid],
                                oids: o.options.oids,
                                serializerOid: serializer.oid,
                                sync: false,
                                deep: false
                            }, function (topicId) {
                                o.topicId = topicId;
                                o.bimServerClient.registerProgressHandler(o.topicId, o._progressHandler, o._afterRegistration);
                            });
                        });


                    const bimServerModel = new BIMServerModel(bimServerAPI, apiModel);

                    self._loadModel(params, bimServerModel);
                    resolve(bimServerModel);
                }
        });
    });

// Create a viewer plugin to load BIMServer models into the viewer via the client API
    const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, bimServerClient);

    // Load the latest revision of a project from BIMServer

    const model = bimServerModelsPlugin.load({
        id: "myModel",
        poid: 196609
    });
});


function createModel(modelId) {

}


function createObject(modelId, objectId) {

}