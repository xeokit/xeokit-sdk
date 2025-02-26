/*

 Parser for .XKT Format V8

 */

import {utils} from "../../../viewer/scene/utils.js";
import * as p from "./lib/pako.js";
import {math} from "../../../viewer/scene/math/math.js";
import {geometryCompressionUtils} from "../../../viewer/scene/math/geometryCompressionUtils.js";

let pako = window.pako || p;
if (!pako.inflate) {  // See https://github.com/nodeca/pako/issues/97
    pako = pako.default;
}

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();

function extract(elements) {

    return {

        // Vertex attributes

        types: elements[0],
        eachMetaObjectId: elements[1],
        eachMetaObjectType: elements[2],
        eachMetaObjectName: elements[3],
        eachMetaObjectParent: elements[4],

        positions: elements[5],
        normals: elements[6],
        colors: elements[7],
        indices: elements[8],
        edgeIndices: elements[9],

        // Transform matrices

        matrices: elements[10],
        reusedGeometriesDecodeMatrix: elements[11],

        // Geometries

        eachGeometryPrimitiveType: elements[12],
        eachGeometryPositionsPortion: elements[13],
        eachGeometryNormalsPortion: elements[14],
        eachGeometryColorsPortion: elements[15],
        eachGeometryIndicesPortion: elements[16],
        eachGeometryEdgeIndicesPortion: elements[17],

        // Meshes are grouped in runs that are shared by the same entities

        eachMeshGeometriesPortion: elements[18],
        eachMeshMatricesPortion: elements[19],
        eachMeshMaterial: elements[20],

        // Entity elements in the following arrays are grouped in runs that are shared by the same tiles

        eachEntityMetaObject: elements[21],
        eachEntityMeshesPortion: elements[22],

        eachTileAABB: elements[23],
        eachTileEntitiesPortion: elements[24]
    };
}

function inflate(deflatedData) {

    function inflate(array, options) {
        return (array.length === 0) ? [] : pako.inflate(array, options).buffer;
    }

    return {

        types: pako.inflate(deflatedData.types, {to: 'string'}),
        eachMetaObjectId: pako.inflate(deflatedData.eachMetaObjectId, {to: 'string'}),
        eachMetaObjectType: new Uint32Array(inflate(deflatedData.eachMetaObjectType)),
        eachMetaObjectName: pako.inflate(deflatedData.eachMetaObjectName, {to: 'string'}),
        eachMetaObjectParent: new Uint32Array(inflate(deflatedData.eachMetaObjectParent)),

        positions: new Uint16Array(inflate(deflatedData.positions)),
        normals: new Int8Array(inflate(deflatedData.normals)),
        colors: new Uint8Array(inflate(deflatedData.colors)),
        indices: new Uint32Array(inflate(deflatedData.indices)),
        edgeIndices: new Uint32Array(inflate(deflatedData.edgeIndices)),

        matrices: new Float32Array(inflate(deflatedData.matrices)),
        reusedGeometriesDecodeMatrix: new Float32Array(inflate(deflatedData.reusedGeometriesDecodeMatrix)),

        eachGeometryPrimitiveType: new Uint8Array(inflate(deflatedData.eachGeometryPrimitiveType)),
        eachGeometryPositionsPortion: new Uint32Array(inflate(deflatedData.eachGeometryPositionsPortion)),
        eachGeometryNormalsPortion: new Uint32Array(inflate(deflatedData.eachGeometryNormalsPortion)),
        eachGeometryColorsPortion: new Uint32Array(inflate(deflatedData.eachGeometryColorsPortion)),
        eachGeometryIndicesPortion: new Uint32Array(inflate(deflatedData.eachGeometryIndicesPortion)),
        eachGeometryEdgeIndicesPortion: new Uint32Array(inflate(deflatedData.eachGeometryEdgeIndicesPortion)),

        eachMeshGeometriesPortion: new Uint32Array(inflate(deflatedData.eachMeshGeometriesPortion)),
        eachMeshMatricesPortion: new Uint32Array(inflate(deflatedData.eachMeshMatricesPortion)),
        eachMeshMaterial: new Uint8Array(inflate(deflatedData.eachMeshMaterial)),

        eachEntityMetaObject: new Uint32Array(inflate(deflatedData.eachEntityMetaObject)),
        eachEntityMeshesPortion: new Uint32Array(inflate(deflatedData.eachEntityMeshesPortion)),

        eachTileAABB: new Float64Array(inflate(deflatedData.eachTileAABB)),
        eachTileEntitiesPortion: new Uint32Array(inflate(deflatedData.eachTileEntitiesPortion)),
    };
}

