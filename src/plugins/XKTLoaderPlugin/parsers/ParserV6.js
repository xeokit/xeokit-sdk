/*

 Parser for .XKT Format V6

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
        positions: elements[0],
        normals: elements[1],
        indices: elements[2],
        edgeIndices: elements[3],
        matrices: elements[4],
        reusedPrimitivesDecodeMatrix: elements[5],
        eachPrimitivePositionsAndNormalsPortion: elements[6],
        eachPrimitiveIndicesPortion: elements[7],
        eachPrimitiveEdgeIndicesPortion: elements[8],
        eachPrimitiveColorAndOpacity: elements[9],
        primitiveInstances: elements[10],
        eachEntityId: elements[11],
        eachEntityPrimitiveInstancesPortion: elements[12],
        eachEntityMatricesPortion: elements[13],
        eachTileAABB: elements[14],
        eachTileEntitiesPortion: elements[15]
    };
}

function inflate(deflatedData) {

    return {
        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),
        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        reusedPrimitivesDecodeMatrix: new Float32Array(pako.inflate(deflatedData.reusedPrimitivesDecodeMatrix).buffer),
        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitivePositionsAndNormalsPortion).buffer),
        eachPrimitiveIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveIndicesPortion).buffer),
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveEdgeIndicesPortion).buffer),
        eachPrimitiveColorAndOpacity: new Uint8Array(pako.inflate(deflatedData.eachPrimitiveColorAndOpacity).buffer),
        primitiveInstances: new Uint32Array(pako.inflate(deflatedData.primitiveInstances).buffer),
        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityPrimitiveInstancesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityPrimitiveInstancesPortion).buffer),
        eachEntityMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityMatricesPortion).buffer),
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
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;

    const matrices = inflatedData.matrices;

    const reusedPrimitivesDecodeMatrix = inflatedData.reusedPrimitivesDecodeMatrix;

    const eachPrimitivePositionsAndNormalsPortion = inflatedData.eachPrimitivePositionsAndNormalsPortion;
    const eachPrimitiveIndicesPortion = inflatedData.eachPrimitiveIndicesPortion;
    const eachPrimitiveEdgeIndicesPortion = inflatedData.eachPrimitiveEdgeIndicesPortion;
    const eachPrimitiveColorAndOpacity = inflatedData.eachPrimitiveColorAndOpacity;

    const primitiveInstances = inflatedData.primitiveInstances;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityPrimitiveInstancesPortion = inflatedData.eachEntityPrimitiveInstancesPortion;
    const eachEntityMatricesPortion = inflatedData.eachEntityMatricesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numPrimitives = eachPrimitivePositionsAndNormalsPortion.length;
    const numPrimitiveInstances = primitiveInstances.length;
    const numEntities = eachEntityId.length;
    const numTiles = eachTileEntitiesPortion.length;

    let nextMeshId = 0;

    // Count instances of each primitive

    const primitiveReuseCounts = new Uint32Array(numPrimitives);

    for (let primitiveInstanceIndex = 0; primitiveInstanceIndex < numPrimitiveInstances; primitiveInstanceIndex++) {
        const primitiveIndex = primitiveInstances[primitiveInstanceIndex];
        if (primitiveReuseCounts[primitiveIndex] !== undefined) {
            primitiveReuseCounts[primitiveIndex]++;
        } else {
            primitiveReuseCounts[primitiveIndex] = 1;
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

            const entityId = eachEntityId[tileEntityIndex];

            const entityMatrixIndex = eachEntityMatricesPortion[tileEntityIndex];
            const entityMatrix = matrices.slice(entityMatrixIndex, entityMatrixIndex + 16);

            const lastTileEntityIndex = (numEntities - 1);
            const atLastTileEntity = (tileEntityIndex === lastTileEntityIndex);
            const firstPrimitiveInstanceIndex = eachEntityPrimitiveInstancesPortion [tileEntityIndex];
            const lastPrimitiveInstanceIndex = atLastTileEntity ? primitiveInstances.length : eachEntityPrimitiveInstancesPortion[tileEntityIndex + 1];

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

            // Iterate each entity's primitive instances

            for (let primitiveInstancesIndex = firstPrimitiveInstanceIndex; primitiveInstancesIndex < lastPrimitiveInstanceIndex; primitiveInstancesIndex++) {

                const primitiveIndex = primitiveInstances[primitiveInstancesIndex];
                const primitiveReuseCount = primitiveReuseCounts[primitiveIndex];
                const isReusedPrimitive = (primitiveReuseCount > 1);

                const atLastPrimitive = (primitiveIndex === (numPrimitives - 1));

                const primitivePositions = positions.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? positions.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
                const primitiveNormals = normals.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? normals.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
                const primitiveIndices = indices.subarray(eachPrimitiveIndicesPortion [primitiveIndex], atLastPrimitive ? indices.length : eachPrimitiveIndicesPortion [primitiveIndex + 1]);
                const primitiveEdgeIndices = edgeIndices.subarray(eachPrimitiveEdgeIndicesPortion [primitiveIndex], atLastPrimitive ? edgeIndices.length : eachPrimitiveEdgeIndicesPortion [primitiveIndex + 1]);

                const color = decompressColor(eachPrimitiveColorAndOpacity.subarray((primitiveIndex * 4), (primitiveIndex * 4) + 3));
                const opacity = eachPrimitiveColorAndOpacity[(primitiveIndex * 4) + 3] / 255.0;

                const meshId = nextMeshId++;

                if (isReusedPrimitive) {

                    // Create mesh for multi-use primitive - create (or reuse) geometry, create mesh using that geometry

                    const geometryId = "geometry." + tileIndex + "." + primitiveIndex; // These IDs are local to the PerformanceModel

                    if (!geometryCreated[geometryId]) {

                        performanceModel.createGeometry({
                            id: geometryId,
                            rtcCenter: tileCenter,
                            primitive: "triangles",
                            positions: primitivePositions,
                            normals: primitiveNormals,
                            indices: primitiveIndices,
                            edgeIndices: primitiveEdgeIndices,
                            positionsDecodeMatrix: reusedPrimitivesDecodeMatrix
                        });

                        geometryCreated[geometryId] = true;
                    }

                    performanceModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        geometryId: geometryId,
                        matrix: entityMatrix,
                        color: color,
                        opacity: opacity
                    }));

                    meshIds.push(meshId);

                } else {

                    performanceModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        rtcCenter: tileCenter,
                        primitive: "triangles",
                        positions: primitivePositions,
                        normals: primitiveNormals,
                        indices: primitiveIndices,
                        edgeIndices: primitiveEdgeIndices,
                        positionsDecodeMatrix: tileDecodeMatrix,
                        color: color,
                        opacity: opacity
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
const ParserV6 = {
    version: 6,
    parse: function (viewer, options, elements, performanceModel) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, performanceModel);
    }
};

export {ParserV6};