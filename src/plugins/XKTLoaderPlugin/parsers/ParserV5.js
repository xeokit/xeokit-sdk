/*

 Parser for .XKT Format V5

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
        matrices: elements[4],
        eachPrimitivePositionsAndNormalsPortion: elements[5],
        eachPrimitiveIndicesPortion: elements[6],
        eachPrimitiveEdgeIndicesPortion: elements[7],
        eachPrimitiveColor: elements[8],
        primitiveInstances: elements[9],
        eachEntityId: elements[10],
        eachEntityPrimitiveInstancesPortion: elements[11],
        eachEntityMatricesPortion: elements[12]
    };
}

function inflate(deflatedData) {
    return {
        positions: new Float32Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),
        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitivePositionsAndNormalsPortion).buffer),
        eachPrimitiveIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveIndicesPortion).buffer),
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveEdgeIndicesPortion).buffer),
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

    performanceModel.positionsCompression = "disabled"; // Positions in XKT V4 are floats, which we never quantize, for precision with big models
    performanceModel.normalsCompression = "precompressed"; // Normals are oct-encoded though

    const positions = inflatedData.positions;
    const normals = inflatedData.normals;
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;
    const matrices = inflatedData.matrices;

    const eachPrimitivePositionsAndNormalsPortion = inflatedData.eachPrimitivePositionsAndNormalsPortion;
    const eachPrimitiveIndicesPortion = inflatedData.eachPrimitiveIndicesPortion;
    const eachPrimitiveEdgeIndicesPortion = inflatedData.eachPrimitiveEdgeIndicesPortion;
    const eachPrimitiveColor = inflatedData.eachPrimitiveColor;

    const primitiveInstances = inflatedData.primitiveInstances;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityPrimitiveInstancesPortion = inflatedData.eachEntityPrimitiveInstancesPortion;
    const eachEntityMatricesPortion = inflatedData.eachEntityMatricesPortion;

    const numPrimitives = eachPrimitivePositionsAndNormalsPortion.length;
    const numPrimitiveInstances = primitiveInstances.length;
    const primitiveInstanceCounts = new Uint8Array(numPrimitives); // For each mesh, how many times it is instanced

    const numEntities = eachEntityId.length;

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

    // Create geometries for instanced primitives and meshes for batched primitives.

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {

        const atLastPrimitive = (primitiveIndex === (numPrimitives - 1));

        const primitiveInstanceCount = primitiveInstanceCounts[primitiveIndex];
        const isInstancedPrimitive = (primitiveInstanceCount > 1);

        const color = decompressColor(eachPrimitiveColor.subarray((primitiveIndex * 4), (primitiveIndex * 4) + 3));
        const opacity = eachPrimitiveColor[(primitiveIndex * 4) + 3] / 255.0;

        const primitivePositions = positions.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? positions.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
        const primitiveNormals = normals.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? normals.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
        const primitiveIndices = indices.subarray(eachPrimitiveIndicesPortion [primitiveIndex], atLastPrimitive ? indices.length : eachPrimitiveIndicesPortion [primitiveIndex + 1]);
        const primitiveEdgeIndices = edgeIndices.subarray(eachPrimitiveEdgeIndicesPortion [primitiveIndex], atLastPrimitive ? edgeIndices.length : eachPrimitiveEdgeIndicesPortion [primitiveIndex + 1]);

        if (isInstancedPrimitive) {

            // Primitive instanced by more than one entity, and has positions in Model-space

            var geometryId = "geometry" + primitiveIndex; // These IDs are local to the PerformanceModel

            performanceModel.createGeometry({
                id: geometryId,
                primitive: "triangles",
                positions: primitivePositions,
                normals: primitiveNormals,
                indices: primitiveIndices,
                edgeIndices: primitiveEdgeIndices
            });

            countGeometries++;

        } else {

            // Primitive is used only by one entity, and has positions pre-transformed into World-space

            const meshId = primitiveIndex; // These IDs are local to the PerformanceModel

            const entityIndex = batchedPrimitiveEntityIndexes[primitiveIndex];
            const entityId = eachEntityId[entityIndex];

            const meshDefaults = {}; // TODO: get from lookup from entity IDs

            performanceModel.createMesh(utils.apply(meshDefaults, {
                id: meshId,
                primitive: "triangles",
                positions: primitivePositions,
                normals: primitiveNormals,
                indices: primitiveIndices,
                edgeIndices: primitiveEdgeIndices,
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
const ParserV5 = {
    version: 5,
    parse: function (viewer, options, elements, performanceModel) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, performanceModel);
    }
};

export {ParserV5};