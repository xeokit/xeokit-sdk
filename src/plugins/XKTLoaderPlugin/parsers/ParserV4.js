/*

Parser for .XKT Format V4

.XKT specifications: https://github.com/xeokit/xeokit-sdk/wiki/XKT-Format

 */

import {utils} from "../../../viewer/scene/utils.js";
import * as p from "./lib/pako.js";

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
        decodeMatrices: elements[4],
        matrices: elements[5],
        eachPrimitivePositionsAndNormalsPortion: elements[6],
        eachPrimitiveIndicesPortion: elements[7],
        eachPrimitiveEdgeIndicesPortion: elements[8],
        eachPrimitiveDecodeMatricesPortion: elements[9],
        eachPrimitiveColor: elements[10],
        primitiveInstances: elements[11],
        eachEntityId: elements[12],
        eachEntityPrimitiveInstancesPortion: elements[13],
        eachEntityMatricesPortion: elements[14],
        eachEntityMatrix: elements[15]
    };
}

function inflate(deflatedData) {
    return {
        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),
        decodeMatrices: new Float32Array(pako.inflate(deflatedData.decodeMatrices).buffer),
        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitivePositionsAndNormalsPortion).buffer),
        eachPrimitiveIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveIndicesPortion).buffer),
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveEdgeIndicesPortion).buffer),
        eachPrimitiveDecodeMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveDecodeMatricesPortion).buffer),
        eachPrimitiveColor: new Uint8Array(pako.inflate(deflatedData.eachPrimitiveColor).buffer),
        primitiveInstances: new Uint32Array(pako.inflate(deflatedData.primitiveInstances).buffer),
        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityPrimitiveInstancesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityPrimitiveInstancesPortion).buffer),
        eachEntityMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityMatricesPortion).buffer)
    };
}

const decompressColor = (function () {
    const color2 = new Float32Array(3);
    return function (color) {
        color2[0] = color[0] / 255.0;
        color2[1] = color[1] / 255.0;
        color2[2] = color[2] / 255.0;
        return color2;
    };
})();

