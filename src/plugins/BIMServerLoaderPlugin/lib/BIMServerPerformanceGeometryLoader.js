import {DataInputStreamReader} from "./DataInputStreamReader.js";
import {math as utils} from "../../../viewer/scene/math/math.js";

/**
 *
 * @param bimServerClient
 * @param bimServerClientModel
 * @param roid
 * @param globalTransformationMatrix
 * @param performanceModelBuilder
 * @constructor
 * @private
 */
function BIMServerPerformanceGeometryLoader(bimServerClient, bimServerClientModel, roid, globalTransformationMatrix, performanceModelBuilder) {

    var o = this;

    var protocolVersion = null;
    var currentState = {};
    const progressListeners = [];
    var prepareReceived = false;
    const todo = [];
    const multiUseGeometryLoaded = {};
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
            if (!readStart(stream)) {
                return false;
            }
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
            var type = stream.readLong();
            if (type == 0) {
                while (processMessage(stream)) {

                }
            } else if (type == 1) {
                // End of stream
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
            doublebuffer: false,
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
            performanceModelBuilder.error("data does not start with BGS (" + start + ")");
            return false;
        }
        protocolVersion = data.readByte();
        performanceModelBuilder.log("BIMServer protocol version = " + protocolVersion);
        if (protocolVersion !== 10 && protocolVersion !== 11 && protocolVersion !== 16 && protocolVersion !== 17 && protocolVersion != 18 && protocolVersion != 19 && protocolVersion != 20) {
            performanceModelBuilder.error("Unimplemented protocol version");
            return false;
        } else {
            currentState.version = protocolVersion;
        }
        if (protocolVersion > 15) {
            o.multiplierToMm = data.readFloat();
        }
        data.align8();
        var boundary = data.readDoubleArray(6);
        performanceModelBuilder.gotModelBoundary(boundary);
        currentState.mode = 1;
        progressListeners.forEach(function (progressListener) {
            progressListener("start", currentState.nrObjectsRead, currentState.nrObjectsRead);
        });
        updateProgress();
        return true;
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

        let color = new Float32Array([1, 1, 1, 1]);

        if (geometryType === 1) {

            //-----------------------------------------------------------------------------
            // Geometry data received
            //-----------------------------------------------------------------------------

            let reused = stream.readInt();
            let ifcType = stream.readUTF8();

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

            if (!gotColor && numColors > 0) {
                colors = stream.readFloatArray(numColors);
                color[0] = colors[0];
                color[1] = colors[1];
                color[2] = colors[2];
                color[3] = colors[3];
                gotColor = true;
            }

            if (!gotColor) {
                color[0] = 1.0;
                color[1] = 1.0;
                color[2] = 1.0;
                color[3] = 1.0;
            }

            var multiUseGeometry = (reused > 1);

            if (multiUseGeometry) {

                //------------------------------------------------------------------------------------------------------
                // MULTI-USE GEOMETRY
                //------------------------------------------------------------------------------------------------------

                performanceModelBuilder.createGeometry(geometryId, positions, normals, indices);

                multiUseGeometryLoaded[geometryId] = true;

                if (objectsWaitingForGeometryData[geometryId] !== null) {

                    //------------------------------------------------------------------------------------------------------
                    // OBJECTS ARE WAITING
                    //------------------------------------------------------------------------------------------------------

                    let waitingObjects = objectsWaitingForGeometryData[geometryId];

                    for (var objectId in waitingObjects) {

                        if (waitingObjects.hasOwnProperty(objectId)) {

                            let waitingObjectData = waitingObjects[objectId];

                            let meshColor = color;
                            let meshOpacity = color[3];

                            let ifcProps = performanceModelBuilder.objectDefaults[waitingObjectData.ifcType];
                            if (ifcProps) {
                                if (ifcProps.colorize) {
                                    meshColor = ifcProps.colorize;
                                    meshOpacity = ifcProps.colorize[3];
                                }
                                if (ifcProps.opacity !== null && ifcProps.opacity !== undefined) {
                                    meshOpacity = ifcProps.opacity;
                                }
                            }

                            const meshId = utils.createUUID();

                            performanceModelBuilder.createMeshInstancingGeometry(meshId, geometryId, waitingObjectData.matrix, meshColor, meshOpacity);
                            performanceModelBuilder.createEntity(objectId, meshId, waitingObjectData.ifcType);

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

                            let meshColor = color;
                            let meshOpacity = color[3];

                            let ifcProps = performanceModelBuilder.objectDefaults[waitingObjectData.ifcType];
                            if (ifcProps) {
                                if (ifcProps.colorize) {
                                    meshColor = ifcProps.colorize;
                                    meshOpacity = ifcProps.colorize[3];
                                }
                                if (ifcProps.opacity !== null && ifcProps.opacity !== undefined) {
                                    meshOpacity = ifcProps.opacity;
                                }
                            }


                            const meshId = utils.createUUID();

                            performanceModelBuilder.createMeshSpecifyingGeometry(meshId, positions, normals, indices, waitingObjectData.matrix, meshColor, meshOpacity);
                            performanceModelBuilder.createEntity(objectId, meshId, waitingObjectData.ifcType);
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
            var numColors = stream.readInt();

            if (false /* FIXME */ && numColors > 0) {
                colors = stream.readFloatArray(numColors);
                color[0] = colors[0];
                color[1] = colors[1];
                color[2] = colors[2];
                color[3] = colors[3];
            } else {
                color[0] = 1.0;
                color[1] = 1.0;
                color[2] = 1.0;
                color[3] = 1.0;
            }

            let meshColor = color;
            let meshOpacity = color[3];

            let ifcProps = performanceModelBuilder.objectDefaults[ifcType];
            if (ifcProps) {
                if (ifcProps.colorize) {
                    meshColor = ifcProps.colorize;
                    meshOpacity = ifcProps.colorize[3];
                }
                if (ifcProps.opacity !== null && ifcProps.opacity !== undefined) {
                    meshOpacity = ifcProps.opacity;
                }
            }

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
                // performanceModelBuilder.error("Not found", infoToOid, geometryInfoOid);
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

                performanceModelBuilder.createMeshSpecifyingGeometry(geometryId, positions, normals, indices, matrix, meshColor, meshOpacity);
                performanceModelBuilder.createEntity(objectId, geometryId, ifcType);

                delete singleUseGeometryLoaded[geometryId];

            } else if (multiUseGeometryLoaded[geometryId]) {

                //------------------------------------------------------------------------------------------------------
                // MULTI-USE GEOMETRY WAITING
                //------------------------------------------------------------------------------------------------------

                const meshId = utils.createUUID();

                performanceModelBuilder.createMeshInstancingGeometry(meshId, geometryId, matrix, meshColor, meshOpacity);
                performanceModelBuilder.createEntity(oid, meshId, ifcType);

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
        } else if (geometryType === 3) {
            var reused = stream.readInt();
            var type = stream.readUTF8();
            stream.align8();
            var hasTransparency = stream.readLong() == 1;
            var coreIds = [];
            var geometryDataOid = stream.readLong();
            var nrParts = stream.readInt();

            for (var i = 0; i < nrParts; i++) {
                var partId = stream.readLong();
                var coreId = geometryDataOid + "_" + i;
                coreIds.push(coreId);
                var nrIndices = stream.readInt();
                //o.stats.nrPrimitives += nrIndices / 3;
                var indices = stream.readShortArray(nrIndices);
                stream.align4();
                var b = stream.readIstream;
                var rgba;
                if (b === 1) {
                    rgba = {r: stream.readFloat(), g: stream.readFloat(), b: stream.readFloat(), a: stream.readFloat()};
                }
                stream.align4();
                var nrVertices = stream.readInt();
                //o.stats.nrVertices += nrVertices;
                var vertices = stream.readFloatArray(nrVertices);
                var nrNormals = stream.readInt();
                //o.stats.nrNormals += nrNormals;
                var normals = stream.readFloatArray(nrNormals);
                var nrColors = stream.readInt();
                //o.stats.nrColors += nrColors;
                var colors = stream.readFloatArray(nrColors);

                var geometry = {
                    type: "geometry",
                    //primitive: o.type
                };

                if (rgba) {
                    // Creating vertex colors here anyways (not transmitted over the line is a plus), should find a way to do this with scenejs without vertex-colors
                    geometry.colors = new Array(nrVertices * 4);
                    for (var j = 0; j < nrVertices; j++) {
                        geometry.colors[j * 4 + 0] = rgba.r;
                        geometry.colors[j * 4 + 1] = rgba.g;
                        geometry.colors[j * 4 + 2] = rgba.b;
                        geometry.colors[j * 4 + 3] = rgba.a;
                    }
                }

                geometry.coreId = coreId;

                /*if (o.type == "lines") {
                    geometry.indices = o.convertToLines(indices);
                } else {
                    geometry.indices = indices;
                }*/
                geometry.positions = vertices;
                geometry.normals = normals;

                if (colors != null && colors.length > 0) {
                    geometry.colors = colors;
                }
                //o.library.add("node", geometry);
            }
            stream.align8();
            //o.loadedGeometry[geometryDataOid] = coreIds;
            /*if (o.dataToInfo[geometryDataOid] != null) {
                o.dataToInfo[geometryDataOid].forEach(function(geometryInfoId){
                    var node = o.viewer.scene.findNode(geometryInfoId);
                    if (node != null && node.nodes[0] != null) {
                        coreIds.forEach(function(coreId){
                            node.nodes[0].addNode({
                                type: "geometry",
                                coreId: coreId
                            });
                        });
                    }
                });
                delete o.dataToInfo[geometryDataOid];
            }*/

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

export {BIMServerPerformanceGeometryLoader};