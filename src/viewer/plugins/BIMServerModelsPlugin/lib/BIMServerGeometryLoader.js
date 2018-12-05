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
    var prepareReceived = false;
    const todo = [];
    const geometriesLoaded = {};
    const objectsWaitingForGeometryData = {};

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
                if (!prepareReceived) {
                    prepareReceived = true;
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
            modelBuilder.error("data does not start with BGS (" + start + ")");
            return false;
        }
        protocolVersion = data.readByte();
        modelBuilder.log("BIMServer protocol version = " + protocolVersion);
        if (protocolVersion !== 10 && protocolVersion !== 11 && protocolVersion !== 16) {
            modelBuilder.error("Unimplemented protocol version");
            return false;
        }
        if (protocolVersion > 15) {
            o.multiplierToMm = data.readFloat();
        }
        data.align8();
        var boundary = data.readDoubleArray(6);
        modelBuilder.gotModelBoundary(boundary);
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

        //---------------------------------------------------------------------------------
        // protocol version assumed to be 16
        //---------------------------------------------------------------------------------

        const color = new Float32Array([1, 1, 1, 1]);

        if (geometryType === 1) {

            //-----------------------------------------------------------------------------
            // Geometry
            //-----------------------------------------------------------------------------

            let reused = stream.readInt();
            let ifcType = stream.readUTF8();

            stream.align8();

            let roid = stream.readLong();
            let croid = stream.readLong();
            let hasTransparency = stream.readLong() === 1;

            let geometryDataId = stream.readLong();
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

            modelBuilder.createGeometry(geometryDataId, positions, normals, indices, reused);

            geometriesLoaded[geometryDataId] = true;

            if (objectsWaitingForGeometryData[geometryDataId] !== null) {

                // Object(s) waiting for this geometry

                objectsWaitingForGeometryData[geometryDataId].forEach(function (oid) {
                    modelBuilder.addGeometryToObject(oid, geometryDataId);
                });

                delete objectsWaitingForGeometryData[geometryDataId];
            }

        } else if (geometryType === 5) {

            //-----------------------------------------------------------------------------
            // Object
            //-----------------------------------------------------------------------------

            var oid = stream.readLong();
            let ifcType = stream.readUTF8();

            stream.align8();

            let roid = stream.readLong();
            let geometryInfoOid = stream.readLong();
            let hasTransparency = stream.readLong() === 1;
            let objectBounds = stream.readDoubleArray(6);
            let matrix = stream.readDoubleArray(16);
            let geometryDataId = stream.readLong();
            let geometryDataOidFound = geometryDataId;
            oid = infoToOid[geometryInfoOid];

            if (oid === null) {
                modelBuilder.error("Not found", infoToOid, geometryInfoOid);
                return;
            }

            let geometryLoaded = geometriesLoaded[geometryDataId];

            modelBuilder.createObject(oid, geometryLoaded ? [geometryDataId] : [], ifcType, matrix);

            if (!geometryLoaded) {

                // Geometry not yet loaded for this object - save the object as waiting for this geometry

                var list = objectsWaitingForGeometryData[geometryDataId];
                if (!list) {
                    list = [];
                    objectsWaitingForGeometryData[geometryDataId] = list;
                }
                list.push(oid);
            }
        }

        currentState.nrObjectsRead++;

        updateProgress();
    }
}

export {BIMServerGeometryLoader};