import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {getColSilhEdgePickFlags, getRenderers, isPerspectiveMatrix, Layer} from "./Layer.js";
import {math} from "../../math/math.js";
import {Configs} from "../../../Configs.js";

const iota = (n) => { const ret = [ ]; for (let i = 0; i < n; ++i) ret.push(i); return ret; };

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

const tempVec3 = math.vec3();
const tempVec3a = math.vec3();
const tempVec4a = math.vec4();
const tempVec4b = math.vec4();
const tempMat4a = new Float32Array(16);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXLayer extends Layer {

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
                        indices: function(layerTypeInputs, glMode) {
                            if (numIndices > 0) {
                                layerTypeInputs.perPrimIndices.setInputValue(indicesTexture);
                                layerTypeInputs.perPrimIdPorIds.setInputValue(portionIdsTexture);
                                gl.drawArrays(glMode, 0, numIndices);
                            }
                        },
                        edges: function(layerTypeInputs, glMode) {
                            if (numEdgeIndices > 0) {
                                layerTypeInputs.perPrimIndices.setInputValue(edgeIndicesTexture);
                                layerTypeInputs.perPrimIdPorIds.setInputValue(portionEdgeIdsTexture);
                                gl.drawArrays(glMode, 0, numEdgeIndices);
                            }
                        }
                    };
                }
            };
        };

        const buffer = this._buffer = {
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

        this._primitive = primitive;
    }

    /**
     * Returns whether the ```TrianglesDataTextureLayer``` has room for more portions.
     *
     * @param {object} portionCfg An object containing the geometrical data (`positions`, `indices`, `edgeIndices`) for the portion.
     * @returns {Boolean} Wheter the requested portion can be created
     */
    canCreatePortion(portionCfg) {
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
        const buffer                       = this._buffer;
        const model                        = this.model;
        const numPortions                  = this._portions.length;
        const origin                       = this.origin;
        const portionToSubPortionsMap      = this._portionToSubPortionsMap;
        const primitive                    = this._primitive;
        const sortId                       = this._sortId;
        const subPortionReadableGeometries = this._subPortionReadableGeometries;

        const scene = model.scene;
        const gl = scene.canvas.gl;

        /*
         * Texture that holds colors/pickColors/flags/flags2 per-object:
         * - columns: one concept per column => color / pick-color / ...
         * - row: the object Id
         * The texture will have:
         * - 4 RGBA columns per row: for each object (pick) color and flags(2)
         * - N rows where N is the number of objects
         */
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
        const texturePerObjectColorsAndFlagsData = texturePerObjectColorsAndFlags.textureData;

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
        const texturePerObjectInstanceMatricesData = texturePerObjectInstanceMatrices.textureData;

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

        let deferredSetFlagsActive = false;
        let deferredSetFlagsDirty = false;
        let destroyed = false;
        let numUpdatesInFrame = 0;


        /**
         * This will _start_ a "set-flags transaction".
         *
         * After invoking this method, calling setFlags/setFlags2 will not update
         * the colors+flags texture but only store the new flags/flag2 in the
         * colors+flags texture data array.
         *
         * After invoking this method, and when all desired setFlags/setFlags2 have
         * been called on needed portions of the layer, invoke `uploadDeferredFlags`
         * to actually upload the data array into the texture.
         *
         * In massive "set-flags" scenarios like VFC or LOD mechanisms, the combination of
         * `beginDeferredFlags` + `uploadDeferredFlags`brings a speed-up of
         * up to 80x when e.g. objects are massively (un)culled 🚀.
         */
        const beginDeferredFlags = () => { deferredSetFlagsActive = true; };

        const onSceneRendering = scene.on("rendering", () => {
            if (deferredSetFlagsDirty) {
                // uploadDeferredFlags
                /**
                 * This will _commit_ a "set-flags transaction".
                 * Invoking this method will update the colors+flags texture data with new
                 * flags/flags2 set since the previous invocation of `beginDeferredFlags`.
                 */
                deferredSetFlagsActive = false;
                deferredSetFlagsDirty = false;
                texturePerObjectColorsAndFlagsData.reloadData();
            }
            numUpdatesInFrame = 0;
        });

        const forEachSubPortionId = (portionId, cb) => {
            const subPortionIds = portionToSubPortionsMap[portionId];
            if (!subPortionIds) {
                model.error("portion not found: " + portionId);
            } else {
                for (let i = 0, len = subPortionIds.length; i < len; i++) {
                    cb(subPortionIds[i]);
                }
            }
        };

        const setPortionColorsAndFlags = (subPortionId, offset, data, deferred) => {
            const defer = deferredSetFlagsActive || deferred;
            if (defer) {
                deferredSetFlagsDirty = true;
            } else if (++numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
                beginDeferredFlags(); // Subsequent flags updates now deferred
            }
            texturePerObjectColorsAndFlagsData.setData(data, subPortionId, offset, !defer);
        };

        const setFlags2 = (portionId, flags, deferred = false) => {
            tempUint8Array4.set([ (flags & ENTITY_FLAGS.CLIPPABLE) ? 255 : 0, 0, 1, 2 ]);
            forEachSubPortionId(portionId, subPortionId => setPortionColorsAndFlags(subPortionId, 3, tempUint8Array4, deferred));
        };

        return {
            edgesColorOpaqueAllowed: () => {
                if (scene.logarithmicDepthBufferEnabled) {
                    if (!scene._loggedWarning) {
                        console.log("Edge enhancement for SceneModel data texture layers currently disabled with logarithmic depth buffer");
                        scene._loggedWarning = true;
                    }
                    return false;
                } else {
                    return true;
                }
            },
            sortId: sortId,
            setClippableFlags: setFlags2,
            setFlags: (portionId, flags, transparent, deferred = false) => {
                getColSilhEdgePickFlags(flags, transparent, true, scene, tempUint8Array4);
                forEachSubPortionId(portionId, subPortionId => setPortionColorsAndFlags(subPortionId, 2, tempUint8Array4, deferred));
            },
            setFlags2: setFlags2,
            setDeferredFlags: () => { },

            setColor: (portionId, color) => {
                tempUint8Array4.set(color);
                forEachSubPortionId(portionId, subPortionId => setPortionColorsAndFlags(subPortionId, 0, tempUint8Array4, false));
            },
            setMatrix: (portionId, matrix) => {
                forEachSubPortionId(portionId, subPortionId => {
                    const defer = deferredSetFlagsActive;
                    if (defer) {
                        deferredSetFlagsDirty = true;
                    } else if (++numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
                        beginDeferredFlags(); // Subsequent flags updates now deferred
                    }
                    tempMat4a.set(matrix);
                    texturePerObjectInstanceMatricesData.setData(tempMat4a, subPortionId, 0, !defer);
                });
            },
            setOffset: (portionId, offset) =>  { /* NOT COMPLETE */ },

            getEachIndex: (portionId, callback) => {
                if (subPortionReadableGeometries) {
                    forEachSubPortionId(
                        portionId,
                        subPortionId => subPortionReadableGeometries[subPortionId].indices.forEach(i => callback(i)));
                }
            },
            getEachVertex: (portionId, callback) => {
                if (subPortionReadableGeometries) {
                    forEachSubPortionId(portionId, subPortionId => {
                        const subPortionReadableGeometry = subPortionReadableGeometries[subPortionId];
                        const positions = subPortionReadableGeometry.positionsCompressed;
                        const positionsDecodeMatrix = subPortionReadableGeometry.positionsDecodeMatrix;
                        const worldPos = tempVec4a;
                        for (let i = 0, len = positions.length; i < len; i += 3) {
                            worldPos[0] = positions[i];
                            worldPos[1] = positions[i + 1];
                            worldPos[2] = positions[i + 2];
                            worldPos[3] = 1.0;
                            math.decompressPosition(worldPos, positionsDecodeMatrix);
                            math.mulMat4v4(model.worldMatrix, worldPos, worldPos);
                            math.addVec3(origin, worldPos, worldPos);
                            callback(worldPos);
                        }
                    });
                }
            },
            precisionRayPickSurface: (portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) => false,

            renderers: getRenderers(scene, "dtx", primitive, model.saoEnabled, false, false, true,
                                    (programVariables, subGeometry) => makeDTXRenderingAttributes(programVariables, !subGeometry)),
            drawCalls: (function() {
                const drawer = function(drawCall) {
                    const setInputValue = (input, value) => (input.setInputValue && input.setInputValue(value));
                    return (attributesHash, layerTypeInputs, viewState) => {
                        setInputValue(layerTypeInputs.worldMatrix, model.rotationMatrix);
                        setInputValue(layerTypeInputs.viewMatrix, viewState.viewMatrix);
                        setInputValue(layerTypeInputs.projMatrix, viewState.projMatrix);
                        const rtcOrigin = math.transformPoint3(model.matrix, origin, tempVec3);
                        setInputValue(layerTypeInputs.uCameraEyeRtc, math.subVec3(viewState.eye, rtcOrigin, tempVec3a));
                        setInputValue(layerTypeInputs.perObjPosDecode, texturePerObjectPositionsDecodeMatrix);
                        setInputValue(layerTypeInputs.perVertIdCoords, texturePerVertexIdCoordinates);
                        setInputValue(layerTypeInputs.perObjColsFlags, texturePerObjectColorsAndFlags);
                        setInputValue(layerTypeInputs.perObjectMatrix, texturePerObjectInstanceMatrices);
                        drawCall(layerTypeInputs);
                    };
                };

                const vertEdgesDrawer = function(glMode) {
                    return drawer((layerTypeInputs) => {
                        draw8.edges( layerTypeInputs, glMode);
                        draw16.edges(layerTypeInputs, glMode);
                        draw32.edges(layerTypeInputs, glMode);
                    });
                };

                return {
                    drawVertices: vertEdgesDrawer(gl.POINTS),
                    drawEdges:    vertEdgesDrawer(gl.LINES),
                    drawSurface:  drawer((layerTypeInputs) => {
                        const glMode = gl.TRIANGLES;
                        draw8.indices( layerTypeInputs, glMode);
                        draw16.indices(layerTypeInputs, glMode);
                        draw32.indices(layerTypeInputs, glMode);
                    })
                };
            })(),

            destroy: () => {
                if (! destroyed) {
                    scene.off(onSceneRendering);
                    destroyed = true;
                }
            }
        };
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
        // called by createSampler::bindTexture
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

const makeDTXRenderingAttributes = function(programVariables, isTriangle) {
    const setupTex = (type, name) => {
        const map = programVariables.createUniform(type, name);
        const texelFetch = (P) => `texelFetch(${map}, ${P}, 0)`;
        texelFetch.map = map;
        return texelFetch;
    };

    const perPrimIndices  = setupTex("highp   usampler2D", "perPrimIndices");
    const perPrimIdPorIds = setupTex("mediump usampler2D", "perPrimIdPorIds");

    const perObjPosDecode = setupTex("highp    sampler2D", "perObjPosDecode");
    const perVertIdCoords = setupTex("mediump usampler2D", "perVertIdCoords");
    const perObjColsFlags = setupTex("lowp    usampler2D", "perObjColsFlags");
    const perObjectMatrix = setupTex("highp    sampler2D", "perObjectMatrix");

    const worldMatrix   = programVariables.createUniform("mat4", "worldMatrix");
    const viewMatrix    = programVariables.createUniform("mat4", "viewMatrix");
    const projMatrix    = programVariables.createUniform("mat4", "projMatrix");
    const uCameraEyeRtc = programVariables.createUniform("vec3", "uCameraEyeRtc");

    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const colorA     = lazyShaderVariable("colorA");
    const pickColorA = lazyShaderVariable("pickColor");
    const worldNormal = lazyShaderVariable("worldNormal");
    const viewNormal = lazyShaderVariable("viewNormal");

    const colorsAndFlags = (offset) => perObjColsFlags(`ivec2(objectIndexCoords.x*8+${offset}, objectIndexCoords.y)`);

    return {
        clippableTest: (function() {
            const vClippable = programVariables.createVarying("uint", "vClippable", () => "flags2.r", "flat");
            return () => `${vClippable} > 0u`;
        })(),

        geometryParameters: {
            attributes: {
                color:             colorA,
                flags:             iota(4).map(i => `int(flags[${i}])`),
                metallicRoughness: null,
                normal:            {
                    view:  viewNormal,
                    world: worldNormal
                },
                pickColor:         pickColorA,
                position:          {
                    clip:  "gl_Position",
                    view:  "viewPosition",
                    world: "worldPosition"
                },
                uv:                null
            },
            projMatrix: projMatrix,
            viewMatrix: viewMatrix
        },

        ensureColorAndFlagAvailable: (src) => {
            // constants
            src.push("int primitiveIndex = gl_VertexID / " + (isTriangle ? 3 : 2) + ";");

            // get packed object-id
            src.push("int h_packed_object_id_index = (primitiveIndex >> 3) & 4095;");
            src.push("int v_packed_object_id_index = (primitiveIndex >> 3) >> 12;");

            src.push(`int objectIndex = int(${perPrimIdPorIds("ivec2(h_packed_object_id_index, v_packed_object_id_index)")}.r);`);
            src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

            // get flags & flags2
            src.push(`uvec4 flags  = ${colorsAndFlags(2)};`);
            src.push(`uvec4 flags2 = ${colorsAndFlags(3)};`);

            colorA.needed && src.push(`vec4 ${colorA} = vec4(${colorsAndFlags(0)}) / 255.0;`);
        },

        appendVertexData: (src) => {
            const objMatrix = (offset) => perObjectMatrix(`ivec2(objectIndexCoords.x*4+${offset}, objectIndexCoords.y)`);
            src.push(`mat4 objectInstanceMatrix = mat4(${objMatrix(0)}, ${objMatrix(1)}, ${objMatrix(2)}, ${objMatrix(3)});`);

            const posMatrix = (offset) => perObjPosDecode(`ivec2(objectIndexCoords.x*4+${offset}, objectIndexCoords.y)`);
            src.push(`mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4(${posMatrix(0)}, ${posMatrix(1)}, ${posMatrix(2)}, ${posMatrix(3)});`);

            src.push(`ivec4 packedVertexBase = ivec4(${colorsAndFlags(4)});`);
            src.push(`ivec4 packedIndexBaseOffset = ivec4(${colorsAndFlags(isTriangle ? 5 : 6)});`);
            src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

            src.push("int h_index = (primitiveIndex - indexBaseOffset) & 4095;");
            src.push("int v_index = (primitiveIndex - indexBaseOffset) >> 12;");

            src.push(`ivec3 vertexIndices = ivec3(${perPrimIndices("ivec2(h_index, v_index)")});`);
            src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;");

            if (isTriangle) {
                src.push("ivec3 indexPositionH = uniqueVertexIndexes & 4095;");
                src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 12;");
                src.push(`uint solid = ${colorsAndFlags(7)}.r;`);
                const vertIdCoords = (idx) => `vec3(${perVertIdCoords(`ivec2(indexPositionH[${idx}], indexPositionV[${idx}])`)})`;
                src.push(`vec3 positions[] = vec3[](${vertIdCoords(0)}, ${vertIdCoords(1)}, ${vertIdCoords(2)});`);
                src.push("vec3 normal = normalize(cross(positions[2] - positions[0], positions[1] - positions[0]));");
                src.push("vec3 position = positions[gl_VertexID % 3];");
                if (worldNormal.needed) { // WARNING: Not thoroughly tested, as not being used at the moment
                    src.push(`vec3 worldNormal = -normalize((transpose(inverse(${worldMatrix} * objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);`);
                }
                if (viewNormal.needed) {
                    src.push(`vec3 viewNormal = -normalize((transpose(inverse(${viewMatrix} * objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);`);
                }
                // when the geometry is not solid, if needed, flip the triangle winding
                src.push("if (solid != 1u) {");
                src.push(`  if (${isPerspectiveMatrix(projMatrix)}) {`);
                src.push(`      vec3 uCameraEyeRtcInQuantizedSpace = (inverse(${worldMatrix} * objectDecodeAndInstanceMatrix) * vec4(${uCameraEyeRtc}, 1)).xyz;`);
                src.push("      if (dot(position.xyz - uCameraEyeRtcInQuantizedSpace, normal) < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (worldNormal.needed) {
                    src.push("          worldNormal = -worldNormal;");
                }
                if (viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  } else {");
                if (!viewNormal.needed) {
                    src.push(`      vec3 viewNormal = -normalize((transpose(inverse(${viewMatrix} * objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);`);
                }
                src.push("      if (viewNormal.z < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (worldNormal.needed) {
                    src.push("          worldNormal = -worldNormal;");
                }
                if (viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  }");
                src.push("}");
            } else {
                src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;");
                src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;");
                src.push(`vec3 position = vec3(${perVertIdCoords("ivec2(indexPositionH, indexPositionV)")});`);
            }

            pickColorA.needed && src.push(`vec4 pickColor = vec4(${colorsAndFlags(1)});`); // TODO: Normalize color "/ 255.0"?

            src.push(`vec4 worldPosition = ${worldMatrix} * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));`);
        },

        layerTypeInputs: {
            perPrimIndices:  perPrimIndices.map,
            perPrimIdPorIds: perPrimIdPorIds.map,

            perObjPosDecode: perObjPosDecode.map,
            perVertIdCoords: perVertIdCoords.map,
            perObjColsFlags: perObjColsFlags.map,
            perObjectMatrix: perObjectMatrix.map,

            worldMatrix:   worldMatrix,
            viewMatrix:    viewMatrix,
            projMatrix:    projMatrix,
            uCameraEyeRtc: uCameraEyeRtc
        }
    };
};
