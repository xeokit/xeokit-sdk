/*

Parser for .XKT Format V3

.XKT specifications: https://github.com/xeokit/xeokit-sdk/wiki/XKT-Format

 */

import {utils} from "../../../viewer/scene/utils.js";
import * as p from "./lib/pako.js";
import {math} from "../../../viewer/scene/math/math.js";

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
        meshPositions: elements[4],
        meshIndices: elements[5],
        meshEdgesIndices: elements[6],
        meshColors: elements[7],
        entityIDs: elements[8],
        entityMeshes: elements[9],
        entityIsObjects: elements[10],
        instancedPositionsDecodeMatrix: elements[11],
        batchedPositionsDecodeMatrix: elements[12],
        entityMeshIds: elements[13],
        entityMatrices: elements[14],
        entityUsesInstancing: elements[15]
    };
}

function inflate(deflatedData) {
    return {
        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),
        meshPositions: new Uint32Array(pako.inflate(deflatedData.meshPositions).buffer),
        meshIndices: new Uint32Array(pako.inflate(deflatedData.meshIndices).buffer),
        meshEdgesIndices: new Uint32Array(pako.inflate(deflatedData.meshEdgesIndices).buffer),
        meshColors: new Uint8Array(pako.inflate(deflatedData.meshColors).buffer),
        entityIDs: pako.inflate(deflatedData.entityIDs, {to: 'string'}),
        entityMeshes: new Uint32Array(pako.inflate(deflatedData.entityMeshes).buffer),
        entityIsObjects: new Uint8Array(pako.inflate(deflatedData.entityIsObjects).buffer),
        instancedPositionsDecodeMatrix: new Float32Array(pako.inflate(deflatedData.instancedPositionsDecodeMatrix).buffer),
        batchedPositionsDecodeMatrix: new Float32Array(pako.inflate(deflatedData.batchedPositionsDecodeMatrix).buffer),
        entityMeshIds: new Uint32Array(pako.inflate(deflatedData.entityMeshIds).buffer),
        entityMatrices: new Float32Array(pako.inflate(deflatedData.entityMatrices).buffer),
        entityUsesInstancing: new Uint8Array(pako.inflate(deflatedData.entityUsesInstancing).buffer)
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
    const meshPositions = inflatedData.meshPositions;
    const meshIndices = inflatedData.meshIndices;
    const meshEdgesIndices = inflatedData.meshEdgesIndices;
    const meshColors = inflatedData.meshColors;
    const entityIDs = JSON.parse(inflatedData.entityIDs);
    const entityMeshes = inflatedData.entityMeshes;
    const entityIsObjects = inflatedData.entityIsObjects;
    const entityMeshIds = inflatedData.entityMeshIds;
    const entityMatrices = inflatedData.entityMatrices;
    const entityUsesInstancing = inflatedData.entityUsesInstancing;

    const numMeshes = meshPositions.length;
    const numEntities = entityMeshes.length;

    const _alreadyCreatedGeometries = {};

    for (let i = 0; i < numEntities; i++) {

        const xktEntityId = entityIDs [i];
        const entityId = options.globalizeObjectIds ? math.globalizeObjectId(performanceModel.id, xktEntityId) : xktEntityId;
        const metaObject = viewer.metaScene.metaObjects[entityId];
        const entityDefaults = {};
        const meshDefaults = {};
        const entityMatrix = entityMatrices.subarray((i * 16), (i * 16) + 16);

        if (metaObject) {

            if (options.excludeTypesMap && metaObject.type && options.excludeTypesMap[metaObject.type]) {
                continue;
            }

            if (options.includeTypesMap && metaObject.type && (!options.includeTypesMap[metaObject.type])) {
                continue;
            }

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

        const lastEntity = (i === numEntities - 1);

        const meshIds = [];

        for (let j = entityMeshes [i], jlen = lastEntity ? entityMeshIds.length : entityMeshes [i + 1]; j < jlen; j++) {
            var jj = entityMeshIds [j];

            const lastMesh = (jj === (numMeshes - 1));
            const meshId = entityId + ".mesh." + jj;

            const color = decompressColor(meshColors.subarray((jj * 4), (jj * 4) + 3));
            const opacity = meshColors[(jj * 4) + 3] / 255.0;

            var tmpPositions = positions.subarray(meshPositions [jj], lastMesh ? positions.length : meshPositions [jj + 1]);
            var tmpNormals = normals.subarray(meshPositions [jj], lastMesh ? positions.length : meshPositions [jj + 1]);
            var tmpIndices = indices.subarray(meshIndices [jj], lastMesh ? indices.length : meshIndices [jj + 1]);
            var tmpEdgeIndices = edgeIndices.subarray(meshEdgesIndices [jj], lastMesh ? edgeIndices.length : meshEdgesIndices [jj + 1]);

            if (entityUsesInstancing [i] === 1) {
                var geometryId = "geometry." + jj;

                if (!(geometryId in _alreadyCreatedGeometries)) {

                    performanceModel.createGeometry({
                        id: geometryId,
                        positions: tmpPositions,
                        normals: tmpNormals,
                        indices: tmpIndices,
                        edgeIndices: tmpEdgeIndices,
                        primitive: "triangles",
                        positionsDecodeMatrix: inflatedData.instancedPositionsDecodeMatrix
                    });

                    _alreadyCreatedGeometries [geometryId] = true;
                }

                performanceModel.createMesh(utils.apply(meshDefaults, {
                    id: meshId,
                    color: color,
                    opacity: opacity,
                    matrix: entityMatrix,
                    geometryId: geometryId,
                }));

                meshIds.push(meshId);

            } else {

                performanceModel.createMesh(utils.apply(meshDefaults, {
                    id: meshId,
                    primitive: "triangles",
                    positions: tmpPositions,
                    normals: tmpNormals,
                    indices: tmpIndices,
                    edgeIndices: tmpEdgeIndices,
                    positionsDecodeMatrix: inflatedData.batchedPositionsDecodeMatrix,
                    color: color,
                    opacity: opacity
                }));

                meshIds.push(meshId);
            }
        }

        if (meshIds.length) {
            performanceModel.createEntity(utils.apply(entityDefaults, {
                id: entityId,
                isObject: (entityIsObjects [i] === 1),
                meshIds: meshIds
            }));
        }
    }
}

/** @private */
const ParserV3 = {
    version: 3,
    parse: function (viewer, options, elements, performanceModel) {
        const deflatedData = extract(elements);
        const inflatedData = inflate(deflatedData);
        load(viewer, options, inflatedData, performanceModel);
    }
};

export {ParserV3};