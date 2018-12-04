import {DataInputStreamReader} from "./DataInputStreamReader.js";

/**
 *
 * @param bimServerAPI
 * @param bimServerModel
 * @param roid
 * @param globalTransformationMatrix
 * @param modelBuilder
 * @constructor
 * @private
 */
function BIMServerGeometryLoader(bimServerAPI, bimServerModel, roid, globalTransformationMatrix, modelBuilder) {

    var o = this;

    var protocolVersion = null;
    var currentState = {};
    const progressListeners = [];
    const objectAddedListeners = [];
    o.prepareReceived = false;
    const todo = [];
    o.geometryIds = {};
    const dataToInfo = {};

    o.roid = roid;

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
        o.infoToOid = o.options.oids;

        for (var k in o.infoToOid) {
            var oid = parseInt(o.infoToOid[k]);
            bimServerModel.apiModel.get(oid, function (object) {
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
            bimServerAPI.call("ServiceInterface", "download", {
                roids: [o.roid],
                query: JSON.stringify(useNewQuery ? newQuery : oldQuery),
                serializerOid: serializer.oid,
                sync: false
            }, function (topicId) {
                o.topicId = topicId;
                bimServerAPI.registerProgressHandler(o.topicId, progressHandler);
            });
        };

        var promise = bimServerAPI.getSerializerByPluginClassName(serializerName + "3", pluginCallback);
        if (promise) {
            // If this returns a promise (it'll never be cancelled btw. even in case of error) we're
            // talking to a newer version of the plugin ecosystem and we can try the new query.
            useNewQuery = true;
            bimServerAPI.getSerializerByPluginClassName(serializerName).then(pluginCallback);
        }
    };

    function progressHandler(topicId, state) {
        if (topicId === o.topicId) {
            if (state.title === "Done preparing") {
                if (!o.prepareReceived) {
                    o.prepareReceived = true;
                    downloadInitiated();
                }
            }
            if (state.state === "FINISHED") {
                bimServerAPI.unregisterProgressHandler(o.topicId, progressHandler);
            }
        }
    }

    function downloadInitiated() {
        currentState = {
            mode: 0,
            nrObjectsRead: 0,
            nrObjects: 0
        };
        bimServerAPI.setBinaryDataListener(o.topicId, binaryDataListener);
        bimServerAPI.downloadViaWebsocket({
            longActionId: o.topicId,
            topicId: o.topicId
        });
    }

    function binaryDataListener(data) {
        todo.push(data);
    }

    function afterRegistration(topicId) {
        bimServerAPI.call("Bimsie1NotificationRegistryInterface", "getProgress", {
            topicId: o.topicId
        }, function (state) {
            progressHandler(o.topicId, state);
        });
    }

    function readStart(data) {
        var start = data.readUTF8();
        if (start !== "BGS") {
            console.error("data does not start with BGS (" + start + ")");
            return false;
        }
        protocolVersion = data.readByte();
        console.log("Protocol version", protocolVersion);
        if (protocolVersion !== 10 && protocolVersion !== 11 && protocolVersion !== 16) {
            console.error("Unimplemented version");
            return false;
        }
        if (protocolVersion > 15) {
            o.multiplierToMm = data.readFloat();
        }
        data.align8();
        var boundary = data.readDoubleArray(6);
        modelBuilder.gotBoundary(boundary);
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
        bimServerAPI.call("ServiceInterface", "cleanupLongAction", {topicId: o.topicId}, function () {
        });
    }

    function updateProgress() {
    }

    function readObject(stream, geometryType) {
        var geometryId;
        var numGeometries;
        var numParts;
        var objectBounds;
        var numIndices;
        var indices;
        var numPositions;
        var positions;
        var numNormals;
        var normals;
        var numColors;
        var colors = null;
        var reused;
        var type;
        var roid;
        var croid;
        var hasTransparency;
        var matrix;
        var color;

        var i;

        if (protocolVersion < 16) {
            stream.align8();
        }

        if (geometryType === 1) {

            if (protocolVersion > 15) {
                reused = stream.readInt();
                type = stream.readUTF8();
                stream.align8();

                roid = stream.readLong();
                croid = stream.readLong();
                hasTransparency = stream.readLong() === 1;
            }

            geometryId = stream.readLong();
            numIndices = stream.readInt();
            indices = stream.readShortArray(numIndices);

            if (protocolVersion >= 11) {
                stream.align4();
                var b = stream.readInt();
                if (b === 1) {
                    color = {
                        r: stream.readFloat(),
                        g: stream.readFloat(),
                        b: stream.readFloat(),
                        a: stream.readFloat()
                    };
                }
            }

            numPositions = stream.readInt();
            positions = stream.readFloatArray(numPositions);
            numNormals = stream.readInt();
            normals = stream.readFloatArray(numNormals);
            numColors = stream.readInt();

            if (numColors > 0) {
                colors = stream.readFloatArray(numColors);
            } else if (color != null) {
                // Creating vertex colors here anyways (not transmitted over the line is a plus), should find a way to do this with scenejs without vertex-colors
                colors = new Array(numPositions * 4);
                for (var i = 0; i < numPositions; i++) {
                    colors[i * 4] = color.r;
                    colors[i * 4 + 1] = color.g;
                    colors[i * 4 + 2] = color.b;
                    colors[i * 4 + 3] = color.a;
                }
            }

            o.geometryIds[geometryId] = [geometryId];

            modelBuilder.createGeometry(geometryId, positions, normals, colors, indices);

            if (dataToInfo[geometryId] != null) {
                dataToInfo[geometryId].forEach(function (oid) {
                    modelBuilder.addGeometryToObject(oid, geometryId);

                    //     var ob = o.viewer.getObject(o.roid + ":" + oid);
                    //        ob.add(geometryId);
                });
                delete dataToInfo[geometryId];
            }

        } else if (geometryType === 2) {

            console.log("Unimplemented", 2);

        } else if (geometryType === 3) {

            var geometryDataOid = stream.readLong();

            numParts = stream.readInt();
            o.geometryIds[geometryDataOid] = [];

            var geometryIds = [];

            for (i = 0; i < numParts; i++) {
                var partId = stream.readLong();
                geometryId = geometryDataOid + "_" + i;
                numIndices = stream.readInt();

                if (protocolVersion > 15) {
                    indices = stream.readIntArray(numIndices);
                } else {
                    indices = stream.readShortArray(numIndices);
                }

                if (protocolVersion >= 11) {
                    var b = stream.readInt();
                    if (b === 1) {
                        color = {
                            r: stream.readFloat(),
                            g: stream.readFloat(),
                            b: stream.readFloat(),
                            a: stream.readFloat()
                        };
                    }
                }
                stream.align4();

                numPositions = stream.readInt();
                positions = stream.readFloatArray(numPositions);
                numNormals = stream.readInt();
                normals = stream.readFloatArray(numNormals);
                numColors = stream.readInt();
                if (numColors > 0) {
                    colors = stream.readFloatArray(numColors);
                } else if (color != null) {
                    // Creating vertex colors here anyways (not transmitted over the line is a plus), should find a way to do this with scenejs without vertex-colors
                    colors = new Array(numPositions * 4);
                    for (var i = 0; i < numPositions; i++) {
                        colors[i * 4 + 0] = color.r;
                        colors[i * 4 + 1] = color.g;
                        colors[i * 4 + 2] = color.b;
                        colors[i * 4 + 3] = color.a;
                    }
                }

                geometryIds.push(geometryId);
                o.geometryIds[geometryDataOid].push(geometryId);

                modelBuilder.createGeometry(geometryId, positions, normals, colors, indices);
            }

            if (dataToInfo[geometryDataOid] != null) {
                dataToInfo[geometryDataOid].forEach(function (oid) {
                    var ob = o.viewer.getObject(o.roid + ":" + oid);
                    geometryIds.forEach(function (geometryId) {
                        ob.add(geometryId);
                    });
                });
                delete dataToInfo[geometryDataOid];
            }

        } else if (geometryType === 4) {
            console.log("Unimplemented", 4);

        } else if (geometryType === 5) {

            if (protocolVersion > 15) {
                oid = stream.readLong();
                type = stream.readUTF8();
                stream.align8();
            }

            roid = stream.readLong();
            var geometryInfoOid = stream.readLong();

            if (protocolVersion > 15) {
                hasTransparency = stream.readLong() === 1;
            }

            objectBounds = stream.readDoubleArray(6);
            matrix = stream.readDoubleArray(16);

            // if (globalTransformationMatrix != null) {
            //     xeogl.math.mulMat4(matrix, matrix, globalTransformationMatrix);
            // }

            var geometryDataOid = stream.readLong();
            var geometryDataOids = o.geometryIds[geometryDataOid];
            var oid = o.infoToOid[geometryInfoOid];

            if (geometryDataOids == null) {
                geometryDataOids = [];
                var list = dataToInfo[geometryDataOid];
                if (list == null) {
                    list = [];
                    dataToInfo[geometryDataOid] = list;
                }
                list.push(oid);
            }

            if (oid == null) {
                console.error("Not found", o.infoToOid, geometryInfoOid);
            } else {

                bimServerModel.apiModel.get(oid, function (object) {

                    object.gid = geometryInfoOid;
                    var modelId = o.roid; // TODO: set to the model ID

                    if (currentState.mode === 0) {
                        console.log("Mode is still 0, should be 1");
                        return;
                    }

                    modelBuilder.createObject(oid, geometryDataOids, object.getType(), matrix);
                });
            }

        } else {

            o.warn("Unsupported geometry type: " + geometryType);
            return;
        }

        currentState.nrObjectsRead++;

        updateProgress();
    }
}

export {BIMServerGeometryLoader};