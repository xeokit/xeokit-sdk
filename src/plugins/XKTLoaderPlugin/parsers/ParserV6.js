/*

 Parser for .XKT Format V6

 */

import {utils} from "../../../viewer/scene/utils.js";
import pako from 'pako/dist/pako.esm.mjs';
import {math} from "../../../viewer/scene/math/math.js";
import {geometryCompressionUtils} from "../../../viewer/scene/math/geometryCompressionUtils.js";

// let pako = window.pako || p;
// if (!pako.inflate) {  // See https://github.com/nodeca/pako/issues/97
//    pako = pako.default;
// }

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

    function inflate(array, options) {
        return (array.length === 0) ? [] : pako.inflate(array, options).buffer;
    }

    return {
        positions: new Uint16Array(inflate(deflatedData.positions)),
        normals: new Int8Array(inflate(deflatedData.normals)),
        indices: new Uint32Array(inflate(deflatedData.indices)),
        edgeIndices: new Uint32Array(inflate(deflatedData.edgeIndices)),
        matrices: new Float32Array(inflate(deflatedData.matrices)),
        reusedPrimitivesDecodeMatrix: new Float32Array(inflate(deflatedData.reusedPrimitivesDecodeMatrix)),
        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(inflate(deflatedData.eachPrimitivePositionsAndNormalsPortion)),
        eachPrimitiveIndicesPortion: new Uint32Array(inflate(deflatedData.eachPrimitiveIndicesPortion)),
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(inflate(deflatedData.eachPrimitiveEdgeIndicesPortion)),
        eachPrimitiveColorAndOpacity: new Uint8Array(inflate(deflatedData.eachPrimitiveColorAndOpacity)),
        primitiveInstances: new Uint32Array(inflate(deflatedData.primitiveInstances)),
        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityPrimitiveInstancesPortion: new Uint32Array(inflate(deflatedData.eachEntityPrimitiveInstancesPortion)),
        eachEntityMatricesPortion: new Uint32Array(inflate(deflatedData.eachEntityMatricesPortion)),
        eachTileAABB: new Float64Array(inflate(deflatedData.eachTileAABB)),
        eachTileEntitiesPortion: new Uint32Array(inflate(deflatedData.eachTileEntitiesPortion))
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

function load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx) {

    const modelPartId = manifestCtx.getNextId();

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

            const xktEntityId = eachEntityId[tileEntityIndex];
            const entityId = options.globalizeObjectIds ? math.globalizeObjectId(sceneModel.id, xktEntityId) : xktEntityId;

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

                const meshId = manifestCtx.getNextId();

                if (isReusedPrimitive) {

                    // Create mesh for multi-use primitive - create (or reuse) geometry, create mesh using that geometry

                    const geometryId = `${modelPartId}-geometry.${tileIndex}.${primitiveIndex}`; // These IDs are local to the SceneModel

                    if (!geometryCreated[geometryId]) {

                        sceneModel.createGeometry({
                            id: geometryId,
                            primitive: "triangles",
                            positionsCompressed: primitivePositions,
                         //   normalsCompressed: primitiveNormals,
                            indices: primitiveIndices,
                            edgeIndices: primitiveEdgeIndices,
                            positionsDecodeMatrix: reusedPrimitivesDecodeMatrix
                        });

                        geometryCreated[geometryId] = true;
                    }

                    sceneModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        geometryId: geometryId,
                        origin: tileCenter,
                        matrix: entityMatrix,
                        color: color,
                        opacity: opacity
                    }));

                    meshIds.push(meshId);

                } else {

                    sceneModel.createMesh(utils.apply(meshDefaults, {
                        id: meshId,
                        origin: tileCenter,
                        primitive: "triangles",
                        positionsCompressed: primitivePositions,
                        normalsCompressed: primitiveNormals,
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
const ParserV6 = {
    version: 6,
    parse: function (viewer, options, elements, sceneModel, metaModel, manifestCtx) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx);
    }
};

export {ParserV6};