const decompressColor = (function () {
    const floatColor = new Float32Array(3);
    return function (intColor) {
        floatColor[0] = intColor[0] / 255.0;
        floatColor[1] = intColor[1] / 255.0;
        floatColor[2] = intColor[2] / 255.0;
        return floatColor;
    };
})();

function convertColorsRGBToRGBA(colorsRGB) {
    const colorsRGBA = [];
    for (let i = 0, len = colorsRGB.length; i < len; i += 3) {
        colorsRGBA.push(colorsRGB[i]);
        colorsRGBA.push(colorsRGB[i + 1]);
        colorsRGBA.push(colorsRGB[i + 2]);
        colorsRGBA.push(1.0);
    }
    return colorsRGBA;
}

function load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx) {

    const modelPartId = manifestCtx.getNextId();

    const types = JSON.parse(inflatedData.types);
    const eachMetaObjectId = JSON.parse(inflatedData.eachMetaObjectId);
    const eachMetaObjectType = inflatedData.eachMetaObjectType;
    const eachMetaObjectName = JSON.parse(inflatedData.eachMetaObjectName);
    const eachMetaObjectParent = inflatedData.eachMetaObjectParent;

    const positions = inflatedData.positions;
    const normals = inflatedData.normals;
    const colors = inflatedData.colors;
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;

    const matrices = inflatedData.matrices;
    const reusedGeometriesDecodeMatrix = inflatedData.reusedGeometriesDecodeMatrix;

    const eachGeometryPrimitiveType = inflatedData.eachGeometryPrimitiveType;
    const eachGeometryPositionsPortion = inflatedData.eachGeometryPositionsPortion;
    const eachGeometryNormalsPortion = inflatedData.eachGeometryNormalsPortion;
    const eachGeometryColorsPortion = inflatedData.eachGeometryColorsPortion;
    const eachGeometryIndicesPortion = inflatedData.eachGeometryIndicesPortion;
    const eachGeometryEdgeIndicesPortion = inflatedData.eachGeometryEdgeIndicesPortion;

    const eachMeshGeometriesPortion = inflatedData.eachMeshGeometriesPortion;
    const eachMeshMatricesPortion = inflatedData.eachMeshMatricesPortion;
    const eachMeshMaterial = inflatedData.eachMeshMaterial;

    const eachEntityMetaObject = inflatedData.eachEntityMetaObject;
    const eachEntityMeshesPortion = inflatedData.eachEntityMeshesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numMetaObjects = eachMetaObjectId.length;
    const numGeometries = eachGeometryPositionsPortion.length;
    const numMeshes = eachMeshGeometriesPortion.length;
    const numEntities = eachEntityMetaObject.length;
    const numTiles = eachTileEntitiesPortion.length;

    if (metaModel) {
        const metaModelData = {
            metaObjects: []
        };
        for (let metaObjectIndex = 0; metaObjectIndex < numMetaObjects; metaObjectIndex++) {
            const metaObjectId = eachMetaObjectId[metaObjectIndex];
            const typeIndex = eachMetaObjectType[metaObjectIndex];
            const metaObjectType = types[typeIndex] || "default";
            const metaObjectName = eachMetaObjectName[metaObjectIndex];
            const metaObjectParentIndex = eachMetaObjectParent[metaObjectIndex];
            const metaObjectParentId = (metaObjectParentIndex !== metaObjectIndex) ? eachMetaObjectId[metaObjectParentIndex] : null;
            metaModelData.metaObjects.push({
                id: metaObjectId,
                type: metaObjectType,
                name: metaObjectName,
                parent: metaObjectParentId
            });
        }
        metaModel.loadData(metaModelData, {
            includeTypes: options.includeTypes,
            excludeTypes: options.excludeTypes,
            globalizeObjectIds: options.globalizeObjectIds
        });
    }

    // Count instances of each geometry

    const geometryReuseCounts = new Uint32Array(numGeometries);

    for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
        const geometryIndex = eachMeshGeometriesPortion[meshIndex];
        if (geometryReuseCounts[geometryIndex] !== undefined) {
            geometryReuseCounts[geometryIndex]++;
        } else {
            geometryReuseCounts[geometryIndex] = 1;
        }
    }

    // Iterate over tiles

    const tileCenter = math.vec3();
    const rtcAABB = math.AABB3();

    const geometryArraysCache = {};

    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

        const lastTileIndex = (numTiles - 1);

        const atLastTile = (tileIndex === lastTileIndex);

        const firstTileEntityIndex = eachTileEntitiesPortion [tileIndex];
        const lastTileEntityIndex = atLastTile ? numEntities : eachTileEntitiesPortion[tileIndex + 1];

        const tileAABBIndex = tileIndex * 6;
        const tileAABB = eachTileAABB.subarray(tileAABBIndex, tileAABBIndex + 6);

        math.getAABB3Center(tileAABB, tileCenter);

        rtcAABB[0] = tileAABB[0] - tileCenter[0];
        rtcAABB[1] = tileAABB[1] - tileCenter[1];
        rtcAABB[2] = tileAABB[2] - tileCenter[2];
        rtcAABB[3] = tileAABB[3] - tileCenter[0];
        rtcAABB[4] = tileAABB[4] - tileCenter[1];
        rtcAABB[5] = tileAABB[5] - tileCenter[2];

        const tileDecodeMatrix = geometryCompressionUtils.createPositionsDecodeMatrix(rtcAABB);

        const geometryCreatedInTile = {};

        // Iterate over each tile's entities

        for (let tileEntityIndex = firstTileEntityIndex; tileEntityIndex < lastTileEntityIndex; tileEntityIndex++) {

            const xktMetaObjectIndex = eachEntityMetaObject[tileEntityIndex];
            const xktMetaObjectId = eachMetaObjectId[xktMetaObjectIndex];
            const xktEntityId = xktMetaObjectId;

            const entityId = options.globalizeObjectIds ? math.globalizeObjectId(sceneModel.id, xktEntityId) : xktEntityId;

            const lastTileEntityIndex = (numEntities - 1);
            const atLastTileEntity = (tileEntityIndex === lastTileEntityIndex);
            const firstMeshIndex = eachEntityMeshesPortion [tileEntityIndex];
            const lastMeshIndex = atLastTileEntity ? eachMeshGeometriesPortion.length : eachEntityMeshesPortion[tileEntityIndex + 1];

            const meshIds = [];

            const metaObject = viewer.metaScene.metaObjects[entityId];
            const entityDefaults = {};
            const meshDefaults = {};

            if (metaObject) {

                // Mask loading of object types

                if (options.excludeTypesMap && metaObject.type && options.excludeTypesMap[metaObject.type]) {
                    continue;
                }

                if (options.includeTypesMap && metaObject.type && (!options.includeTypesMap[metaObject.type])) {
                    continue;
                }

                // Mask loading of object ids

                if (options.includeIdsMap && metaObject.id && (!options.includeIdsMap[metaObject.id])) {
                    continue;
                }

                // Get initial property values for object types

                const props = options.objectDefaults ? options.objectDefaults[metaObject.type] || options.objectDefaults["DEFAULT"] : null;

                if (props) {
                    if (props.visible === false) {
                        entityDefaults.visible = false;
                    }
                    if (props.pickable === false) {
                        entityDefaults.pickable = false;
                    }
                    if (props.colorize) {
                        meshDefaults.color = props.colorize;
                    }
                    if (props.opacity !== undefined && props.opacity !== null) {
                        meshDefaults.opacity = props.opacity;
                    }
                    if (props.metallic !== undefined && props.metallic !== null) {
                        meshDefaults.metallic = props.metallic;
                    }
                    if (props.roughness !== undefined && props.roughness !== null) {
                        meshDefaults.roughness = props.roughness;
                    }
                }

            } else {
                if (options.excludeUnclassifiedObjects) {
                    continue;
                }
            }

            // Iterate each entity's meshes

            for (let meshIndex = firstMeshIndex; meshIndex < lastMeshIndex; meshIndex++) {

                const geometryIndex = eachMeshGeometriesPortion[meshIndex];
                const geometryReuseCount = geometryReuseCounts[geometryIndex];
                const isReusedGeometry = (geometryReuseCount > 1);

                const atLastGeometry = (geometryIndex === (numGeometries - 1));

                const meshColor = decompressColor(eachMeshMaterial.subarray((meshIndex * 6), (meshIndex * 6) + 3));
                const meshOpacity = eachMeshMaterial[(meshIndex * 6) + 3] / 255.0;
                const meshMetallic = eachMeshMaterial[(meshIndex * 6) + 4] / 255.0;
                const meshRoughness = eachMeshMaterial[(meshIndex * 6) + 5] / 255.0;

                const meshId = manifestCtx.getNextId();

                if (isReusedGeometry) {

                    // Create mesh for multi-use geometry - create (or reuse) geometry, create mesh using that geometry

                    const meshMatrixIndex = eachMeshMatricesPortion[meshIndex];
                    const meshMatrix = matrices.slice(meshMatrixIndex, meshMatrixIndex + 16);

                     const geometryId = `${modelPartId}-geometry.${tileIndex}.${geometryIndex}`; // These IDs are local to the SceneModel

                    let geometryArrays = geometryArraysCache[geometryId];

                    if (!geometryArrays) {

                        geometryArrays = {
                            batchThisMesh: (!options.reuseGeometries)
                        };

                        const primitiveType = eachGeometryPrimitiveType[geometryIndex];

                        let geometryValid = false;

                        switch (primitiveType) {
                            case 0:
                                geometryArrays.primitiveName = "solid";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryArrays.geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            case 1:
                                geometryArrays.primitiveName = "surface";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryArrays.geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            case 2:
                                geometryArrays.primitiveName = "points";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryColors = convertColorsRGBToRGBA(colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]));
                                geometryValid = (geometryArrays.geometryPositions.length > 0);
                                break;
                            case 3:
                                geometryArrays.primitiveName = "lines";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            default:
                                continue;
                        }

                        if (!geometryValid) {
                            geometryArrays = null;
                        }

                        if (geometryArrays) {
                            if (geometryReuseCount > 1000) { // TODO: Heuristic to force batching of instanced geometry beyond a certain reuse count (or budget)?
                                // geometryArrays.batchThisMesh = true;
                            }
                            if (geometryArrays.geometryPositions.length > 1000) { // TODO: Heuristic to force batching on instanced geometry above certain vertex size?
                                // geometryArrays.batchThisMesh = true;
                            }
                            if (geometryArrays.batchThisMesh) {
                                geometryArrays.decompressedPositions = new Float32Array(geometryArrays.geometryPositions.length);
                                const geometryPositions = geometryArrays.geometryPositions;
                                const decompressedPositions = geometryArrays.decompressedPositions;
                                for (let i = 0, len = geometryPositions.length; i < len; i += 3) {
                                    decompressedPositions[i + 0] = geometryPositions[i + 0] * reusedGeometriesDecodeMatrix[0] + reusedGeometriesDecodeMatrix[12];
                                    decompressedPositions[i + 1] = geometryPositions[i + 1] * reusedGeometriesDecodeMatrix[5] + reusedGeometriesDecodeMatrix[13];
                                    decompressedPositions[i + 2] = geometryPositions[i + 2] * reusedGeometriesDecodeMatrix[10] + reusedGeometriesDecodeMatrix[14];
                                }
                                geometryArrays.geometryPositions = null;
                                geometryArraysCache[geometryId] = geometryArrays;
                            }
                        }
                    }

                    if (geometryArrays) {

                        if (geometryArrays.batchThisMesh) {

                            const decompressedPositions = geometryArrays.decompressedPositions;
                            const positions = new Uint16Array(decompressedPositions.length);
                            for (let i = 0, len = decompressedPositions.length; i < len; i += 3) {
                                tempVec4a[0] = decompressedPositions[i + 0];
                                tempVec4a[1] = decompressedPositions[i + 1];
                                tempVec4a[2] = decompressedPositions[i + 2];
                                tempVec4a[3] = 1;
                                math.transformVec4(meshMatrix, tempVec4a, tempVec4b);
                                geometryCompressionUtils.compressPosition(tempVec4b, rtcAABB, tempVec4a)
                                positions[i + 0] = tempVec4a[0];
                                positions[i + 1] = tempVec4a[1];
                                positions[i + 2] = tempVec4a[2];
                            }

                            sceneModel.createMesh(utils.apply(meshDefaults, {
                                id: meshId,
                                origin: tileCenter,
                                primitive: geometryArrays.primitiveName,
                                positionsCompressed: positions,
                                normalsCompressed: geometryArrays.geometryNormals,
                                colorsCompressed: geometryArrays.geometryColors,
                                indices: geometryArrays.geometryIndices,
                                edgeIndices: geometryArrays.geometryEdgeIndices,
                                positionsDecodeMatrix: tileDecodeMatrix,
                                color: meshColor,
                                metallic: meshMetallic,
                                roughness: meshRoughness,
                                opacity: meshOpacity
                            }));

                            meshIds.push(meshId);

                        } else {

                            if (!geometryCreatedInTile[geometryId]) {

                                sceneModel.createGeometry({
                                    id: geometryId,
                                    primitive: geometryArrays.primitiveName,
                                    positionsCompressed: geometryArrays.geometryPositions,
                                    normalsCompressed: geometryArrays.geometryNormals,
                                    colorsCompressed: geometryArrays.geometryColors,
                                    indices: geometryArrays.geometryIndices,
                                    edgeIndices: geometryArrays.geometryEdgeIndices,
                                    positionsDecodeMatrix: reusedGeometriesDecodeMatrix
                                });

                                geometryCreatedInTile[geometryId] = true;
                            }

                            sceneModel.createMesh(utils.apply(meshDefaults, {
                                id: meshId,
                                geometryId: geometryId,
                                origin: tileCenter,
                                matrix: meshMatrix,
                                color: meshColor,
                                metallic: meshMetallic,
                                roughness: meshRoughness,
                                opacity: meshOpacity
                            }));

                            meshIds.push(meshId);
                        }
                    }

                } else {

                    const primitiveType = eachGeometryPrimitiveType[geometryIndex];

                    let primitiveName;
                    let geometryPositions;
                    let geometryNormals;
                    let geometryColors;
                    let geometryIndices;
                    let geometryEdgeIndices;
                    let geometryValid = false;

                    switch (primitiveType) {
                        case 0:
                            primitiveName = "solid";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        case 1:
                            primitiveName = "surface";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        case 2:
                            primitiveName = "points";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryColors = convertColorsRGBToRGBA(colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]));
                            geometryValid = (geometryPositions.length > 0);
                            break;
                        case 3:
                            primitiveName = "lines";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        default:
                            continue;
                    }

                    if (geometryValid) {

                        sceneModel.createMesh(utils.apply(meshDefaults, {
                            id: meshId,
                            origin: tileCenter,
                            primitive: primitiveName,
                            positionsCompressed: geometryPositions,
                            normalsCompressed: geometryNormals,
                            colorsCompressed: geometryColors,
                            indices: geometryIndices,
                            edgeIndices: geometryEdgeIndices,
                            positionsDecodeMatrix: tileDecodeMatrix,
                            color: meshColor,
                            metallic: meshMetallic,
                            roughness: meshRoughness,
                            opacity: meshOpacity
                        }));

                        meshIds.push(meshId);
                    }
                }
            }

            if (meshIds.length > 0) {

                sceneModel.createEntity(utils.apply(entityDefaults, {
                    id: entityId,
                    isObject: true,
                    meshIds: meshIds
                }));
            }
        }
    }
}

/** @private */
const ParserV8 = {
    version: 8,
    parse: function (viewer, options, elements, sceneModel, metaModel, manifestCtx) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx);
    }
};

export {ParserV8};