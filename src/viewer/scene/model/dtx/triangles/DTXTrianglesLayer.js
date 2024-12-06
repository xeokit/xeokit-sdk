import {ENTITY_FLAGS} from "../../ENTITY_FLAGS.js";
import {makeDTXRenderingAttributes} from "./DTXTrianglesDrawable.js";
import {getRenderers, Layer} from "../../layer/Layer.js";

import {math} from "../../../math/math.js";
import {Configs} from "../../../../Configs.js";

const dataTextureRamStats = {
    sizeDataColorsAndFlags: 0,
    sizeDataInstancesMatrices: 0,
    sizeDataPositionDecodeMatrices: 0,
    sizeDataTextureOffsets: 0,
    sizeDataTexturePositions: 0,
    sizeDataTextureIndices: 0,
    sizeDataTextureEdgeIndices: 0,
    sizeDataTexturePortionIds: 0,
    numberOfGeometries: 0,
    numberOfPortions: 0,
    numberOfLayers: 0,
    numberOfTextures: 0,
    totalPolygons: 0,
    totalPolygons8Bits: 0,
    totalPolygons16Bits: 0,
    totalPolygons32Bits: 0,
    totalEdges: 0,
    totalEdges8Bits: 0,
    totalEdges16Bits: 0,
    totalEdges32Bits: 0,
    cannotCreatePortion: {
        because10BitsObjectId: 0,
        becauseTextureSize: 0,
    },
    overheadSizeAlignementIndices: 0,
    overheadSizeAlignementEdgeIndices: 0,
};

window.printDataTextureRamStats = function () {

    console.log(JSON.stringify(dataTextureRamStats, null, 4));

    let totalRamSize = 0;

    Object.keys(dataTextureRamStats).forEach(key => {
        if (key.startsWith("size")) {
            totalRamSize += dataTextureRamStats[key];
        }
    });

    console.log(`Total size ${totalRamSize} bytes (${(totalRamSize / 1000 / 1000).toFixed(2)} MB)`);
    console.log(`Avg bytes / triangle: ${(totalRamSize / dataTextureRamStats.totalPolygons).toFixed(2)}`);

    let percentualRamStats = {};

    Object.keys(dataTextureRamStats).forEach(key => {
        if (key.startsWith("size")) {
            percentualRamStats[key] =
                `${(dataTextureRamStats[key] / totalRamSize * 100).toFixed(2)} % of total`;
        }
    });

    console.log(JSON.stringify({percentualRamUsage: percentualRamStats}, null, 4));
};

const configs = new Configs();

/**
 * 12-bits allowed for object ids.
 * Limits the per-object texture height in the layer.
 */
const MAX_NUMBER_OF_OBJECTS_IN_LAYER = (1 << 16);

/**
 * 4096 is max data texture height.
 * Limits the aggregated geometry texture height in the layer.
 */
const MAX_DATA_TEXTURE_HEIGHT = configs.maxDataTextureHeight;

/**
 * Align `indices` and `edgeIndices` memory layout to 8 elements.
 *
 * Used as an optimization for the `...portionIds...` texture, so it
 * can just be stored 1 out of 8 `portionIds` corresponding to a given
 * `triangle-index` or `edge-index`.
 */
const INDICES_EDGE_INDICES_ALIGNEMENT_SIZE = 8;

/**
 * Number of maximum allowed per-object flags update per render frame
 * before switching to batch update mode.
 */
const MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE = 10;

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();
const tempMat4a = new Float32Array(16);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXTrianglesLayer extends Layer {

    constructor(model, primitive, origin) {

        super(model, primitive, origin);

        dataTextureRamStats.numberOfLayers++;

        this._sortId = `TriDTX-${dataTextureRamStats.numberOfLayers}`;

        const gl = model.scene.canvas.gl;

        const geometryData = (indicesStatsProp, edgesStatsProp) => {
            const indicesBuffer = [ ];
            let lenIndices = 0;
            const perTriangleNumberPortionId = [ ];
            let numIndices = 0;

            const edgeIndicesBuffer = [ ];
            let lenEdgeIndices = 0;
            const perEdgeNumberPortionId = [ ];
            let numEdgeIndices = 0;

            return {
                len: () => numIndices,

                accumulateIndices: (indices, edgeIndices) => {
                    const buffer = this._buffer;

                    const accIndicesSubPortion = (indices && (indices.length > 0)) && (function() {
                        const indicesBase = lenIndices / 3;
                        lenIndices += indices.length;
                        indicesBuffer.push(indices);
                        const numTriangles = indices.length / 3;
                        return (subPortionId) => {
                            const currentNumIndices = numIndices;
                            numIndices += numTriangles * 3;
                            buffer.perObjectIndexBaseOffsets.push(currentNumIndices / 3 - indicesBase);
                            for (let i = 0; i < numTriangles; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                                perTriangleNumberPortionId.push(subPortionId);
                            }
                            dataTextureRamStats[indicesStatsProp] += numTriangles;
                            dataTextureRamStats.totalPolygons += numTriangles;
                        };
                    })();

                    const accEdgesSubPortion = edgeIndices && (function() {
                        const edgeIndicesBase = lenEdgeIndices / 2;
                        lenEdgeIndices += edgeIndices.length;
                        edgeIndicesBuffer.push(edgeIndices);
                        const numEdges = edgeIndices.length / 2;
                        return subPortionId => {
                            const currentNumEdgeIndices = numEdgeIndices;
                            numEdgeIndices += numEdges * 2;
                            buffer.perObjectEdgeIndexBaseOffsets.push(currentNumEdgeIndices / 2 - edgeIndicesBase);
                            for (let i = 0; i < numEdges; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                                perEdgeNumberPortionId.push(subPortionId);
                            }
                            dataTextureRamStats[edgesStatsProp] += numEdges;
                            dataTextureRamStats.totalEdges += numEdges;
                        };
                    })();

                    dataTextureRamStats.numberOfGeometries++;

                    return {
                        numTriangles: indices ? (indices.length / 3) : 0,
                        accumulateSubPortionId: subPortionId => {
                            accIndicesSubPortion && accIndicesSubPortion(subPortionId);
                            accEdgesSubPortion   && accEdgesSubPortion(subPortionId);
                        }
                    };
                },

                createDrawers: (createTextureForSingleItems, indicesType) => {
                    const createTextureForPackedPortionIds = function(portionIdsArray, defaultIfEmpty) {
                        return (portionIdsArray.length > 0) ? createTextureForSingleItems([ portionIdsArray ], portionIdsArray.length, 1, gl.UNSIGNED_SHORT, "sizeDataTexturePortionIds") : defaultIfEmpty;
                    };

                    // Texture that holds the PortionId that corresponds to a given polygon-id.
                    const portionIdsTexture = createTextureForPackedPortionIds(perTriangleNumberPortionId, { texture: null });

                    // Texture that holds the unique-vertex-indices.
                    const indicesTexture = (lenIndices > 0) && createTextureForSingleItems(indicesBuffer, lenIndices, 3, indicesType, "sizeDataTextureIndices");

                    // Texture that holds the PortionId that corresponds to a given edge-id.
                    const portionEdgeIdsTexture = createTextureForPackedPortionIds(perEdgeNumberPortionId);

                    // Texture that holds the unique-vertex-indices for 8-bit based edge indices.
                    const edgeIndicesTexture = (lenEdgeIndices > 0) && createTextureForSingleItems(edgeIndicesBuffer, lenEdgeIndices, 2, indicesType, "sizeDataTextureEdgeIndices");

                    return {
                        indices: function(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode) {
                            if (numIndices > 0) {
                                uTexPerPrimitiveIdPortionIds(portionIdsTexture, 5); // webgl texture unit
                                uTexPerPrimitiveIdIndices(   indicesTexture,    6); // webgl texture unit
                                gl.drawArrays(glMode, 0, numIndices);
                            }
                        },
                        edges: function(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode) {
                            if (numEdgeIndices > 0) {
                                uTexPerPrimitiveIdPortionIds(portionEdgeIdsTexture, 5); // webgl texture unit
                                uTexPerPrimitiveIdIndices(   edgeIndicesTexture,    6); // webgl texture unit
                                gl.drawArrays(glMode, 0, numEdgeIndices);
                            }
                        }
                    };
                }
            };
        };

        this._buffer = {
            positionsCompressed: [],
            lenPositionsCompressed: 0,

            geometry8Bits:  geometryData("totalPolygons8Bits",  "totalEdges8Bits"),
            geometry16Bits: geometryData("totalPolygons16Bits", "totalEdges16Bits"),
            geometry32Bits: geometryData("totalPolygons32Bits", "totalEdges32Bits"),

            perObjectColors: [],
            perObjectPickColors: [],
            perObjectSolid: [],
            perObjectPositionsDecodeMatrices: [],
            perObjectInstancePositioningMatrices: [],
            perObjectVertexBases: [],
            perObjectIndexBaseOffsets: [],
            perObjectEdgeIndexBaseOffsets: []
        };

        this._numVertices = 0;

        this._portions = []; // These counts are used to avoid unnecessary render passes

        this._subPortionReadableGeometries = this.model.scene.readableGeometryEnabled && {};

        /**
         * Due to `index rebucketting` process in ```prepareMeshGeometry``` function, it's possible that a single
         * portion is expanded to more than 1 real sub-portion.
         *
         * This Array tracks the mapping between:
         *
         * - external `portionIds` as seen by consumers of this class.
         * - internal `sub-portionIds` actually managed by this class.
         *
         * The outer index of this array is the externally seen `portionId`.
         * The inner value of the array, are `sub-portionIds` corresponding to the `portionId`.
         */
        this._portionToSubPortionsMap = [];

        this._bucketGeometries = {};

        /**
         * The number of updates in the current frame;
         */
        this._numUpdatesInFrame = 0;

        /**
         * The type of primitives in this layer.
         */
        this.primitive = primitive;

        this._finalized = false;
    }

    /**
     * Returns whether the ```TrianglesDataTextureLayer``` has room for more portions.
     *
     * @param {object} portionCfg An object containing the geometrical data (`positions`, `indices`, `edgeIndices`) for the portion.
     * @returns {Boolean} Wheter the requested portion can be created
     */
    canCreatePortion(portionCfg) {
        if (this._finalized) {
            throw "Already finalized";
        }
        const numNewPortions = portionCfg.buckets.length;
        if ((this._portions.length + numNewPortions) > MAX_NUMBER_OF_OBJECTS_IN_LAYER) {
            dataTextureRamStats.cannotCreatePortion.because10BitsObjectId++;
        }
        let retVal = (this._portions.length + numNewPortions) <= MAX_NUMBER_OF_OBJECTS_IN_LAYER;
        const bucketIndex = 0; // TODO: Is this a bug?
        const bucketGeometryId = portionCfg.geometryId !== undefined && portionCfg.geometryId !== null
            ? `${portionCfg.geometryId}#${bucketIndex}`
            : `${portionCfg.id}#${bucketIndex}`;
        const alreadyHasPortionGeometry = this._bucketGeometries[bucketGeometryId];
        if (!alreadyHasPortionGeometry) {
            const buffer = this._buffer;
            const maxIndicesOfAnyBits = Math.max(buffer.geometry8Bits.len(), buffer.geometry16Bits.len(), buffer.geometry32Bits.len());
            let numVertices = 0;
            let numIndices = 0;
            portionCfg.buckets.forEach(bucket => {
                numVertices += bucket.positionsCompressed.length / 3;
                numIndices += bucket.indices.length / 3;
            });
            if ((this._numVertices + numVertices) > MAX_DATA_TEXTURE_HEIGHT * 4096 ||
                (maxIndicesOfAnyBits + numIndices) > MAX_DATA_TEXTURE_HEIGHT * 4096) {
                dataTextureRamStats.cannotCreatePortion.becauseTextureSize++;
            }
            retVal &&=
                (this._numVertices + numVertices) <= MAX_DATA_TEXTURE_HEIGHT * 4096 &&
                (maxIndicesOfAnyBits + numIndices) <= MAX_DATA_TEXTURE_HEIGHT * 4096;
        }
        return retVal;
    }

    /**
     * Creates a new portion within this TrianglesDataTextureLayer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param portionCfg.positionsCompressed Flat float Local-space positionsCompressed array.
     * @param [portionCfg.normals] Flat float normals array.
     * @param [portionCfg.colors] Flat float colors array.
     * @param portionCfg.indices  Flat int indices array.
     * @param [portionCfg.edgeIndices] Flat int edges indices array.
     * @param portionCfg.color Quantized RGB color [0..255,0..255,0..255,0..255]
     * @param portionCfg.opacity Opacity [0..255]
     * @param [portionCfg.meshMatrix] Flat float 4x4 matrix - transforms the portion within the coordinate system that's local to the SceneModel
     * @param portionCfg.worldAABB Flat float AABB World-space AABB
     * @param portionCfg.pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion(mesh, portionCfg) {
        if (this._finalized) {
            throw "Already finalized";
        }
        const buffer = this._buffer;
        //   const portionAABB = portionCfg.worldAABB;
        const subPortionIds = portionCfg.buckets.map((bucket, bucketIndex) => {
            const bucketGeometryId = (portionCfg.geometryId ?? portionCfg.id) + "#" + bucketIndex;
            //  const subPortionAABB = math.collapseAABB3(tempAABB3b);
            if (! (bucketGeometryId in this._bucketGeometries)) {
                const aligned = (indices, elementSize, statsProp) => {
                    // Indices and EdgeIndices alignement
                    // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
                    // array items for storing the triangles and edges of the mesh, and it supports:
                    // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
                    // - in exchange for a small RAM overhead
                    //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)
                    if (indices) {
                        const alignedLen = Math.ceil((indices.length / elementSize) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * elementSize;
                        const alignedArray = new Uint32Array(alignedLen);
                        alignedArray.set(indices);
                        dataTextureRamStats[statsProp] += 2 * (alignedArray.length - indices.length);
                        return alignedArray;
                    } else {
                        return indices;
                    }
                };

                bucket.indices     = aligned(bucket.indices,     3, "overheadSizeAlignementIndices");
                bucket.edgeIndices = aligned(bucket.edgeIndices, 2, "overheadSizeAlignementEdgeIndices");

                const positionsCompressed = bucket.positionsCompressed;
                buffer.positionsCompressed.push(positionsCompressed);
                const numVertices = positionsCompressed.length / 3;
                this._numVertices += numVertices;
                const vertexBase = buffer.lenPositionsCompressed / 3;
                buffer.lenPositionsCompressed += positionsCompressed.length;

                this._bucketGeometries[bucketGeometryId] = {
                    vertexBase: vertexBase,
                    geometryData: (function() {
                        const indices = bucket.indices;
                        const edgeIndices = bucket.edgeIndices;
                        if (numVertices <= (1 << 8)) {
                            return buffer.geometry8Bits.accumulateIndices( indices, edgeIndices);
                        } else if (numVertices <= (1 << 16)) {
                            return buffer.geometry16Bits.accumulateIndices(indices, edgeIndices);
                        } else {
                            return buffer.geometry32Bits.accumulateIndices(indices, edgeIndices);
                        }
                    })()
                };
            }

            //math.expandAABB3(portionAABB, subPortionAABB);
            const bucketGeometry = this._bucketGeometries[bucketGeometryId];
            buffer.perObjectPositionsDecodeMatrices.push(portionCfg.positionsDecodeMatrix);
            buffer.perObjectInstancePositioningMatrices.push(portionCfg.meshMatrix || DEFAULT_MATRIX);
            buffer.perObjectSolid.push(!!portionCfg.solid);
            buffer.perObjectPickColors.push(portionCfg.pickColor);
            buffer.perObjectVertexBases.push(bucketGeometry.vertexBase);

            const colors = portionCfg.colors;
            const color = portionCfg.color; // Color is pre-quantized by SceneModel
            buffer.perObjectColors.push(colors
                                        ? [ colors[0] * 255, colors[1] * 255, colors[2] * 255, 255 ]
                                        : [ color[0],        color[1],        color[2],        portionCfg.opacity ]);

            const subPortionId = this._portions.length;
            this._portions.push({ });
            bucketGeometry.geometryData.accumulateSubPortionId(subPortionId);

            if (this._subPortionReadableGeometries) {
                this._subPortionReadableGeometries[subPortionId] = {
                    indices: bucket.indices,
                    positionsCompressed: bucket.positionsCompressed,
                    positionsDecodeMatrix: portionCfg.positionsDecodeMatrix
                };
            }

            dataTextureRamStats.numberOfPortions++;

            return subPortionId;
        });
        const portionId = this._portionToSubPortionsMap.length;
        this._portionToSubPortionsMap.push(subPortionIds);
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    /**
     * Builds data textures from the appended geometries and loads them into the GPU.
     *
     * No more portions can then be created.
     */
    compilePortions() {
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;

        /*
         * Texture that holds colors/pickColors/flags/flags2 per-object:
         * - columns: one concept per column => color / pick-color / ...
         * - row: the object Id
         * The texture will have:
         * - 4 RGBA columns per row: for each object (pick) color and flags(2)
         * - N rows where N is the number of objects
         */
        const numPortions = this._portions.length;

        const populateTexArray = texArray => {
            const pack32as4x8 = ui32 => [
                (ui32 >> 24) & 255,
                (ui32 >> 16) & 255,
                (ui32 >>  8) & 255,
                (ui32)       & 255
            ];
            for (let i = 0; i < numPortions; i++) {
                // 8 columns per texture row:
                texArray.set(buffer.perObjectColors[i],                            i * 32 +  0); // (RGBA)
                texArray.set(buffer.perObjectPickColors[i],                        i * 32 +  4); // (packed Uint32 as RGBA)
                texArray.set([0, 0, 0, 0], /* flags */                             i * 32 +  8); // (packed 4 bytes as RGBA)
                texArray.set([0, 0, 0, 0], /* flags2 */                            i * 32 + 12); // (packed 4 bytes as RGBA)
                texArray.set(pack32as4x8(buffer.perObjectVertexBases[i]),          i * 32 + 16); // (packed Uint32 bytes as RGBA)
                texArray.set(pack32as4x8(buffer.perObjectIndexBaseOffsets[i]),     i * 32 + 20); // (packed Uint32 bytes as RGBA)
                texArray.set(pack32as4x8(buffer.perObjectEdgeIndexBaseOffsets[i]), i * 32 + 24); // (packed Uint32 bytes as RGBA)
                texArray.set([buffer.perObjectSolid[i] ? 1 : 0, 0, 0, 0],          i * 32 + 28); // (packed 4 bytes as RGBA)
            }
        };

        // The number of rows in the texture is the number of objects in the layer.
        const texturePerObjectColorsAndFlags = createBindableDataTexture(gl, numPortions, 32, gl.UNSIGNED_BYTE, 512, populateTexArray, "sizeDataColorsAndFlags", true);
        this._texturePerObjectColorsAndFlagsData = texturePerObjectColorsAndFlags.textureData;

        const createDataTexture = function(dataArrays, entitiesCnt, entitySize, type, entitiesPerRow, statsProp, exposeData) {
            const populateTexArray = texArray => {
                for (let i = 0, j = 0, len = dataArrays.length; i < len; i++) {
                    const pc = dataArrays[i];
                    texArray.set(pc, j);
                    j += pc.length;
                }
            };
            return createBindableDataTexture(gl, entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData);
        };

        const createTextureForMatrices = function(matrices, statsProp, exposeData) {
            const numMatrices = matrices.length;
            if (numMatrices === 0) {
                throw "num " + statsProp + " matrices===0";
            }
            // in one row we can fit 512 matrices
            return createDataTexture(matrices, numMatrices, 16, gl.FLOAT, 512, statsProp, exposeData);
        };

        /**
         * This will generate a texture for all positions decode matrices in the layer.
         * The texture will have:
         * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
         *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
         * - N rows where N is the number of objects
         */
        const texturePerObjectInstanceMatrices = createTextureForMatrices(buffer.perObjectInstancePositioningMatrices, "sizeDataInstancesMatrices", true);
        this._texturePerObjectInstanceMatricesData = texturePerObjectInstanceMatrices.textureData;

        /*
         * Texture that holds the objectDecodeAndInstanceMatrix per-object:
         * - columns: each column is one column of the matrix
         * - row: the object Id
         * The texture will have:
         * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
         *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
         * - N rows where N is the number of objects
         */
        const texturePerObjectPositionsDecodeMatrix = createTextureForMatrices(buffer.perObjectPositionsDecodeMatrices, "sizeDataPositionDecodeMatrices", false);


        const createTextureForSingleItems = function(dataArrays, dataCnt, entitySize, type, statsProp) {
            return createDataTexture(dataArrays, dataCnt / entitySize, entitySize, type, 4096, statsProp, false);
        };

        /*
         * Texture that holds all the `different-vertices` used by the layer.
         * This will generate a texture for positions in the layer.
         *
         * The texture will have:
         * - 1024 columns, where each pixel will be a 16-bit-per-component RGB texture, corresponding to the XYZ of the position
         * - a number of rows R where R*1024 is just >= than the number of vertices (positions / 3)
         */
        const texturePerVertexIdCoordinates = createTextureForSingleItems(
            buffer.positionsCompressed, buffer.lenPositionsCompressed, 3, gl.UNSIGNED_SHORT, "sizeDataTexturePositions");

        const draw8  = buffer.geometry8Bits.createDrawers( createTextureForSingleItems, gl.UNSIGNED_BYTE);
        const draw16 = buffer.geometry16Bits.createDrawers(createTextureForSingleItems, gl.UNSIGNED_SHORT);
        const draw32 = buffer.geometry32Bits.createDrawers(createTextureForSingleItems, gl.UNSIGNED_INT);

        // Free up memory
        this._buffer = null;
        this._bucketGeometries = {};
        this._deferredSetFlagsDirty = false; //

        this._onSceneRendering = this.model.scene.on("rendering", () => {
            if (this._deferredSetFlagsDirty) {
                this._uploadDeferredFlags();
            }
            this._numUpdatesInFrame = 0;
        });

        const scene = this.model.scene;

        this._finalized = true;

        return {
            renderers: getRenderers(scene, "dtx", this.primitive, false,
                                           subGeometry => makeDTXRenderingAttributes(scene.canvas.gl, subGeometry)),
            edgesColorOpaqueAllowed: () => {
                if (this.model.scene.logarithmicDepthBufferEnabled) {
                    if (!this.model.scene._loggedWarning) {
                        console.log("Edge enhancement for SceneModel data texture layers currently disabled with logarithmic depth buffer");
                        this.model.scene._loggedWarning = true;
                    }
                    return false;
                } else {
                    return true;
                }
            },
            sortId: this._sortId,
            surfaceHasNormals: true,
            layerDrawState: {
                bindCommonTextures: function(
                    uTexPerObjectPositionsDecodeMatrix,
                    uTexPerVertexIdCoordinates,
                    uTexPerObjectColorsAndFlags,
                    uTexPerObjectMatrix) {
                    uTexPerObjectPositionsDecodeMatrix(texturePerObjectPositionsDecodeMatrix, 1);
                    uTexPerVertexIdCoordinates(texturePerVertexIdCoordinates,                 2);
                    uTexPerObjectColorsAndFlags(texturePerObjectColorsAndFlags,               3);
                    uTexPerObjectMatrix(texturePerObjectInstanceMatrices,                     4);
                },

                drawTriangles: function(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode) {
                    draw8.indices( uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                    draw16.indices(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                    draw32.indices(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                },

                drawEdges: function(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode) {
                    draw8.edges( uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                    draw16.edges(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                    draw32.edges(uTexPerPrimitiveIdPortionIds, uTexPerPrimitiveIdIndices, glMode);
                }
            }
        };
    }

    /**
     * This will _start_ a "set-flags transaction".
     *
     * After invoking this method, calling setFlags/setFlags2 will not update
     * the colors+flags texture but only store the new flags/flag2 in the
     * colors+flags texture data array.
     *
     * After invoking this method, and when all desired setFlags/setFlags2 have
     * been called on needed portions of the layer, invoke `_uploadDeferredFlags`
     * to actually upload the data array into the texture.
     *
     * In massive "set-flags" scenarios like VFC or LOD mechanisms, the combination of
     * `_beginDeferredFlags` + `_uploadDeferredFlags`brings a speed-up of
     * up to 80x when e.g. objects are massively (un)culled 🚀.
     */
    _beginDeferredFlags() {
        this._deferredSetFlagsActive = true;
    }

    /**
     * This will _commit_ a "set-flags transaction".
     *
     * Invoking this method will update the colors+flags texture data with new
     * flags/flags2 set since the previous invocation of `_beginDeferredFlags`.
     */
    _uploadDeferredFlags() {
        this._deferredSetFlagsActive = false;
        if (this._deferredSetFlagsDirty) {
            this._deferredSetFlagsDirty = false;
            this._texturePerObjectColorsAndFlagsData.reloadData();
        }
    }

    _setClippableFlags(portionId, flags) {
        this._setFlags2(portionId, flags);
    }

    setColor(portionId, color) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            tempUint8Array4[0] = color[0];
            tempUint8Array4[1] = color[1];
            tempUint8Array4[2] = color[2];
            tempUint8Array4[3] = color[3];
            this._setPortionColorsAndFlags(subPortionIds[i], 0, tempUint8Array4, false);
        }
    }

    _setPortionColorsAndFlags(subPortionId, offset, data, deferred) {
        const defer = this._deferredSetFlagsActive || deferred;
        if (defer) {
            this._deferredSetFlagsDirty = true;
        } else if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        this._texturePerObjectColorsAndFlagsData.setData(data, subPortionId, offset, !defer);
    }

    _setFlags(portionId, flags, transparent, deferred = false) {
        if (!this._finalized) {
            throw "Not finalized";
        }

        this._getColSilhEdgePickFlags(flags, transparent, tempUint8Array4);

        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._setPortionColorsAndFlags(subPortionIds[i], 2, tempUint8Array4, deferred);
        }
    }

    _setDeferredFlags() {
    }

    _setFlags2(portionId, flags, deferred = false) {
        if (!this._finalized) {
            throw "Not finalized";
        }

        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            tempUint8Array4[0] = (flags & ENTITY_FLAGS.CLIPPABLE) ? 255 : 0;
            tempUint8Array4[1] = 0;
            tempUint8Array4[2] = 1;
            tempUint8Array4[3] = 2;
            this._setPortionColorsAndFlags(subPortionIds[i], 3, tempUint8Array4, deferred);
        }
    }

    setOffset(portionId, offset) {
        // NOT COMPLETE
    }

    setMatrix(portionId, matrix) {
        if (!this._finalized) {
            throw "Not finalized";
        }

        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            const defer = this._deferredSetFlagsActive;
            if (defer) {
                this._deferredSetFlagsDirty = true;
            } else if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
                this._beginDeferredFlags(); // Subsequent flags updates now deferred
            }
            tempMat4a.set(matrix);
            this._texturePerObjectInstanceMatricesData.setData(tempMat4a, subPortionIds[i], 0, !defer);
        }
    }

    //------------------------------------------------------------------------------------------------

    getEachVertex(portionId, callback) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        if (!subPortionIds) {
            this.model.error("portion not found: " + portionId);
        } else if (this._subPortionReadableGeometries) {
            for (let i = 0, len = subPortionIds.length; i < len; i++) {
                const subPortionReadableGeometry = this._subPortionReadableGeometries[subPortionIds[i]];
                const positions = subPortionReadableGeometry.positionsCompressed;
                const positionsDecodeMatrix = subPortionReadableGeometry.positionsDecodeMatrix;
                const worldPos = tempVec4a;
                for (let i = 0, len = positions.length; i < len; i += 3) {
                    worldPos[0] = positions[i];
                    worldPos[1] = positions[i + 1];
                    worldPos[2] = positions[i + 2];
                    worldPos[3] = 1.0;
                    math.decompressPosition(worldPos, positionsDecodeMatrix);
                    math.mulMat4v4(this.model.worldMatrix, worldPos, worldPos);
                    math.transformPoint4(this.model.worldMatrix, worldPos, worldPos);
                    math.addVec3(this.origin, worldPos, worldPos);
                    callback(worldPos);
                }
            }
        }
    }

    getEachIndex(portionId, callback) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        if (!subPortionIds) {
            this.model.error("portion not found: " + portionId);
        } else if (this._subPortionReadableGeometries) {
            subPortionIds.forEach(
                subPortionId => this._subPortionReadableGeometries[subPortionId].indices.forEach(i => callback(i)));
        }
    }

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {
        return false;
    }

    destroy() {
        if (this._destroyed) {
            return;
        }
        this.model.scene.off(this._onSceneRendering);
        this._destroyed = true;
    }
}

