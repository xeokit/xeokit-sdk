import {DataInputStreamReader} from "./DataInputStreamReader.js";
import {math} from "../../../../../libs/xeogl/xeogl.module.js";

/**
 * @private
 */
function BIMServerGeometryLoader(bimServerApi, viewer, model, roid, globalTransformationMatrix) {

    var o = this;

    o.bimServerApi = bimServerApi;
    o.viewer = viewer;
    o.state = {};
    o.progressListeners = [];
    o.objectAddedListeners = [];
    o.prepareReceived = false;
    o.todo = [];
    o.geometryIds = {};
    o.dataToInfo = {};

    o.model = model;
    o.roid = roid;

    this.addProgressListener = function (progressListener) {
        o.progressListeners.push(progressListener);
    };

    this.processMessage = function(stream) {
        var messageType = stream.readByte();

        if (messageType == 0) {
            o._readStart(stream);
        } else if (messageType == 6) {
            o._readEnd(stream);
        } else {
            o._readObject(stream, messageType);
        }
        stream.align8();
        return stream.remaining() > 0;
    }

    this.process = function () {
        var data = o.todo.shift();
        var stream;

        while (data != null) {
            stream = new DataInputStreamReader(data);
            var topicId = stream.readLong();
            while (o.processMessage(stream)) {

            }
            data = o.todo.shift();
        }
    };

    this.setLoadOids = function (oids) {
        o.options = {type: "oids", oids: oids};
    };

    /**
     * Starts this loader.
     */
    this.start = function () {
        if (!o.options || o.options.type !== "oids") {
            throw new Error("Invalid loader configuration");
        }

        var obj = [];

        o.groupId = o.roid;
        o.infoToOid = o.options.oids;

        for (var k in o.infoToOid) {
            var oid = parseInt(o.infoToOid[k]);
            o.model.apiModel.get(oid, function(object){
                if (object.object._rgeometry != null) {
                    if (object.model.objects[object.object._rgeometry] != null) {
                        // Only if this data is preloaded, otherwise just don't include any gi
                        object.getGeometry(function(geometryInfo){
                            obj.push({gid: object.object._rgeometry, oid: object.oid, object: object, info: geometryInfo.object});
                        });
                    } else {
                        obj.push({gid: object.object._rgeometry, oid: object.oid, object: object});
                    }
                }
            });
        }
        obj.sort(function(a, b){
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
        obj.forEach(function(wrapper){
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
            o.bimServerApi.call("ServiceInterface", "download", {
                roids: [o.roid],
                query: JSON.stringify(useNewQuery ? newQuery : oldQuery),
                serializerOid : serializer.oid,
                sync : false
            }, function(topicId){
                o.topicId = topicId;
                o.bimServerApi.registerProgressHandler(o.topicId, o._progressHandler);
            });
        };

        var promise = o.bimServerApi.getSerializerByPluginClassName(serializerName + "3", pluginCallback);
        if (promise) {
            // If this returns a promise (it'll never be cancelled btw. even in case of error) we're
            // talking to a newer version of the plugin ecosystem and we can try the new query.
            useNewQuery = true;
            o.bimServerApi.getSerializerByPluginClassName(serializerName).then(pluginCallback);
        }
    };

    this._progressHandler = function (topicId, state) {
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
    };

    this._downloadInitiated = function () {
        o.state = {
            mode: 0,
            nrObjectsRead: 0,
            nrObjects: 0
        };
        // o.viewer.SYSTEM.events.trigger('progressStarted', ['Loading Geometry']);
        // o.viewer.SYSTEM.events.trigger('progressBarStyleChanged', BIMSURFER.Constants.ProgressBarStyle.Continuous);
        var msg = {
            longActionId: o.topicId,
            topicId: o.topicId
        };
        o.bimServerApi.setBinaryDataListener(o.topicId, o._binaryDataListener);
        o.bimServerApi.downloadViaWebsocket(msg);
    };

    this._binaryDataListener = function (data) {
        o.todo.push(data);
    };

    this._afterRegistration = function (topicId) {
        o.bimServerApi.call("Bimsie1NotificationRegistryInterface", "getProgress", {
            topicId: o.topicId
        }, function (state) {
            o._progressHandler(o.topicId, state);
        });
    };

    this._readEnd = function (data) {
        o.progressListeners.forEach(function(progressListener){
            progressListener("done", o.state.nrObjectsRead, o.state.nrObjectsRead);
        });
        o.bimServerApi.call("ServiceInterface", "cleanupLongAction", {topicId: o.topicId}, function(){});
    };

    this._readStart = function (data) {
        var start = data.readUTF8();

        if (start != "BGS") {
            console.error("data does not start with BGS (" + start + ")");
            return false;
        }

        o.protocolVersion = data.readByte();
        console.log("Protocol version", o.protocolVersion);

        if (o.protocolVersion != 10 && o.protocolVersion != 11 && o.protocolVersion != 16) {
            console.error("Unimplemented version");
            return false;
        }
        if (o.protocolVersion > 15) {
            this.multiplierToMm = data.readFloat();
        }
        data.align8();

        var boundary = data.readDoubleArray(6);

        this._initCamera(boundary);

        o.state.mode = 1;

        o.progressListeners.forEach(function(progressListener){
            progressListener("start", o.state.nrObjectsRead, o.state.nrObjectsRead);
        });
        //o._updateProgress();
    };

    this._initCamera = function (boundary) {

        if (!this._gotCamera) {

            this._gotCamera = true;

            // Bump scene origin to center the model

            var xmin = boundary[0];
            var ymin = boundary[1];
            var zmin = boundary[2];
            var xmax = boundary[3];
            var ymax = boundary[4];
            var zmax = boundary[5];

            var diagonal = Math.sqrt(
                Math.pow(xmax - xmin, 2) +
                Math.pow(ymax - ymin, 2) +
                Math.pow(zmax - zmin, 2));

            var scale = 100 / diagonal;

            this.viewer.setScale(scale); // Temporary until we find a better scaling system.

            var far = diagonal * 5; // 5 being a guessed constant that should somehow coincide with the max zoom-out-factor

            var center = [
                scale * ((xmax + xmin) / 2),
                scale * ((ymax + ymin) / 2),
                scale * ((zmax + zmin) / 2)
            ];

            this.viewer.setCamera({
                type: "persp",
                target: center,
                up: [0, 0, 1],
                eye: [center[0] - scale * diagonal, center[1] - scale * diagonal, center[2] + scale * diagonal],
                far: 5000,
                near: 0.1,
                fovy: 35.8493
            });
        }
    };

    this._updateProgress = function () {};

    this._readObject = function (stream, geometryType) {
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


        var i;

        if (o.protocolVersion < 16) {
            stream.align8();
        }

        if (geometryType == 1) {
            if (o.protocolVersion > 15) {
                reused = stream.readInt();
                type = stream.readUTF8();
                stream.align8();

                roid = stream.readLong();
                croid = stream.readLong();
                hasTransparency = stream.readLong() == 1;
            }

            geometryId = stream.readLong();
            numIndices = stream.readInt();
            indices = stream.readShortArray(numIndices);

            if (o.protocolVersion >= 11) {
                stream.align4();
                var b = stream.readInt();
                if (b == 1) {
                    var color = {r: stream.readFloat(), g: stream.readFloat(), b: stream.readFloat(), a: stream.readFloat()};
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
                for (var i=0; i<numPositions; i++) {
                    colors[i * 4 + 0] = color.r;
                    colors[i * 4 + 1] = color.g;
                    colors[i * 4 + 2] = color.b;
                    colors[i * 4 + 3] = color.a;
                }
            }

            o.geometryIds[geometryId] = [geometryId];
            this.viewer.createGeometry(geometryId, positions, normals, colors, indices);

            if (o.dataToInfo[geometryId] != null) {
                o.dataToInfo[geometryId].forEach(function(oid){
                    var ob = o.viewer.getObject(o.roid + ":" + oid);
                    ob.add(geometryId);
                });
                delete o.dataToInfo[geometryId];
            }
        } else if (geometryType == 2) {
            console.log("Unimplemented", 2);
        } else if (geometryType == 3) {
            var geometryDataOid = stream.readLong();
            numParts = stream.readInt();
            o.geometryIds[geometryDataOid] = [];

            var geometryIds = [];
            for (i = 0; i < numParts; i++) {
                var partId = stream.readLong();
                geometryId = geometryDataOid + "_" + i;
                numIndices = stream.readInt();

                if (o.protocolVersion > 15) {
                    indices = stream.readIntArray(numIndices);
                } else {
                    indices = stream.readShortArray(numIndices);
                }

                if (o.protocolVersion >= 11) {
                    var b = stream.readInt();
                    if (b == 1) {
                        var color = {r: stream.readFloat(), g: stream.readFloat(), b: stream.readFloat(), a: stream.readFloat()};
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
                    for (var i=0; i<numPositions; i++) {
                        colors[i * 4 + 0] = color.r;
                        colors[i * 4 + 1] = color.g;
                        colors[i * 4 + 2] = color.b;
                        colors[i * 4 + 3] = color.a;
                    }
                }

                geometryIds.push(geometryId);
                o.geometryIds[geometryDataOid].push(geometryId);
                this.viewer.createGeometry(geometryId, positions, normals, colors, indices);
            }
            if (o.dataToInfo[geometryDataOid] != null) {
                o.dataToInfo[geometryDataOid].forEach(function(oid){
                    var ob = o.viewer.getObject(o.roid + ":" + oid);
                    geometryIds.forEach(function(geometryId){
                        ob.add(geometryId);
                    });
                });
                delete o.dataToInfo[geometryDataOid];
            }
        } else if (geometryType == 4) {
            console.log("Unimplemented", 4);
        } else if (geometryType == 5) {
            if (o.protocolVersion > 15) {
                oid = stream.readLong();
                type = stream.readUTF8();
                stream.align8();
            }

            var roid = stream.readLong();
            var geometryInfoOid = stream.readLong();

            if (o.protocolVersion > 15) {
                var hasTransparency = stream.readLong() == 1;
            }

            var objectBounds = stream.readDoubleArray(6);
            var matrix = stream.readDoubleArray(16);
            if (globalTransformationMatrix != null) {
                xeogl.math.mulMat4(matrix, matrix, globalTransformationMatrix);
            }
            var geometryDataOid = stream.readLong();
            var geometryDataOids = o.geometryIds[geometryDataOid];
            var oid = o.infoToOid[geometryInfoOid];
            if (geometryDataOids == null) {
                geometryDataOids = [];
                var list = o.dataToInfo[geometryDataOid];
                if (list == null) {
                    list = [];
                    o.dataToInfo[geometryDataOid] = list;
                }
                list.push(oid);
            }
            if (oid == null) {
                console.error("Not found", o.infoToOid, geometryInfoOid);
            } else {
                o.model.apiModel.get(oid, function(object){
                    object.gid = geometryInfoOid;
                    var modelId = o.roid; // TODO: set to the model ID
                    o._createObject(modelId, roid, oid, oid, geometryDataOids, object.getType(), matrix);
                });
            }
        } else {
            this.warn("Unsupported geometry type: " + geometryType);
            return;
        }

        o.state.nrObjectsRead++;

        o._updateProgress();
    };

    this._createObject = function (modelId, roid, oid, objectId, geometryIds, type, matrix) {

        if (o.state.mode == 0) {
            console.log("Mode is still 0, should be 1");
            return;
        }


        // o.models[roid].get(oid,
        // function () {
        if (o.viewer.createObject(modelId, roid, oid, objectId, geometryIds, type, matrix)) {

            // o.objectAddedListeners.forEach(function (listener) {
            // listener(objectId);
            // });
        }

        // });
    };
}

export {BIMServerGeometryLoader};