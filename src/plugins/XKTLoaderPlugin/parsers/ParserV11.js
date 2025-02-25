/*
 Parser for .XKT Format V11
*/

import {utils} from "../../../viewer/scene/utils.js";
import {math} from "../../../viewer/scene/math/math.js";
import {geometryCompressionUtils} from "../../../viewer/scene/math/geometryCompressionUtils.js";
import {JPEGMediaType, PNGMediaType} from "../../../viewer/scene/constants/constants.js";

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();

const NUM_TEXTURE_ATTRIBUTES = 9;

function decodeData(arrayBuffer) {
    const requiresSwapFromLittleEndian = (function() {
        const buffer = new ArrayBuffer(2);
        new Uint16Array(buffer)[0] = 1;
        return new Uint8Array(buffer)[0] !== 1;
    })();

    const nextArray = (function() {
        let i = 0;
        const dataView = new DataView(arrayBuffer);
        return function(type) {
            const idx = 1 + 2 * i++; // `1' for the version nr
            const byteOffset = dataView.getUint32(idx       * 4, true);
            const byteLength = dataView.getUint32((idx + 1) * 4, true);

            const BPE = type.BYTES_PER_ELEMENT;
            if (requiresSwapFromLittleEndian && (BPE > 1)) {
                const subarray = new Uint8Array(arrayBuffer, byteOffset, byteLength);
                const swaps = BPE / 2;
                const cnt = subarray.length / BPE;
                for (let b = 0; b < cnt; b++) {
                    const offset = b * BPE;
                    for (let j = 0; j < swaps; j++) {
                        const i1 = offset + j;
                        const i2 = offset - j + BPE - 1;
                        const tmp = subarray[i1];
                        subarray[i1] = subarray[i2];
                        subarray[i2] = tmp;
                    }
                }
            }

            return new type(arrayBuffer, byteOffset, byteLength / BPE);
        };
    })();

    const nextObject = (function() {
        const decoder = new TextDecoder();
        return () => JSON.parse(decoder.decode(nextArray(Uint8Array)));
    })();

    return {
        metadata:                       nextObject(),
        textureData:                    nextArray(Uint8Array),  // <<----------------------------- ??? ZIPPing to blame?
        eachTextureDataPortion:         nextArray(Uint32Array),
        eachTextureAttributes:          nextArray(Uint16Array),
        positions:                      nextArray(Uint16Array),
        normals:                        nextArray(Int8Array),
        colors:                         nextArray(Uint8Array),
        uvs:                            nextArray(Float32Array),
        indices:                        nextArray(Uint32Array),
        edgeIndices:                    nextArray(Uint32Array),
        eachTextureSetTextures:         nextArray(Int32Array),
        matrices:                       nextArray(Float32Array),
        reusedGeometriesDecodeMatrix:   nextArray(Float32Array),
        eachGeometryPrimitiveType:      nextArray(Uint8Array),
        eachGeometryPositionsPortion:   nextArray(Uint32Array),
        eachGeometryNormalsPortion:     nextArray(Uint32Array),
        eachGeometryColorsPortion:      nextArray(Uint32Array),
        eachGeometryUVsPortion:         nextArray(Uint32Array),
        eachGeometryIndicesPortion:     nextArray(Uint32Array),
        eachGeometryEdgeIndicesPortion: nextArray(Uint32Array),
        eachMeshGeometriesPortion:      nextArray(Uint32Array),
        eachMeshMatricesPortion:        nextArray(Uint32Array),
        eachMeshTextureSet:             nextArray(Int32Array), // Can be -1
        eachMeshMaterialAttributes:     nextArray(Uint8Array),
        eachEntityId:                   nextObject(),
        eachEntityMeshesPortion:        nextArray(Uint32Array),
        eachTileAABB:                   nextArray(Float64Array),
        eachTileEntitiesPortion:        nextArray(Uint32Array),
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

const imagDataToImage = (function () {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    return function (imagedata) {
        canvas.width = imagedata.width;
        canvas.height = imagedata.height;
        context.putImageData(imagedata, 0, 0);
        return canvas.toDataURL();
    };
})();

function load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx) {

    const modelPartId = manifestCtx.getNextId();

    const metadata = inflatedData.metadata;
    const textureData = inflatedData.textureData;
    const eachTextureDataPortion = inflatedData.eachTextureDataPortion;
    const eachTextureAttributes = inflatedData.eachTextureAttributes;
    const positions = inflatedData.positions;
    const normals = inflatedData.normals;
    const colors = inflatedData.colors;
    const uvs = inflatedData.uvs;
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;
    const eachTextureSetTextures = inflatedData.eachTextureSetTextures;
    const matrices = inflatedData.matrices;
    const reusedGeometriesDecodeMatrix = inflatedData.reusedGeometriesDecodeMatrix;
    const eachGeometryPrimitiveType = inflatedData.eachGeometryPrimitiveType;
    const eachGeometryPositionsPortion = inflatedData.eachGeometryPositionsPortion;
    const eachGeometryNormalsPortion = inflatedData.eachGeometryNormalsPortion;
    const eachGeometryColorsPortion = inflatedData.eachGeometryColorsPortion;
    const eachGeometryUVsPortion = inflatedData.eachGeometryUVsPortion;
    const eachGeometryIndicesPortion = inflatedData.eachGeometryIndicesPortion;
    const eachGeometryEdgeIndicesPortion = inflatedData.eachGeometryEdgeIndicesPortion;
    const eachMeshGeometriesPortion = inflatedData.eachMeshGeometriesPortion;
    const eachMeshMatricesPortion = inflatedData.eachMeshMatricesPortion;
    const eachMeshTextureSet = inflatedData.eachMeshTextureSet;
    const eachMeshMaterialAttributes = inflatedData.eachMeshMaterialAttributes;
    const eachEntityId = inflatedData.eachEntityId;
    const eachEntityMeshesPortion = inflatedData.eachEntityMeshesPortion;
    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numTextures = eachTextureDataPortion.length;
    const numTextureSets = eachTextureSetTextures.length / 5;
    const numGeometries = eachGeometryPositionsPortion.length;
    const numMeshes = eachMeshGeometriesPortion.length;
    const numEntities = eachEntityMeshesPortion.length;
    const numTiles = eachTileEntitiesPortion.length;

    if (metaModel) {
        metaModel.loadData(metadata, {
            includeTypes: options.includeTypes,
            excludeTypes: options.excludeTypes,
            globalizeObjectIds: options.globalizeObjectIds
        }); // Can be empty
    }

    // Create textures

    for (let textureIndex = 0; textureIndex < numTextures; textureIndex++) {
        const atLastTexture = (textureIndex === (numTextures - 1));
        const textureDataPortionStart = eachTextureDataPortion[textureIndex];
        const textureDataPortionEnd = atLastTexture ? textureData.length : (eachTextureDataPortion[textureIndex + 1]);

        const textureDataPortionSize = textureDataPortionEnd - textureDataPortionStart;
        const textureDataPortionExists = (textureDataPortionSize > 0);

        const textureAttrBaseIdx = (textureIndex * NUM_TEXTURE_ATTRIBUTES);

        const compressed = (eachTextureAttributes[textureAttrBaseIdx + 0] === 1);
        const mediaType = eachTextureAttributes[textureAttrBaseIdx + 1];
        const width = eachTextureAttributes[textureAttrBaseIdx + 2];
        const height = eachTextureAttributes[textureAttrBaseIdx + 3];
        const minFilter = eachTextureAttributes[textureAttrBaseIdx + 4];
        const magFilter = eachTextureAttributes[textureAttrBaseIdx + 5]; // LinearFilter | NearestFilter
        const wrapS = eachTextureAttributes[textureAttrBaseIdx + 6]; // ClampToEdgeWrapping | MirroredRepeatWrapping | RepeatWrapping
        const wrapT = eachTextureAttributes[textureAttrBaseIdx + 7]; // ClampToEdgeWrapping | MirroredRepeatWrapping | RepeatWrapping
        const wrapR = eachTextureAttributes[textureAttrBaseIdx + 8]; // ClampToEdgeWrapping | MirroredRepeatWrapping | RepeatWrapping

        if (textureDataPortionExists) {

            const imageDataSubarray = new Uint8Array(textureData.subarray(textureDataPortionStart, textureDataPortionEnd));
            const arrayBuffer = imageDataSubarray.buffer;
            const textureId = `${modelPartId}-texture-${textureIndex}`;

            if (compressed) {

                sceneModel.createTexture({
                    id: textureId,
                    buffers: [arrayBuffer],
                    minFilter,
                    magFilter,
                    wrapS,
                    wrapT,
                    wrapR
                });

            } else {

                const mimeType = mediaType === JPEGMediaType ? "image/jpeg" : (mediaType === PNGMediaType ? "image/png" : "image/gif");
                const blob = new Blob([arrayBuffer], {type: mimeType});
                const urlCreator = window.URL || window.webkitURL;
                const imageUrl = urlCreator.createObjectURL(blob);
                const img = document.createElement('img');
                img.src = imageUrl;

                sceneModel.createTexture({
                    id: textureId,
                    image: img,
                    //mediaType,
                    minFilter,
                    magFilter,
                    wrapS,
                    wrapT,
                    wrapR
                });
            }
        }
    }

    // Create texture sets

    for (let textureSetIndex = 0; textureSetIndex < numTextureSets; textureSetIndex++) {
        const eachTextureSetTexturesIndex = textureSetIndex * 5;
        const textureSetId = `${modelPartId}-textureSet-${textureSetIndex}`;
        const colorTextureIndex = eachTextureSetTextures[eachTextureSetTexturesIndex + 0];
        const metallicRoughnessTextureIndex = eachTextureSetTextures[eachTextureSetTexturesIndex + 1];
        const normalsTextureIndex = eachTextureSetTextures[eachTextureSetTexturesIndex + 2];
        const emissiveTextureIndex = eachTextureSetTextures[eachTextureSetTexturesIndex + 3];
        const occlusionTextureIndex = eachTextureSetTextures[eachTextureSetTexturesIndex + 4];
        sceneModel.createTextureSet({
            id: textureSetId,
            colorTextureId: colorTextureIndex >= 0 ? `${modelPartId}-texture-${colorTextureIndex}` : null,
            normalsTextureId: normalsTextureIndex >= 0 ? `${modelPartId}-texture-${normalsTextureIndex}` : null,
            metallicRoughnessTextureId: metallicRoughnessTextureIndex >= 0 ? `${modelPartId}-texture-${metallicRoughnessTextureIndex}` : null,
            emissiveTextureId: emissiveTextureIndex >= 0 ? `${modelPartId}-texture-${emissiveTextureIndex}` : null,
            occlusionTextureId: occlusionTextureIndex >= 0 ? `${modelPartId}-texture-${occlusionTextureIndex}` : null
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
        const lastTileEntityIndex = atLastTile ? (numEntities - 1) : (eachTileEntitiesPortion[tileIndex + 1] - 1);

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

        for (let tileEntityIndex = firstTileEntityIndex; tileEntityIndex <= lastTileEntityIndex; tileEntityIndex++) {

            const xktEntityId = eachEntityId[tileEntityIndex];

            const entityId = options.globalizeObjectIds ? math.globalizeObjectId(sceneModel.id, xktEntityId) : xktEntityId;

            const finalTileEntityIndex = (numEntities - 1);
            const atLastTileEntity = (tileEntityIndex === finalTileEntityIndex);
            const firstMeshIndex = eachEntityMeshesPortion [tileEntityIndex];
            const lastMeshIndex = atLastTileEntity ? (eachMeshGeometriesPortion.length - 1) : (eachEntityMeshesPortion[tileEntityIndex + 1] - 1);

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

            for (let meshIndex = firstMeshIndex; meshIndex <= lastMeshIndex; meshIndex++) {

                const geometryIndex = eachMeshGeometriesPortion[meshIndex];
                const geometryReuseCount = geometryReuseCounts[geometryIndex];
                const isReusedGeometry = (geometryReuseCount > 1);

                const atLastGeometry = (geometryIndex === (numGeometries - 1));

                const textureSetIndex = eachMeshTextureSet[meshIndex];

                const textureSetId = (textureSetIndex >= 0) ? `${modelPartId}-textureSet-${textureSetIndex}` : null;

                const meshColor = decompressColor(eachMeshMaterialAttributes.subarray((meshIndex * 6), (meshIndex * 6) + 3));
                const meshOpacity = eachMeshMaterialAttributes[(meshIndex * 6) + 3] / 255.0;
                const meshMetallic = eachMeshMaterialAttributes[(meshIndex * 6) + 4] / 255.0;
                const meshRoughness = eachMeshMaterialAttributes[(meshIndex * 6) + 5] / 255.0;

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
                                geometryArrays.geometryUVs = uvs.subarray(eachGeometryUVsPortion [geometryIndex], atLastGeometry ? uvs.length : eachGeometryUVsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryArrays.geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            case 1:
                                geometryArrays.primitiveName = "surface";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                                geometryArrays.geometryUVs = uvs.subarray(eachGeometryUVsPortion [geometryIndex], atLastGeometry ? uvs.length : eachGeometryUVsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryArrays.geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            case 2:
                                geometryArrays.primitiveName = "points";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryColors = colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0);
                                break;
                            case 3:
                                geometryArrays.primitiveName = "lines";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                                geometryValid = (geometryArrays.geometryPositions.length > 0 && geometryArrays.geometryIndices.length > 0);
                                break;
                            case 4:
                                geometryArrays.primitiveName = "lines";
                                geometryArrays.geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                                geometryArrays.geometryIndices = lineStripToLines(
                                    geometryArrays.geometryPositions,
                                    indices.subarray(eachGeometryIndicesPortion [geometryIndex],
                                        atLastGeometry
                                            ? indices.length
                                            : eachGeometryIndicesPortion [geometryIndex + 1]));
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
                                geometryArrays.transformedAndRecompressedPositions = new Uint16Array(geometryArrays.geometryPositions.length)
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
                            const transformedAndRecompressedPositions = geometryArrays.transformedAndRecompressedPositions;

                            for (let i = 0, len = decompressedPositions.length; i < len; i += 3) {
                                tempVec4a[0] = decompressedPositions[i + 0];
                                tempVec4a[1] = decompressedPositions[i + 1];
                                tempVec4a[2] = decompressedPositions[i + 2];
                                tempVec4a[3] = 1;
                                math.transformVec4(meshMatrix, tempVec4a, tempVec4b);
                                geometryCompressionUtils.compressPosition(tempVec4b, rtcAABB, tempVec4a)
                                transformedAndRecompressedPositions[i + 0] = tempVec4a[0];
                                transformedAndRecompressedPositions[i + 1] = tempVec4a[1];
                                transformedAndRecompressedPositions[i + 2] = tempVec4a[2];
                            }

                            sceneModel.createMesh(utils.apply(meshDefaults, {
                                id: meshId,
                                textureSetId,
                                origin: tileCenter,
                                primitive: geometryArrays.primitiveName,
                                positionsCompressed: transformedAndRecompressedPositions,
                                normalsCompressed: geometryArrays.geometryNormals,
                                uv: geometryArrays.geometryUVs,
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
                                    uv: geometryArrays.geometryUVs,
                                    colorsCompressed: geometryArrays.geometryColors,
                                    indices: geometryArrays.geometryIndices,
                                    edgeIndices: geometryArrays.geometryEdgeIndices,
                                    positionsDecodeMatrix: reusedGeometriesDecodeMatrix
                                });

                                geometryCreatedInTile[geometryId] = true;
                            }

                            sceneModel.createMesh(utils.apply(meshDefaults, {
                                id: meshId,
                                geometryId,
                                textureSetId,
                                matrix: meshMatrix,
                                color: meshColor,
                                metallic: meshMetallic,
                                roughness: meshRoughness,
                                opacity: meshOpacity,
                                origin: tileCenter
                            }));

                            meshIds.push(meshId);
                        }
                    }

                } else { // Do not reuse geometry

                    const primitiveType = eachGeometryPrimitiveType[geometryIndex];

                    let primitiveName;
                    let geometryPositions;
                    let geometryNormals;
                    let geometryUVs;
                    let geometryColors;
                    let geometryIndices;
                    let geometryEdgeIndices;
                    let geometryValid = false;

                    switch (primitiveType) {
                        case 0:
                            primitiveName = "solid";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryUVs = uvs.subarray(eachGeometryUVsPortion [geometryIndex], atLastGeometry ? uvs.length : eachGeometryUVsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        case 1:
                            primitiveName = "surface";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                            geometryUVs = uvs.subarray(eachGeometryUVsPortion [geometryIndex], atLastGeometry ? uvs.length : eachGeometryUVsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        case 2:
                            primitiveName = "points";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryColors = colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0);
                            break;
                        case 3:
                            primitiveName = "lines";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        case 4:
                            primitiveName = "lines";
                            geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                            geometryIndices = lineStripToLines(
                                geometryPositions,
                                indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry
                                    ? indices.length
                                    : eachGeometryIndicesPortion [geometryIndex + 1]));
                            geometryValid = (geometryPositions.length > 0 && geometryIndices.length > 0);
                            break;
                        default:
                            continue;
                    }

                    if (geometryValid) {

                        sceneModel.createMesh(utils.apply(meshDefaults, {
                            id: meshId,
                            textureSetId,
                            origin: tileCenter,
                            primitive: primitiveName,
                            positionsCompressed: geometryPositions,
                            normalsCompressed: geometryNormals,
                            uv: geometryUVs && geometryUVs.length > 0 ? geometryUVs : null,
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

function lineStripToLines(positions, indices) {
    const linesIndices = [];
    if (indices.length > 1) {
        for (let i = 0, len = indices.length - 1; i < len; i++) {
            linesIndices.push(indices[i]);
            linesIndices.push(indices[i + 1]);
        }
    } else if (positions.length > 1) {
        for (let i = 0, len = (positions.length / 3) - 1; i < len; i++) {
            linesIndices.push(i);
            linesIndices.push(i + 1);
        }
    }
    return linesIndices;
}

/** @private */
// V11 uses a single uncompressed Uint8Array buffer to store arrays of different types.
// To efficiently create typed arrays from this buffer,
// each typed array's source data needs to be aligned with its element byte size.
// This sometimes requires padding subarrays inside the single Uint8Array, so the byteOffset needs to be stored alongside element count.
// It is a different encoding than used in earlier versions, and requires different approach to parsing elements.
const ParserV11 = {
    version: 11,
    parseArrayBuffer: function (viewer, options, arrayBuffer, sceneModel, metaModel, manifestCtx) {
        const inflatedData = decodeData(arrayBuffer);
        load(viewer, options, inflatedData, sceneModel, metaModel, manifestCtx);
    }
};

export {ParserV11};
