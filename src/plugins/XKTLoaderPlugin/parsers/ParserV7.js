/*

 Parser for .XKT Format V7

 */

import {utils} from "../../../viewer/scene/utils.js";
import * as p from "./lib/pako.js";
import {math} from "../../../viewer/scene/math/math.js";
import {geometryCompressionUtils} from "../../../viewer/scene/math/geometryCompressionUtils.js";

let pako = window.pako || p;
if (!pako.inflate) {  // See https://github.com/nodeca/pako/issues/97
    pako = pako.default;
}

function extract(elements) {

    return {

        // Vertex attributes

        positions: elements[0],
        normals: elements[1],
        colors: elements[2],

        // Indices

        indices: elements[3],
        edgeIndices: elements[4],

        // Transform matrices

        matrices: elements[5],

        reusedGeometriesDecodeMatrix: elements[6],

        // Geometries

        eachGeometryPrimitiveType: elements[7],
        eachGeometryPositionsPortion: elements[8],
        eachGeometryNormalsPortion: elements[9],
        eachGeometryColorsPortion: elements[10],
        eachGeometryIndicesPortion: elements[11],
        eachGeometryEdgeIndicesPortion: elements[12],

        // Meshes are grouped in runs that are shared by the same entities

        eachMeshGeometriesPortion: elements[13],
        eachMeshMatricesPortion: elements[14],
        eachMeshColorAndOpacity: elements[15],

        // Entity elements in the following arrays are grouped in runs that are shared by the same tiles

        eachEntityId: elements[16],
        eachEntityMeshesPortion: elements[17],

        eachTileAABB: elements[18],
        eachTileEntitiesPortion: elements[19]
    };
}

function inflate(deflatedData) {

    return {
        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        colors: new Uint8Array(pako.inflate(deflatedData.colors).buffer),

        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),

        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),

        reusedGeometriesDecodeMatrix: new Float32Array(pako.inflate(deflatedData.reusedGeometriesDecodeMatrix).buffer),

        eachGeometryPrimitiveType: new Uint8Array(pako.inflate(deflatedData.eachGeometryPrimitiveType).buffer),
        eachGeometryPositionsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryPositionsPortion).buffer),
        eachGeometryNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryNormalsPortion).buffer),
        eachGeometryColorsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryColorsPortion).buffer),
        eachGeometryIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryIndicesPortion).buffer),
        eachGeometryEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryEdgeIndicesPortion).buffer),

        eachMeshGeometriesPortion: new Uint32Array(pako.inflate(deflatedData.eachMeshGeometriesPortion).buffer),
        eachMeshMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachMeshMatricesPortion).buffer),
        eachMeshColorAndOpacity: new Uint8Array(pako.inflate(deflatedData.eachMeshColorAndOpacity).buffer),

        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityMeshesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityMeshesPortion).buffer),

        eachTileAABB: new Float64Array(pako.inflate(deflatedData.eachTileAABB).buffer),
        eachTileEntitiesPortion: new Uint32Array(pako.inflate(deflatedData.eachTileEntitiesPortion).buffer),
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

function load(viewer, options, inflatedData, performanceModel) {

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
    const eachMeshColorAndOpacity = inflatedData.eachMeshColorAndOpacity;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityMeshesPortion = inflatedData.eachEntityMeshesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numGeometries = eachGeometryPositionsPortion.length;
    const numMeshes = eachMeshGeometriesPortion.length;
    const numEntities = eachEntityId.length;
    const numTiles = eachTileEntitiesPortion.length;

    let nextMeshId = 0;

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

        const geometryCreated = {};

        // Iterate over each tile's entities

        for (let tileEntityIndex = firstTileEntityIndex; tileEntityIndex < lastTileEntityIndex; tileEntityIndex++) {

            const xktEntityId = eachEntityId[tileEntityIndex];
            const entityId = options.globalizeObjectIds ? math.globalizeObjectId(performanceModel.id, xktEntityId) : xktEntityId;

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

                const meshColor = decompressColor(eachMeshColorAndOpacity.subarray((meshIndex * 4), (meshIndex * 4) + 3));
                const meshOpacity = eachMeshColorAndOpacity[(meshIndex * 4) + 3] / 255.0;

                const meshId = nextMeshId++;

                if (isReusedGeometry) {

                    // Create mesh for multi-use geometry - create (or reuse) geometry, create mesh using that geometry

                    const meshMatrixIndex = eachMeshMatricesPortion[meshIndex];
                    const meshMatrix = matrices.slice(meshMatrixIndex, meshMatrixIndex + 16);

                    const geometryId = "geometry." + tileIndex + "." + geometryIndex; // These IDs are local to the PerformanceModel

                    if (!geometryCreated[geometryId]) {

                        const primitiveType = eachGeometryPrimitiveType[geometryIndex];

                        let primitiveName;
                        let geometryPositions;
                        let geometryNormals;
                        let geometryColors;
                        let geometryIndices;
                        let geometryEdgeIndices;

                        switch (primitiveType) {
                            case 0: // Solid
                                primitiveName = "triangles";
                                geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                                geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                break;
                            case 1: // Surface
                                primitiveName = "triangles";
                                geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                                geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                break;
                            case 2:
                                primitiveName = "points";
                                geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryColors = colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]);
                                break;
                            case 3:
                                primitiveName = "lines";
                                geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                break;
                            default:
                                continue;
                        }

                        performanceModel.createGeometry({
                            id: geometryId,
                            rtcCenter: tileCenter,
                            primitive: primitiveName,
                            positions: geometryPositions,
                            normals: geometryNormals,
                            colors: geometryColors,
                            indices: geometryIndices,
                            edgeIndices: geometryEdgeIndices,
                            positionsDecodeMatrix: reusedGeometriesDecodeMatrix
                        });

                        geometryCreated[geometryId] = true;
                    }

                    performanceModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        geometryId: geometryId,
                        matrix: meshMatrix,
                        color: meshColor,
                        opacity: meshOpacity
                    }));

                    meshIds.push(meshId);

                } else {

                    const primitiveType = eachGeometryPrimitiveType[geometryIndex];

                    let primitiveName;
                    let geometryPositions;
                    let geometryNormals;
                    let geometryColors;
                    let geometryIndices;
                    let geometryEdgeIndices;

                    switch (primitiveType) {
                        case 0: // Solid
                            primitiveName = "triangles";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            break;
                        case 1: // Surface
                            primitiveName = "triangles";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            break;
                        case 2:
                            primitiveName = "points";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryColors = colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]);
                            break;
                        case 3:
                            primitiveName = "lines";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            break;
                        default:
                            continue;
                    }

                    performanceModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        rtcCenter: tileCenter,
                        primitive: primitiveName,
                        positions: geometryPositions,
                        normals: geometryNormals,
                        colors: geometryColors,
                        indices: geometryIndices,
                        edgeIndices: geometryEdgeIndices,
                        positionsDecodeMatrix: tileDecodeMatrix,
                        color: meshColor,
                        opacity: meshOpacity
                    }));

                    meshIds.push(meshId);
                }
            }

            if (meshIds.length > 0) {

                performanceModel.createEntity(utils.apply(entityDefaults, {
                    id: entityId,
                    isObject: true,
                    meshIds: meshIds
                }));
            }
        }
    }
}

/** @private */
const ParserV7 = {
    version: 7,
    parse: function (viewer, options, elements, performanceModel) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, performanceModel);
    }
};

export {ParserV7};