const createBindableDataTexture = function(gl, entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData) {
    if ((entitySize > 4) && ((entitySize % 4) > 0)) {
        throw "Unhandled data size " + entitySize;
    }
    const pixelsPerEntity = Math.ceil(entitySize / 4);
    const pixelWidth = entitySize / pixelsPerEntity;

    const [ arrayType, internalFormat, format ] = (function() {
        switch(type) {
        case gl.UNSIGNED_BYTE:
            return [ Uint8Array,   ...((pixelWidth === 1) ? [ gl.R8UI,  gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG8UI,  gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB8UI,  gl.RGB_INTEGER ] : [ gl.RGBA8UI,  gl.RGBA_INTEGER ]))) ];
        case gl.UNSIGNED_SHORT:
            return [ Uint16Array,  ...((pixelWidth === 1) ? [ gl.R16UI, gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG16UI, gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB16UI, gl.RGB_INTEGER ] : [ gl.RGBA16UI, gl.RGBA_INTEGER ]))) ];
        case gl.UNSIGNED_INT:
            return [ Uint32Array,  ...((pixelWidth === 1) ? [ gl.R32UI, gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG32UI, gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB32UI, gl.RGB_INTEGER ] : [ gl.RGBA32UI, gl.RGBA_INTEGER ]))) ];
        case gl.FLOAT:
            return [ Float32Array, ...((pixelWidth === 1) ? [ gl.R32F,  gl.RED ]         : ((pixelWidth === 2) ? [ gl.RG32F,  gl.RG ]         : ((pixelWidth === 3) ? [ gl.RGB32F,  gl.RGB ]         : [ gl.RGBA32F,  gl.RGBA ]))) ];
        default:
            throw "Unhandled data type " + type;
        }
    })();

    const textureWidth = entitiesPerRow * pixelsPerEntity;
    const textureHeight = Math.ceil(entitiesCnt / entitiesPerRow);
    if (textureHeight === 0) {
        throw "texture height===0";
    }
    const texArray = new arrayType(textureWidth * textureHeight * pixelWidth);
    dataTextureRamStats[statsProp] += texArray.byteLength;
    dataTextureRamStats.numberOfTextures++;

    populateTexArray(texArray);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, textureWidth, textureHeight);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, format, type, texArray);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return {
        // called by Sampler::bindTexture
        bind(unit) {
            gl.activeTexture(gl["TEXTURE" + unit]);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return true;
        },

        unbind(unit) {
            // This `unbind` method is ignored at the moment to allow avoiding
            // to rebind same texture already bound to a texture unit.

            // this._gl.activeTexture(gl["TEXTURE" + unit]);
            // this._gl.bindTexture(gl.TEXTURE_2D, null);
        },

        textureData: exposeData && {
            setData(data, subPortionId, offset = 0, load = false) {
                texArray.set(data, subPortionId * entitySize + offset * pixelWidth);
                if (load) {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    const xoffset = (subPortionId % entitiesPerRow) * pixelsPerEntity + offset;
                    const yoffset = Math.floor(subPortionId / entitiesPerRow);
                    const width = data.length / pixelWidth;
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, 1, format, type, data);
                    // gl.bindTexture (gl.TEXTURE_2D, null);
                }
            },

            reloadData() {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, format, type, texArray);
            }
        }
    };
};
