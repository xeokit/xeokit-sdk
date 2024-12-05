import {ENTITY_FLAGS} from "../../ENTITY_FLAGS.js";
import {makeDTXRenderingAttributes} from "./DTXTrianglesDrawable.js";
import {getRenderers, Layer} from "../../layer/Layer.js";

import {math} from "../../../math/math.js";
import {RenderState} from "../../../webgl/RenderState.js";
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

let numLayers = 0;

const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXTrianglesLayer extends Layer {

    constructor(model, cfg) {

        super();

        dataTextureRamStats.numberOfLayers++;

        this.sortId = `TriDTX-${++numLayers}`; // State sorting key.

        this._renderers = getRenderers(model.scene, "dtx", cfg.primitive, false,
                                       subGeometry => makeDTXRenderingAttributes(model.scene.canvas.gl, subGeometry));
        this._hasEdges = this._renderers.edgesRenderers;
        this.model = model;
        this._edgesColorOpaqueAllowed = () => {
            if (this.model.scene.logarithmicDepthBufferEnabled) {
                if (!this.model.scene._loggedWarning) {
                    console.log("Edge enhancement for SceneModel data texture layers currently disabled with logarithmic depth buffer");
                    this.model.scene._loggedWarning = true;
                }
                return false;
            } else {
                return true;
            }
        };
        this._instancing = false;

        const gl = model.scene.canvas.gl;
        this._buffer = {
            positionsCompressed: [],
            lenPositionsCompressed: 0,

            metallicRoughness: [],

            indices8Bits: [],
            lenIndices8Bits: 0,

            indices16Bits: [],
            lenIndices16Bits: 0,

            indices32Bits: [],
            lenIndices32Bits: 0,

            edges8Bits:  { indicesData: { buf: [], len: 0 }, perNumberPortionIds: { buf: [], num: 0 } },
            edges16Bits: { indicesData: { buf: [], len: 0 }, perNumberPortionIds: { buf: [], num: 0 } },
            edges32Bits: { indicesData: { buf: [], len: 0 }, perNumberPortionIds: { buf: [], num: 0 } },

            perObjectColors: [],
            perObjectPickColors: [],
            perObjectSolid: [],
            perObjectOffsets: [],
            perObjectPositionsDecodeMatrices: [],
            perObjectInstancePositioningMatrices: [],
            perObjectVertexBases: [],
            perObjectIndexBaseOffsets: [],
            perObjectEdgeIndexBaseOffsets: [],
            perTriangleNumberPortionId8Bits: [],
            perTriangleNumberPortionId16Bits: [],
            perTriangleNumberPortionId32Bits: []
        };

        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            metallicRoughnessBuf: null,
            textureState: { },
            numIndices8Bits: 0,
            numIndices16Bits: 0,
            numIndices32Bits: 0,
            numVertices: 0,
        });

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
        this.primitive = cfg.primitive;

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
            const maxIndicesOfAnyBits = Math.max(this._state.numIndices8Bits, this._state.numIndices16Bits, this._state.numIndices32Bits,);
            let numVertices = 0;
            let numIndices = 0;
            portionCfg.buckets.forEach(bucket => {
                numVertices += bucket.positionsCompressed.length / 3;
                numIndices += bucket.indices.length / 3;
            });
            if ((this._state.numVertices + numVertices) > MAX_DATA_TEXTURE_HEIGHT * 4096 ||
                (maxIndicesOfAnyBits + numIndices) > MAX_DATA_TEXTURE_HEIGHT * 4096) {
                dataTextureRamStats.cannotCreatePortion.becauseTextureSize++;
            }
            retVal &&=
                (this._state.numVertices + numVertices) <= MAX_DATA_TEXTURE_HEIGHT * 4096 &&
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
     * @param portionCfg.metallic Metalness factor [0..255]
     * @param portionCfg.roughness Roughness factor [0..255]
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
        const subPortionIds = [];
        //   const portionAABB = portionCfg.worldAABB;
        portionCfg.buckets.forEach((bucket, bucketIndex) => {
            const bucketGeometryId = portionCfg.geometryId !== undefined && portionCfg.geometryId !== null
                ? `${portionCfg.geometryId}#${bucketIndex}`
                : `${portionCfg.id}#${bucketIndex}`;
            let bucketGeometry = this._bucketGeometries[bucketGeometryId];
            if (!bucketGeometry) {
                bucketGeometry = this._createBucketGeometry(portionCfg, bucket);
                this._bucketGeometries[bucketGeometryId] = bucketGeometry;
            }
            //  const subPortionAABB = math.collapseAABB3(tempAABB3b);
            const subPortionId = this._createSubPortion(portionCfg, bucketGeometry, bucket);
            //math.expandAABB3(portionAABB, subPortionAABB);
            subPortionIds.push(subPortionId);
        });
        const portionId = this._portionToSubPortionsMap.length;
        this._portionToSubPortionsMap.push(subPortionIds);
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    _createBucketGeometry(portionCfg, bucket) {

        // Indices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the triangles of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)

        if (bucket.indices) {
            const alignedIndicesLen = Math.ceil((bucket.indices.length / 3) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 3;
            dataTextureRamStats.overheadSizeAlignementIndices += 2 * (alignedIndicesLen - bucket.indices.length);
            const alignedIndices = new Uint32Array(alignedIndicesLen);
            alignedIndices.fill(0);
            alignedIndices.set(bucket.indices);
            bucket.indices = alignedIndices;
        }

        // EdgeIndices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the edges of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)

        if (bucket.edgeIndices) {
            const alignedEdgeIndicesLen = Math.ceil((bucket.edgeIndices.length / 2) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 2;
            dataTextureRamStats.overheadSizeAlignementEdgeIndices += 2 * (alignedEdgeIndicesLen - bucket.edgeIndices.length);
            const alignedEdgeIndices = new Uint32Array(alignedEdgeIndicesLen);
            alignedEdgeIndices.set(bucket.edgeIndices);
            bucket.edgeIndices = alignedEdgeIndices;
        }

        const positionsCompressed = bucket.positionsCompressed;
        const indices = bucket.indices;
        const edgeIndices = bucket.edgeIndices;
        const buffer = this._buffer;

        buffer.positionsCompressed.push(positionsCompressed)
        const vertexBase = buffer.lenPositionsCompressed / 3;
        const numVertices = positionsCompressed.length / 3;
        buffer.lenPositionsCompressed += positionsCompressed.length;

        let indicesBase;
        let numTriangles = 0;
        if (indices) {
            numTriangles = indices.length / 3;
            let indicesBuffer;
            if (numVertices <= (1 << 8)) {
                indicesBuffer = buffer.indices8Bits;
                indicesBase = buffer.lenIndices8Bits / 3;
                buffer.lenIndices8Bits += indices.length;
            } else if (numVertices <= (1 << 16)) {
                indicesBuffer = buffer.indices16Bits;
                indicesBase = buffer.lenIndices16Bits / 3;
                buffer.lenIndices16Bits += indices.length;
            } else {
                indicesBuffer = buffer.indices32Bits;
                indicesBase = buffer.lenIndices32Bits / 3;
                buffer.lenIndices32Bits += indices.length;
            }
            indicesBuffer.push(indices);
        }

        this._state.numVertices += numVertices;

        dataTextureRamStats.numberOfGeometries++;

        const bucketGeometry = {
            vertexBase,
            numVertices,
            numTriangles,
            indicesBase,
            edgesData: edgeIndices && (function() {
                const accumulate = edges => {
                    const indicesData = edges.indicesData;
                    const edgeIndicesBuffer = indicesData.buf;
                    const edgeIndicesBase = indicesData.len / 2;
                    indicesData.len += edgeIndices.length;
                    edgeIndicesBuffer.push(edgeIndices);
                    return {
                        numEdges: edgeIndices.length / 2,
                        edgeIndicesBase: edgeIndicesBase
                    };
                };

                if (numVertices <= (1 << 8)) {
                    return accumulate(buffer.edges8Bits);
                } else if (numVertices <= (1 << 16)) {
                    return accumulate(buffer.edges16Bits);
                } else {
                    return accumulate(buffer.edges32Bits);
                }
            })()
        };

        return bucketGeometry;
    }

    _createSubPortion(portionCfg, bucketGeometry, bucket, subPortionAABB) {

        const color = portionCfg.color;
        const metallic = portionCfg.metallic;
        const roughness = portionCfg.roughness;
        const colors = portionCfg.colors;
        const opacity = portionCfg.opacity;
        const meshMatrix = portionCfg.meshMatrix;
        const pickColor = portionCfg.pickColor;
        const buffer = this._buffer;
        const state = this._state;

        buffer.perObjectPositionsDecodeMatrices.push(portionCfg.positionsDecodeMatrix);
        buffer.perObjectInstancePositioningMatrices.push(meshMatrix || DEFAULT_MATRIX);

        buffer.perObjectSolid.push(!!portionCfg.solid);

        if (colors) {
            buffer.perObjectColors.push([colors[0] * 255, colors[1] * 255, colors[2] * 255, 255]);
        } else if (color) { // Color is pre-quantized by SceneModel
            buffer.perObjectColors.push([color[0], color[1], color[2], opacity]);
        }

        buffer.perObjectPickColors.push(pickColor);
        buffer.perObjectVertexBases.push(bucketGeometry.vertexBase);

        const subPortionId = this._portions.length;
        let currentNumIndices = 0;
        if (bucketGeometry.numTriangles > 0) {
            let numIndices = bucketGeometry.numTriangles * 3;
            let indicesPortionIdBuffer;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId8Bits;
                currentNumIndices = state.numIndices8Bits;
                state.numIndices8Bits += numIndices;
                dataTextureRamStats.totalPolygons8Bits += bucketGeometry.numTriangles;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId16Bits;
                currentNumIndices = state.numIndices16Bits;
                state.numIndices16Bits += numIndices;
                dataTextureRamStats.totalPolygons16Bits += bucketGeometry.numTriangles;
            } else {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId32Bits;
                currentNumIndices = state.numIndices32Bits;
                state.numIndices32Bits += numIndices;
                dataTextureRamStats.totalPolygons32Bits += bucketGeometry.numTriangles;
            }
            dataTextureRamStats.totalPolygons += bucketGeometry.numTriangles;
            for (let i = 0; i < bucketGeometry.numTriangles; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                indicesPortionIdBuffer.push(subPortionId);
            }
        }
        buffer.perObjectIndexBaseOffsets.push(currentNumIndices / 3 - bucketGeometry.indicesBase);

        let currentNumEdgeIndices = 0;
        if (bucketGeometry.edgesData.numEdges > 0) {
            const accumulateEdges = (edges, statsProp) => {
                const edgeIndicesPortionIdBuffer = edges.perNumberPortionIds;
                const numEdges = bucketGeometry.edgesData.numEdges;
                currentNumEdgeIndices = edgeIndicesPortionIdBuffer.num;
                edgeIndicesPortionIdBuffer.num += numEdges * 2;
                for (let i = 0; i < numEdges; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                    edgeIndicesPortionIdBuffer.buf.push(subPortionId);
                }
                dataTextureRamStats[statsProp] += numEdges;
                dataTextureRamStats.totalEdges += numEdges;
            };

            if (bucketGeometry.numVertices <= (1 << 8)) {
                accumulateEdges(buffer.edges8Bits,  "totalEdges8Bits");
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                accumulateEdges(buffer.edges16Bits, "totalEdges16Bits");
            } else {
                accumulateEdges(buffer.edges32Bits, "totalEdges32Bits");
            }
        }
        buffer.perObjectEdgeIndexBaseOffsets.push(currentNumEdgeIndices / 2 - bucketGeometry.edgesData.edgeIndicesBase);

        //   buffer.perObjectOffsets.push([0, 0, 0]);

        this._portions.push({
            // vertsBase: vertsIndex,
            numVertices: bucketGeometry.numTriangles
        });

        if (this._subPortionReadableGeometries) {
            this._subPortionReadableGeometries[subPortionId] = {
                indices: bucket.indices,
                positionsCompressed: bucket.positionsCompressed,
                positionsDecodeMatrix: portionCfg.positionsDecodeMatrix,
                meshMatrix: portionCfg.meshMatrix
            };
        }

        dataTextureRamStats.numberOfPortions++;

        return subPortionId;
    }

    /**
     * Builds data textures from the appended geometries and loads them into the GPU.
     *
     * No more portions can then be created.
     */
    finalize() {

        if (this._finalized) {
            return;
        }

        const textureState = this._state.textureState;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;

        const state = this._state;
        state.gl = gl;

        const createBindableDataTexture = function(entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData) {
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

                    // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
                    // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
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

        /*
         * Texture that holds colors/pickColors/flags/flags2 per-object:
         * - columns: one concept per column => color / pick-color / ...
         * - row: the object Id
         * This will generate an RGBA texture for:
         * - colors
         * - pickColors
         * - flags
         * - flags2
         * - vertex bases
         * - vertex base offsets
         *
         * The texture will have:
         * - 4 RGBA columns per row: for each object (pick) color and flags(2)
         * - N rows where N is the number of objects
         */
        const texturePerObjectColorsAndFlags = (function() {
            const colors = buffer.perObjectColors;
            const pickColors = buffer.perObjectPickColors;
            const vertexBases = buffer.perObjectVertexBases;
            const indexBaseOffsets = buffer.perObjectIndexBaseOffsets;
            const edgeIndexBaseOffsets = buffer.perObjectEdgeIndexBaseOffsets;
            const solid = buffer.perObjectSolid;

            // The number of rows in the texture is the number of objects in the layer.
            const numPortions = colors.length;

            const pack32as4x8 = ui32 => [
                (ui32 >> 24) & 255,
                (ui32 >> 16) & 255,
                (ui32 >>  8) & 255,
                (ui32)       & 255
            ];

            const populateTexArray = texArray => {
                for (let i = 0; i < numPortions; i++) {
                    // 8 columns per texture row:
                    texArray.set(colors[i],                            i * 32 +  0); // - col0: (RGBA) object color RGBA
                    texArray.set(pickColors[i],                        i * 32 +  4); // - col1: (packed Uint32 as RGBA) object pick color
                    texArray.set([0, 0, 0, 0],                         i * 32 +  8); // - col2: (packed 4 bytes as RGBA) object flags
                    texArray.set([0, 0, 0, 0],                         i * 32 + 12); // - col3: (packed 4 bytes as RGBA) object flags2
                    texArray.set(pack32as4x8(vertexBases[i]),          i * 32 + 16); // - col4: (packed Uint32 bytes as RGBA) vertex base
                    texArray.set(pack32as4x8(indexBaseOffsets[i]),     i * 32 + 20); // - col5: (packed Uint32 bytes as RGBA) index base offset
                    texArray.set(pack32as4x8(edgeIndexBaseOffsets[i]), i * 32 + 24); // - col6: (packed Uint32 bytes as RGBA) edge index base offset
                    texArray.set([solid[i] ? 1 : 0, 0, 0, 0],          i * 32 + 28); // - col7: (packed 4 bytes as RGBA) is-solid flag for objects
                }
            };

            return createBindableDataTexture(numPortions, 32, gl.UNSIGNED_BYTE, 512, populateTexArray, "sizeDataColorsAndFlags", true);
        })();
        textureState.texturePerObjectColorsAndFlagsData = texturePerObjectColorsAndFlags.textureData;

        const createDataTexture = function(dataArrays, entitiesCnt, entitySize, type, entitiesPerRow, statsProp, exposeData) {
            const populateTexArray = texArray => {
                for (let i = 0, j = 0, len = dataArrays.length; i < len; i++) {
                    const pc = dataArrays[i];
                    texArray.set(pc, j);
                    j += pc.length;
                }
            };
            return createBindableDataTexture(entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData);
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
        textureState.texturePerObjectInstanceMatricesData = texturePerObjectInstanceMatrices.textureData;

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


        const createTextureForPackedPortionIds = function(portionIdsArray, defaultIfEmpty) {
            return (portionIdsArray.length > 0) ? createTextureForSingleItems([ portionIdsArray ], portionIdsArray.length, 1, gl.UNSIGNED_SHORT, "sizeDataTexturePortionIds") : defaultIfEmpty;
        };

        // Textures that hold the PortionId that corresponds to a given polygon-id.
        const polygonPortionIds8  = createTextureForPackedPortionIds(buffer.perTriangleNumberPortionId8Bits,  { texture: null });
        const polygonPortionIds16 = createTextureForPackedPortionIds(buffer.perTriangleNumberPortionId16Bits, { texture: null });
        const polygonPortionIds32 = createTextureForPackedPortionIds(buffer.perTriangleNumberPortionId32Bits, { texture: null });

        const createTextureForIndices = function(indicesArrays, lenIndices, type) {
            return (lenIndices > 0) && createTextureForSingleItems(indicesArrays, lenIndices, 3, type, "sizeDataTextureIndices");
        };

        // Texture that holds the unique-vertex-indices.
        const polygonIndices8  = createTextureForIndices(buffer.indices8Bits,  buffer.lenIndices8Bits,  gl.UNSIGNED_BYTE);
        const polygonIndices16 = createTextureForIndices(buffer.indices16Bits, buffer.lenIndices16Bits, gl.UNSIGNED_SHORT);
        const polygonIndices32 = createTextureForIndices(buffer.indices32Bits, buffer.lenIndices32Bits, gl.UNSIGNED_INT);

        const bindCommonTextures = function(
            program,
            objectDecodeMatricesShaderName,
            vertexTextureShaderName,
            objectAttributesTextureShaderName,
            objectMatricesShaderName
        ) {
            program.bindTexture(objectDecodeMatricesShaderName, texturePerObjectPositionsDecodeMatrix, 1);
            program.bindTexture(vertexTextureShaderName, texturePerVertexIdCoordinates, 2);
            program.bindTexture(objectAttributesTextureShaderName, texturePerObjectColorsAndFlags, 3);
            program.bindTexture(objectMatricesShaderName, texturePerObjectInstanceMatrices, 4);
        };

        this.drawTriangles = function(
            program,
            uTexturePerObjectPositionsDecodeMatrix,
            uTexturePerVertexIdCoordinates,
            uTexturePerObjectColorsAndFlags,
            uTexturePerObjectMatrix,
            uTexturePerPrimitiveIdPortionIds,
            uTexturePerPrimitiveIdIndices,
            glMode)
        {
            bindCommonTextures(
                program,
                uTexturePerObjectPositionsDecodeMatrix,
                uTexturePerVertexIdCoordinates,
                uTexturePerObjectColorsAndFlags,
                uTexturePerObjectMatrix);

            const draw = (cnt, portionIdsTexture, indicesTexture) => {
                if (cnt > 0) {
                    program.bindTexture(uTexturePerPrimitiveIdPortionIds, portionIdsTexture, 5); // webgl texture unit
                    program.bindTexture(uTexturePerPrimitiveIdIndices, indicesTexture, 6); // webgl texture unit
                    gl.drawArrays(glMode, 0, cnt);
                }
            };

            draw(state.numIndices8Bits,  polygonPortionIds8,  polygonIndices8);
            draw(state.numIndices16Bits, polygonPortionIds16, polygonIndices16);
            draw(state.numIndices32Bits, polygonPortionIds32, polygonIndices32);
        };

        const edgeDrawer = function(edges, type) {
            const portionIds = edges.perNumberPortionIds;
            const cnt = portionIds.num;
            const indices = edges.indicesData;

            // Texture that holds the PortionId that corresponds to a given edge-id.
            const portionIdsTexture = createTextureForPackedPortionIds(portionIds.buf);

            // Texture that holds the unique-vertex-indices for 8-bit based edge indices.
            const lenIndices = indices.len;
            const indicesTexture = (lenIndices > 0) && createTextureForSingleItems(indices.buf, lenIndices, 2, type, "sizeDataTextureEdgeIndices");

            return function(program, uTexturePerPrimitiveIdPortionIds, uTexturePerPrimitiveIdIndices, glMode) {
                if (cnt > 0) {
                    program.bindTexture(uTexturePerPrimitiveIdPortionIds, portionIdsTexture, 5); // webgl texture unit
                    program.bindTexture(uTexturePerPrimitiveIdIndices,    indicesTexture,    6); // webgl texture unit
                    gl.drawArrays(glMode, 0, cnt);
                }
            };
        };

        const drawEdges8  = edgeDrawer(buffer.edges8Bits,  gl.UNSIGNED_BYTE);
        const drawEdges16 = edgeDrawer(buffer.edges16Bits, gl.UNSIGNED_SHORT);
        const drawEdges32 = edgeDrawer(buffer.edges32Bits, gl.UNSIGNED_INT);

        this.drawEdges = function(
            program,
            uTexturePerObjectPositionsDecodeMatrix,
            uTexturePerVertexIdCoordinates,
            uTexturePerObjectColorsAndFlags,
            uTexturePerObjectMatrix,
            uTexturePerPrimitiveIdPortionIds,
            uTexturePerPrimitiveIdIndices,
            glMode)
        {
            bindCommonTextures(
                program,
                uTexturePerObjectPositionsDecodeMatrix,
                uTexturePerVertexIdCoordinates,
                uTexturePerObjectColorsAndFlags,
                uTexturePerObjectMatrix);

            drawEdges8( program, uTexturePerPrimitiveIdPortionIds, uTexturePerPrimitiveIdIndices, glMode);
            drawEdges16(program, uTexturePerPrimitiveIdPortionIds, uTexturePerPrimitiveIdIndices, glMode);
            drawEdges32(program, uTexturePerPrimitiveIdPortionIds, uTexturePerPrimitiveIdIndices, glMode);
        };

        // Free up memory
        this._buffer = null;
        this._bucketGeometries = {};
        this._finalized = true;
        this._deferredSetFlagsDirty = false; //

        this._onSceneRendering = this.model.scene.on("rendering", () => {
            if (this._deferredSetFlagsDirty) {
                this._uploadDeferredFlags();
            }
            this._numUpdatesInFrame = 0;
        });
        this._surfaceHasNormals = true;
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
            this._state.textureState.texturePerObjectColorsAndFlagsData.reloadData();
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
        this._state.textureState.texturePerObjectColorsAndFlagsData.setData(data, subPortionId, offset, !defer);
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
            this._state.textureState.texturePerObjectInstanceMatricesData.setData(tempMat4a, subPortionIds[i], 0, !defer);
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
                    math.addVec3(this._state.origin, worldPos, worldPos);
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
        const state = this._state;
        if (state.metallicRoughnessBuf) {
            state.metallicRoughnessBuf.destroy();
            state.metallicRoughnessBuf = null;
        }
        this.model.scene.off(this._onSceneRendering);
        state.destroy();
        this._destroyed = true;
    }
}