function load(viewer, options, inflatedData, performanceModel) {

    performanceModel.positionsCompression = "precompressed";
    performanceModel.normalsCompression = "precompressed";

    const positions = inflatedData.positions;
    const normals = inflatedData.normals;
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;
    const decodeMatrices = inflatedData.decodeMatrices;
    const matrices = inflatedData.matrices;

    const eachPrimitivePositionsAndNormalsPortion = inflatedData.eachPrimitivePositionsAndNormalsPortion;
    const eachPrimitiveIndicesPortion = inflatedData.eachPrimitiveIndicesPortion;
    const eachPrimitiveEdgeIndicesPortion = inflatedData.eachPrimitiveEdgeIndicesPortion;
    const eachPrimitiveDecodeMatricesPortion = inflatedData.eachPrimitiveDecodeMatricesPortion;
    const eachPrimitiveColor = inflatedData.eachPrimitiveColor;

    const primitiveInstances = inflatedData.primitiveInstances;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityPrimitiveInstancesPortion = inflatedData.eachEntityPrimitiveInstancesPortion;
    const eachEntityMatricesPortion = inflatedData.eachEntityMatricesPortion;

    const numPrimitives = eachPrimitivePositionsAndNormalsPortion.length;
    const numPrimitiveInstances = primitiveInstances.length;
    const primitiveInstanceCounts = new Uint8Array(numPrimitives); // For each mesh, how many times it is instanced
    const orderedPrimitiveIndexes = new Uint32Array(numPrimitives); // For each mesh, its index sorted into runs that share the same decode matrix

    const numEntities = eachEntityId.length;

    // Get lookup that orders primitives into runs that share the same decode matrices;
    // this is used to create meshes in batches that use the same decode matrix

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {
        orderedPrimitiveIndexes[primitiveIndex] = primitiveIndex;
    }

    orderedPrimitiveIndexes.sort((i1, i2) => {
        if (eachPrimitiveDecodeMatricesPortion[i1] < eachPrimitiveDecodeMatricesPortion[i2]) {
            return -1;
        }
        if (eachPrimitiveDecodeMatricesPortion[i1] > eachPrimitiveDecodeMatricesPortion[i2]) {
            return 1;
        }
        return 0;
    });

    // Count instances of each primitive

    for (let primitiveInstanceIndex = 0; primitiveInstanceIndex < numPrimitiveInstances; primitiveInstanceIndex++) {
        const primitiveIndex = primitiveInstances[primitiveInstanceIndex];
        primitiveInstanceCounts[primitiveIndex]++;
    }

    // Map batched primitives to the entities that will use them

    const batchedPrimitiveEntityIndexes = {};

    for (let entityIndex = 0; entityIndex < numEntities; entityIndex++) {

        const lastEntityIndex = (numEntities - 1);
        const atLastEntity = (entityIndex === lastEntityIndex);
        const firstEntityPrimitiveInstanceIndex = eachEntityPrimitiveInstancesPortion [entityIndex];
        const lastEntityPrimitiveInstanceIndex = atLastEntity ? eachEntityPrimitiveInstancesPortion[lastEntityIndex] : eachEntityPrimitiveInstancesPortion[entityIndex + 1];

        for (let primitiveInstancesIndex = firstEntityPrimitiveInstanceIndex; primitiveInstancesIndex < lastEntityPrimitiveInstanceIndex; primitiveInstancesIndex++) {

            const primitiveIndex = primitiveInstances[primitiveInstancesIndex];
            const primitiveInstanceCount = primitiveInstanceCounts[primitiveIndex];
            const isInstancedPrimitive = (primitiveInstanceCount > 1);

            if (!isInstancedPrimitive) {
                batchedPrimitiveEntityIndexes[primitiveIndex] = entityIndex;
            }
        }
    }

    var countGeometries = 0;

    // Create 1) geometries for instanced primitives, and 2) meshes for batched primitives.  We create all the
    // batched meshes now, before we create entities, because we're creating the batched meshes in runs that share
    // the same decode matrices. Each run of meshes with the same decode matrix will end up in the same
    // BatchingLayer; the PerformanceModel#createMesh() method starts a new BatchingLayer each time the decode
    // matrix has changed since the last invocation of that method, hence why we need to order batched meshes
    // in runs like this.

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {

        const orderedPrimitiveIndex = orderedPrimitiveIndexes[primitiveIndex];

        const atLastPrimitive = (orderedPrimitiveIndex === (numPrimitives - 1));

        const primitiveInstanceCount = primitiveInstanceCounts[orderedPrimitiveIndex];
        const isInstancedPrimitive = (primitiveInstanceCount > 1);

        const color = decompressColor(eachPrimitiveColor.subarray((orderedPrimitiveIndex * 4), (orderedPrimitiveIndex * 4) + 3));
        const opacity = eachPrimitiveColor[(orderedPrimitiveIndex * 4) + 3] / 255.0;

        const primitivePositions = positions.subarray(eachPrimitivePositionsAndNormalsPortion [orderedPrimitiveIndex], atLastPrimitive ? positions.length : eachPrimitivePositionsAndNormalsPortion [orderedPrimitiveIndex + 1]);
        const primitiveNormals = normals.subarray(eachPrimitivePositionsAndNormalsPortion [orderedPrimitiveIndex], atLastPrimitive ? normals.length : eachPrimitivePositionsAndNormalsPortion [orderedPrimitiveIndex + 1]);
        const primitiveIndices = indices.subarray(eachPrimitiveIndicesPortion [orderedPrimitiveIndex], atLastPrimitive ? indices.length : eachPrimitiveIndicesPortion [orderedPrimitiveIndex + 1]);
        const primitiveEdgeIndices = edgeIndices.subarray(eachPrimitiveEdgeIndicesPortion [orderedPrimitiveIndex], atLastPrimitive ? edgeIndices.length : eachPrimitiveEdgeIndicesPortion [orderedPrimitiveIndex + 1]);
        const primitiveDecodeMatrix = decodeMatrices.subarray(eachPrimitiveDecodeMatricesPortion [orderedPrimitiveIndex], eachPrimitiveDecodeMatricesPortion [orderedPrimitiveIndex] + 16);

        if (isInstancedPrimitive) {

            // Primitive instanced by more than one entity, and has positions in Model-space

            var geometryId = "geometry" + orderedPrimitiveIndex; // These IDs are local to the PerformanceModel

            performanceModel.createGeometry({
                id: geometryId,
                primitive: "triangles",
                positions: primitivePositions,
                normals: primitiveNormals,
                indices: primitiveIndices,
                edgeIndices: primitiveEdgeIndices,
                positionsDecodeMatrix: primitiveDecodeMatrix
            });

            countGeometries++;

        } else {

            // Primitive is used only by one entity, and has positions pre-transformed into World-space

            const meshId = orderedPrimitiveIndex; // These IDs are local to the PerformanceModel

            const entityIndex = batchedPrimitiveEntityIndexes[orderedPrimitiveIndex];
            const entityId = eachEntityId[entityIndex];

            const meshDefaults = {}; // TODO: get from lookup from entity IDs

            performanceModel.createMesh(utils.apply(meshDefaults, {
                id: meshId,
                primitive: "triangles",
                positions: primitivePositions,
                normals: primitiveNormals,
                indices: primitiveIndices,
                edgeIndices: primitiveEdgeIndices,
                positionsDecodeMatrix: primitiveDecodeMatrix,
                color: color,
                opacity: opacity
            }));
        }
    }

    let countInstances = 0;

    for (let entityIndex = 0; entityIndex < numEntities; entityIndex++) {

        const lastEntityIndex = (numEntities - 1);
        const atLastEntity = (entityIndex === lastEntityIndex);
        const entityId = eachEntityId[entityIndex];
        const firstEntityPrimitiveInstanceIndex = eachEntityPrimitiveInstancesPortion [entityIndex];
        const lastEntityPrimitiveInstanceIndex = atLastEntity ? eachEntityPrimitiveInstancesPortion[lastEntityIndex] : eachEntityPrimitiveInstancesPortion[entityIndex + 1];

        const meshIds = [];

        for (let primitiveInstancesIndex = firstEntityPrimitiveInstanceIndex; primitiveInstancesIndex < lastEntityPrimitiveInstanceIndex; primitiveInstancesIndex++) {

            const primitiveIndex = primitiveInstances[primitiveInstancesIndex];
            const primitiveInstanceCount = primitiveInstanceCounts[primitiveIndex];
            const isInstancedPrimitive = (primitiveInstanceCount > 1);

            if (isInstancedPrimitive) {

                const meshDefaults = {}; // TODO: get from lookup from entity IDs

                const meshId = "instance." + countInstances++;
                const geometryId = "geometry" + primitiveIndex;
                const matricesIndex = (eachEntityMatricesPortion [entityIndex]) * 16;
                const matrix = matrices.subarray(matricesIndex, matricesIndex + 16);

                performanceModel.createMesh(utils.apply(meshDefaults, {
                    id: meshId,
                    geometryId: geometryId,
                    matrix: matrix
                }));

                meshIds.push(meshId);

            } else {
                meshIds.push(primitiveIndex);
            }
        }

        if (meshIds.length > 0) {

            const entityDefaults = {}; // TODO: get from lookup from entity IDs

            performanceModel.createEntity(utils.apply(entityDefaults, {
                id: entityId,
                isObject: true, ///////////////// TODO: If metaobject exists
                meshIds: meshIds
            }));
        }
    }
}

/** @private */
const ParserV4 = {
    version: 4,
    parse: function (viewer, options, elements, performanceModel) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, performanceModel);
    }
};

export {ParserV4};