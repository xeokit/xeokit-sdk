import {DataInputStreamReader} from "./DataInputStreamReader.js";
import {defaultMaterials} from "./defaultMaterials.js";

/**
 *
 * @param bimServerClient
 * @param bimServerModel
 * @param roid
 * @param globalTransformationMatrix
 * @param bigModelBuilder
 * @constructor
 * @private
 */
function BIMServerBigGeometryLoader(bimServerClient, bimServerClientModel, roid, globalTransformationMatrix, bigModelBuilder) {

    var o = this;

    var protocolVersion = null;
    var currentState = {};
    const progressListeners = [];
    var prepareReceived = false;
    const todo = [];
    const multiUseGeometryLoaded = {};
    const geometriesLoaded = {};
    const objectsWaitingForGeometryData = {};
    const singleUseGeometriesWaitingForObjects = {};

    const singleUseGeometryLoaded = {};

    o.roid = roid;
    var infoToOid = {};

    this.addProgressListener = function (progressListener) {
        progressListeners.push(progressListener);
    };

    function processMessage(stream) {
        var messageType = stream.readByte();
        if (messageType === 0) {
            readStart(stream);
        } else if (messageType === 6) {
            readEnd(stream);
        } else {
            readObject(stream, messageType);
        }
        stream.align8();
        return stream.remaining() > 0;
    }

    this.process = function () {
        var data = todo.shift();
        var stream;
        while (data != null) {
            stream = new DataInputStreamReader(data);
            var topicId = stream.readLong();
            while (processMessage(stream)) {

            }
            data = todo.shift();
        }
    };

    this.setLoadOids = function (oids) {
        o.options = {type: "oids", oids: oids};
    };

    this.start = function () {

        if (!o.options || o.options.type !== "oids") {
            throw new Error("Invalid loader configuration");
        }

        var obj = [];

        o.groupId = o.roid;
        infoToOid = o.options.oids;

        for (var k in infoToOid) {
            var oid = parseInt(infoToOid[k]);
            bimServerClientModel.get(oid, function (object) {
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

        var serializerName = "org.bimserver.serializers.binarygeometry.BinaryGeometryMessagingStreamingSerializerPlugin";

        var fieldsToInclude = ["indices"];
        fieldsToInclude.push("normals");
        fieldsToInclude.push("vertices");
        fieldsToInclude.push("colorsQuantized");

        var newQuery = {
            type: "GeometryInfo",
            oids: oids,
            include: {
                type: "GeometryInfo",
                field: "data",
                include: {
                    type: "GeometryData",
                    fieldsDirect: fieldsToInclude
                }
            },
            loaderSettings: {
                splitGeometry: false
            }
        };

        var oldQuery = {
            type: "GeometryInfo",
            oids: oids,
            include: {
                type: "GeometryInfo",
                field: "data"
            }
        };

        var useNewQuery = false;

        var pluginCallback = function (serializer) {
            bimServerClient.call("ServiceInterface", "download", {
                roids: [o.roid],
                query: JSON.stringify(useNewQuery ? newQuery : oldQuery),
                serializerOid: serializer.oid,
                sync: false
            }, function (topicId) {
                o.topicId = topicId;
                bimServerClient.registerProgressHandler(o.topicId, progressHandler);
            });
        };

        var promise = bimServerClient.getSerializerByPluginClassName(serializerName + "3", pluginCallback);
        if (promise) {
            // If this returns a promise (it'll never be cancelled btw. even in case of error) we're
            // talking to a newer version of the plugin ecosystem and we can try the new query.
            useNewQuery = true;
            bimServerClient.getSerializerByPluginClassName(serializerName).then(pluginCallback);
        }
    };

    function progressHandler(topicId, state) {
        if (topicId === o.topicId) {
            if (state.title === "Done preparing") {
                if (!prepareReceived) {
                    prepareReceived = true;
                    downloadInitiated();
                }
            }
            if (state.state === "FINISHED") {
                bimServerClient.unregisterProgressHandler(o.topicId, progressHandler);
            }
        }
    }

    function downloadInitiated() {
        currentState = {
            mode: 0,
            nrObjectsRead: 0,
            nrObjects: 0
        };
        bimServerClient.setBinaryDataListener(o.topicId, binaryDataListener);
        bimServerClient.downloadViaWebsocket({
            longActionId: o.topicId,
            topicId: o.topicId
        });
    }

    function binaryDataListener(data) {
        todo.push(data);
    }

    function afterRegistration(topicId) {
        bimServerClient.call("Bimsie1NotificationRegistryInterface", "getProgress", {
            topicId: o.topicId
        }, function (state) {
            progressHandler(o.topicId, state);
        });
    }

    function readStart(data) {
        var start = data.readUTF8();
        if (start !== "BGS") {
            bigModelBuilder.error("data does not start with BGS (" + start + ")");
            return false;
        }
        protocolVersion = data.readByte();
        bigModelBuilder.log("BIMServer protocol version = " + protocolVersion);
        if (protocolVersion !== 10 && protocolVersion !== 11 && protocolVersion !== 16 && protocolVersion !== 17) {
            bigModelBuilder.error("Unimplemented protocol version");
            return false;
        }
        if (protocolVersion > 15) {
            o.multiplierToMm = data.readFloat();
        }
        data.align8();
        var boundary = data.readDoubleArray(6);
        bigModelBuilder.gotModelBoundary(boundary);
        currentState.mode = 1;
        progressListeners.forEach(function (progressListener) {
            progressListener("start", currentState.nrObjectsRead, currentState.nrObjectsRead);
        });
        updateProgress();
    }

    function readEnd(data) {
        progressListeners.forEach(function (progressListener) {
            progressListener("done", currentState.nrObjectsRead, currentState.nrObjectsRead);
        });
        bimServerClient.call("ServiceInterface", "cleanupLongAction", {topicId: o.topicId}, function () {
        });
    }

    function updateProgress() {
    }

    function readObject(stream, geometryType) {

        //---------------------------------------------------------------------------------
        // protocol version assumed to be 16
        //---------------------------------------------------------------------------------

        const color = new Float32Array([1, 1, 1, 1]);

        if (geometryType === 1) {

            //-----------------------------------------------------------------------------
            // Geometry data received
            //-----------------------------------------------------------------------------

            let reused = stream.readInt();
            let ifcType = stream.readUTF8();
            let ifcColor = defaultMaterials[ifcType];

            stream.align8();

            let roid = stream.readLong();
            let croid = stream.readLong();
            let hasTransparency = stream.readLong() === 1;

            let geometryId = stream.readLong();
            let numIndices = stream.readInt();
            let indices = stream.readShortArray(numIndices);

            stream.align4();

            let b = stream.readInt();
            let gotColor = (b === 1);

            if (gotColor) {
                color[0] = stream.readFloat();
                color[1] = stream.readFloat();
                color[2] = stream.readFloat();
                color[3] = stream.readFloat();
            }

            let numPositions = stream.readInt();
            let positions = stream.readFloatArray(numPositions);
            let numNormals = stream.readInt();
            let normals = stream.readFloatArray(numNormals);
            let numColors = stream.readInt();

            var colors = null;

            if (numColors > 0) {

                colors = stream.readFloatArray(numColors);

                color[0] = colors[0];
                color[1] = colors[0];
                color[2] = colors[0];
                color[3] = colors[0];

            } else if (color !== null) {

                // Creating vertex colors here anyways (not transmitted over the line is a plus), should find a way to do this with scenejs without vertex-colors

                // colors = new Array(numPositions * 4);
                //
                // for (var i = 0; i < numPositions; i++) {
                //     colors[i * 4] = color.r;
                //     colors[i * 4 + 1] = color.g;
                //     colors[i * 4 + 2] = color.b;
                //     colors[i * 4 + 3] = color.a;
                // }
            }

            var multiUseGeometry = (reused > 1);

            if (multiUseGeometry) {

                //------------------------------------------------------------------------------------------------------
                // MULTI-USE GEOMETRY
                //------------------------------------------------------------------------------------------------------

                bigModelBuilder.createGeometry(geometryId, positions, normals, indices, reused);

                multiUseGeometryLoaded[geometryId] = true;

                if (objectsWaitingForGeometryData[geometryId] !== null) {

                    //------------------------------------------------------------------------------------------------------
                    // OBJECTS ARE WAITING
                    //------------------------------------------------------------------------------------------------------

                    let waitingObjects = objectsWaitingForGeometryData[geometryId];

                    for (var objectId in waitingObjects) {

                        if (waitingObjects.hasOwnProperty(objectId)) {

                            let waitingObjectData = waitingObjects[objectId];

                            let ifcColor = defaultMaterials[waitingObjectData.ifcType];

                            bigModelBuilder.createMeshInstancingGeometry(geometryId, waitingObjectData.matrix, ifcColor);
                            bigModelBuilder.createNode(objectId, geometryId, waitingObjectData.ifcType);

                            delete waitingObjects[objectId];
                        }
                    }
                }

            } else {

                //------------------------------------------------------------------------------------------------------
                // SINGLE USE GEOMETRY
                //------------------------------------------------------------------------------------------------------

                if (objectsWaitingForGeometryData[geometryId] !== null) {

                    //--------------------------------------------------------------------------------------------------
                    // THE OBJECT IS WAITING
                    //--------------------------------------------------------------------------------------------------

                    var waitingObjects = objectsWaitingForGeometryData[geometryId];

                    for (var objectId in waitingObjects) {
                        if (waitingObjects.hasOwnProperty(objectId)) {

                            let waitingObjectData = waitingObjects[objectId];

                            let ifcColor = defaultMaterials[waitingObjectData.ifcType];

                            bigModelBuilder.createMeshSpecifyingGeometry(geometryId, positions, normals, indices, waitingObjectData.matrix, ifcColor);
                            bigModelBuilder.createNode(objectId, geometryId, waitingObjectData.ifcType);
                        }
                    }

                    delete objectsWaitingForGeometryData[geometryId];
                    delete singleUseGeometryLoaded[geometryId];

                } else {

                    //--------------------------------------------------------------------------------------------------
                    // NO OBJECT IS WAITING
                    // GEOMETRY NOW WAITS FOR OBJECT
                    //--------------------------------------------------------------------------------------------------

                    let waitingGeometryData = {
                        positions: positions,
                        normals: normals,
                        indices: indices
                    };

                    singleUseGeometriesWaitingForObjects[geometryId] = waitingGeometryData;
                }
            }

        } else if (geometryType === 5) {

            //----------------------------------------------------------------------------------------------------------
            // Object data received
            //----------------------------------------------------------------------------------------------------------

            var inPreparedBuffer = stream.readByte() === 1;
            var oid = stream.readLong();
            let ifcType = stream.readUTF8();

            let ifcColor = defaultMaterials[ifcType];

            stream.align8();

            let roid = stream.readLong();
            let geometryInfoOid = stream.readLong();
            let hasTransparency = stream.readLong() === 1;
            let objectBounds = stream.readDoubleArray(6);
            let matrix = stream.readDoubleArray(16);
            let geometryId = stream.readLong();
            let geometryDataOidFound = geometryId;

            oid = infoToOid[geometryInfoOid];

            if (oid === null) {
                // bigModelBuilder.error("Not found", infoToOid, geometryInfoOid);
                return;
            }

            var objectId = oid;

            if (singleUseGeometriesWaitingForObjects[geometryId]) {

                //------------------------------------------------------------------------------------------------------
                // SINGLE USE GEOMETRY WAITING
                //------------------------------------------------------------------------------------------------------

                var waitingGeometryData = singleUseGeometriesWaitingForObjects[geometryId];
                var positions = waitingGeometryData.positions;
                var normals = waitingGeometryData.normals;
                var indices = waitingGeometryData.indices;

                bigModelBuilder.createMeshSpecifyingGeometry(geometryId, positions, normals, indices, matrix, ifcColor);
                bigModelBuilder.createNode(objectId, geometryId, ifcType);

                delete singleUseGeometryLoaded[geometryId];

            } else if (multiUseGeometryLoaded[geometryId]) {

                //------------------------------------------------------------------------------------------------------
                // MULTI-USE GEOMETRY WAITING
                //------------------------------------------------------------------------------------------------------

                bigModelBuilder.createMeshInstancingGeometry(geometryId, matrix, ifcColor);
                bigModelBuilder.createNode(oid, geometryId, ifcType);

            } else {

                //------------------------------------------------------------------------------------------------------
                // NO GEOMETRY WAITING
                //------------------------------------------------------------------------------------------------------

                var waitingObjects = objectsWaitingForGeometryData[geometryId];
                if (!waitingObjects) {
                    waitingObjects = {};
                    objectsWaitingForGeometryData[geometryId] = waitingObjects;
                }
                var waitingObjectData = {
                    ifcType: ifcType,
                    matrix: matrix
                };
                waitingObjects[objectId] = waitingObjectData;
            }
        } else if (geometryType === 9) {

            //--------------------------------------------------------------------------
            // Minimal object
            //--------------------------------------------------------------------------

            var oid = stream.readLong();
            var type = stream.readUTF8();
            var nrColors = stream.readInt();
            var roid = stream.readLong();
            var geometryInfoOid = stream.readLong();
            var hasTransparency = stream.readLong() === 1;

            stream.align8();
            var objectBounds = stream.readDoubleArrayCopy(6);

            var geometryDataOid = stream.readLong();
            var geometryDataOidFound = geometryDataOid;
            if (hasTransparency) {
                //     this.createdTransparentObjects.set(oid, {
                //         nrColors: nrColors,
                //         type: type
                //     });
                // } else {
                //     this.createdOpaqueObjects.set(oid, {
                //         nrColors: nrColors,
                //         type: type
                //     });
            }

        //    this.createObject(roid, oid, oid, [], null, hasTransparency, type, objectBounds, true);
        } else if (geometryType === 7) {
          //  this.processPreparedBuffer(stream, true);

        } else if (geometryType === 8) {
         //   this.processPreparedBuffer(stream, false);

        } else if (geometryType === 10) {
         //   this.processPreparedBufferInit(stream, true);

        } else if (geometryType === 11) {
          //  this.processPreparedBufferInit(stream, false);

        } else {
            console.error("Unsupported geometry type: " + geometryType);
// What's geometryType === 106 ?
        }

        currentState.nrObjectsRead++;

        updateProgress();
    }
}

export {BIMServerBigGeometryLoader};