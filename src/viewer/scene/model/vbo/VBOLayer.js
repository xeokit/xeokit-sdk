import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {makeVBORenderingAttributes} from "./VBORenderer.js";
import {getRenderers, Layer} from "../layer/Layer.js";

import {math} from "../../math/math.js";
import {RenderState} from "../../webgl/RenderState.js";
import {ArrayBuf} from "../../webgl/ArrayBuf.js";
import {quantizePositions, transformAndOctEncodeNormals} from "../compression.js";
import {geometryCompressionUtils} from "../../math/geometryCompressionUtils.js";

const tempFloat32 = new Float32Array(1);
const tempFloat32Vec4 = new Float32Array(4);
const tempVec3fa = new Float32Array(3);
const tempMat4 = math.mat4();
const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4();

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempVec3g = math.vec3();

const tempUint8Array4 = new Uint8Array(4);

// fills the whole dst array with src copies
const fillArray = function(dst, src) {
    dst.set(src);
    let soFar = src.length;
    const allDataLen = dst.length;
    while (soFar < allDataLen) {
        const toCopy = Math.min(soFar, allDataLen - soFar);
        dst.set(dst.subarray(0, toCopy), soFar);
        soFar += toCopy;
    }
};

const scratchMemory = (function() {
    /**
     * Provides scratch memory for methods like TrianglesBatchingLayer setFlags() and setColors(),
     * so they don't need to allocate temporary arrays that need garbage collection.
     */
    let cnt = 0;
    const arrays = new Map();
    return {
        acquire: () => cnt++,
        release: () => {
            cnt--;
            if (cnt === 0) {
                arrays.clear();
            }
        },
        getTypeArray: function(type, len) {
            if (! arrays.has(type)) {
                arrays.set(type, { });
            }
            const typeArrays = arrays.get(type);
            if (! (len in typeArrays)) {
                typeArrays[len] = new type(len);
            }
            return typeArrays[len];
        }
    };
})();

/**
 * @private
 */
export class VBOLayer extends Layer {

    /**
     * @param cfg
     * @param cfg.model
     * @param cfg.origin
     * @param cfg.layerIndex
     * @param cfg.textureSet
     * @param cfg.primitive
     *
     * batching:
     * @param cfg.positionsDecodeMatrix
     * @param cfg.uvDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     *
     * instancing:
     * @param cfg.geometry
     */
    constructor(instancing, cfg) {

        super();

        /**
         * Owner model
         * @type {VBOSceneModel}
         */
        this.model = cfg.model;

        /**
         * Index of this Layer in {@link VBOSceneModel#_layerList}.
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        /**
         * The type of primitives in this layer.
         */
        this.primitive = cfg.primitive;

        /**
         * When true, this layer contains solid triangle meshes, otherwise this layer contains surface triangle meshes
         * @type {boolean}
         */
        this.solid = (this.primitive === "solid");

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = (((this.primitive === "points") ? "Points" : ((this.primitive === "lines") ? "Lines" : "Triangles"))
                       + (instancing ? "Instancing" : "Batching") + "Layer" +
                       (((this.primitive !== "points") && (this.primitive !== "lines"))
                        ? ((this.solid ? "-solid" : "-surface")
                           + "-autoNormals"
                           + (instancing
                              ? ""
                              // TODO: These two parts need to be IDs (ie. unique):
                              : ((cfg.textureSet && cfg.textureSet.colorTexture ? "-colorTexture" : "")
                                 +
                                 (cfg.textureSet && cfg.textureSet.metallicRoughnessTexture ? "-metallicRoughnessTexture" : ""))))
                        : ""));

        const scene = cfg.model.scene;
        this._renderers = getRenderers(scene, instancing ? "instancing" : "batching", this.primitive, true,
                                       subGeometry => makeVBORenderingAttributes(scene, instancing, this.primitive, subGeometry));

        this._hasEdges = this._renderers.edgesRenderers;
        this._edgesColorOpaqueAllowed = () => true;

        this._instancing = instancing;

        this._maxVerts = cfg.maxGeometryBatchSize;

        const attribute = function() {
            let length = 0;
            const portions = [ ];

            return {
                length: () => length,
                append: function(data, times = 1, denormalizeScale = 1.0, increment = 0.0) {
                    length += times * data.length;
                    portions.push({ data: data, times: times, denormalizeScale: denormalizeScale, increment: increment });
                },
                compileBuffer: function(type) {
                    let len = 0;
                    portions.forEach(p => { len += p.times * p.data.length; });
                    const buf = new type(len);

                    let begin = 0;
                    portions.forEach(p => {
                        const data = p.data;
                        const dScale = p.denormalizeScale;
                        const increment = p.increment;
                        const subBuf = buf.subarray(begin);

                        if ((dScale === 1.0) && (increment === 0.0)) {
                            subBuf.set(data);
                        } else {
                            for (let i = 0; i < data.length; ++i) {
                                subBuf[i] = increment + data[i] * dScale;
                            }
                        }

                        let soFar = data.length;
                        const allDataLen = p.times * data.length;
                        while (soFar < allDataLen) {
                            const toCopy = Math.min(soFar, allDataLen - soFar);
                            subBuf.set(subBuf.subarray(0, toCopy), soFar);
                            soFar += toCopy;
                        }

                        begin += soFar;
                    });

                    return buf;
                }
            };
        };

        this._buffer = {
            colors:            attribute(), // in instancing used only for non-points
            metallicRoughness: attribute(), // used for triangulated
            pickColors:        attribute(), // used for non-lines
            ...(instancing
                ? {
                    // Modeling matrix per instance, array for each column
                    modelMatrixCol0:       attribute(),
                    modelMatrixCol1:       attribute(),
                    modelMatrixCol2:       attribute(),
                    modelNormalMatrixCol0: attribute(), // used for triangulated
                    modelNormalMatrixCol1: attribute(), // used for triangulated
                    modelNormalMatrixCol2: attribute(), // used for triangulated
                }
                : {
                    positions:             attribute(),
                    indices:               attribute(), // used for non-points
                    uv:                    attribute(), // used for triangulated
                    normals:               attribute(), // used for triangulated
                    edgeIndices:           attribute(), // used for triangulated
                })
        };

        const positionsDecodeMatrix = instancing ? cfg.geometry.positionsDecodeMatrix : cfg.positionsDecodeMatrix;

        this._state = new RenderState({
            origin: cfg.origin && math.vec3(cfg.origin),
            positionsBuf: null,
            colorsBuf: null,
            offsetsBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: positionsDecodeMatrix && math.mat4(positionsDecodeMatrix),
            metallicRoughnessBuf: null,
            pickColorsBuf: null,
            textureSet: cfg.textureSet,
            pbrSupported: false, // Set in #finalize if we have enough to support quality rendering
            ...(instancing
                ? {
                    obb: math.OBB3(),
                    numInstances: 0,
                    geometry: cfg.geometry,
                    modelMatrixCol0Buf: null,
                    modelMatrixCol1Buf: null,
                    modelMatrixCol2Buf: null,
                    modelNormalMatrixCol0Buf: null,
                    modelNormalMatrixCol1Buf: null,
                    modelNormalMatrixCol2Buf: null,
                }
                : {
                    indicesBuf: null,
                    uvBuf: null,
                    normalsBuf: null,
                    edgeIndicesBuf: null,
                    uvDecodeMatrix: cfg.uvDecodeMatrix && math.mat3(cfg.uvDecodeMatrix),
                })
        });

        // These counts are used to avoid unnecessary render passes
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        if (this._hasEdges) {
            this._numEdgesLayerPortions = 0;
        }
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._modelAABB = (! instancing) && math.collapseAABB3(); // Model-space AABB
        this._portions = [];
        this._finalized = false;
        scratchMemory.acquire();
    }

    /**
     * Tests if there is room for another portion in this Layer.
     *
     * @param lenPositions Number of positions we'd like to create in the portion.
     * @param lenIndices Number of indices we'd like to create in this portion.
     * @returns {Boolean} True if OK to create another portion.
     */
    canCreatePortion(lenPositions, lenIndices) {
        if (this._finalized) {
            throw "Already finalized";
        }
        return this._instancing || (((this._buffer.positions.length() + lenPositions) <= (this._maxVerts * 3)) && ((this._buffer.indices.length() + lenIndices) <= (this._maxVerts * 3)));
    }

    /**
     * Creates a new portion within this Layer, returns the new portion ID.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg Portion params
     * @param cfg.metallic Metalness factor [0..255] (triangulated)
     * @param cfg.roughness Roughness factor [0..255] (triangulated)
     * @param cfg.pickColor Quantized pick color (non-lines)
     * @param cfg.meshMatrix Flat float 4x4 matrix (optional in batching)
     * batching:
     * @param cfg.positionsCompressed Flat quantized positions array - decompressed with positionsDecodeMatrix
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.indices  Flat int indices array.
     * @param [cfg.normalsCompressed]
     * @param [cfg.normals] Flat float normals array (triangulated)
     * @param [cfg.colors] Flat float colors array (non-lines)
     * @param [cfg.colorsCompressed] Quantized RGB colors [0..255,0..255,0..255,0..255] (non-lines)
     * @param cfg.color Float RGB color [0..1,0..1,0..1] (points) or Quantized RGB color [0..255,0..255,0..255,0..255] (non-points)
     * @param cfg.opacity Opacity [0..255] (non-points)
     * @param [cfg.uv] Flat UVs array (triangulated)
     * @param [cfg.uvCompressed] (triangulated)
     * @param [cfg.edgeIndices] Flat int edges indices array (triangulated)
     * @param cfg.aabb Flat float AABB World-space AABB
     * instancing:
     * @param cfg.color Color [0..255,0..255,0..255]
     * @param cfg.opacity Opacity [0..255].
     * @returns {number} Portion ID
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;
        const meshMatrix = cfg.meshMatrix;
        const portionId = this._portions.length;

        const appendPortion = (portionBase, portionSize, indices, quantizedPositions, meshMatrix) => {
            const portion = {
                portionBase: portionBase,
                portionSize: portionSize,
                retainedGeometry: this.model.scene.readableGeometryEnabled && (this.primitive !== "points") && (this.primitive !== "lines") && {
                    indices:            indices,
                    quantizedPositions: quantizedPositions,
                    offset:             this.model.scene.entityOffsetsEnabled && math.vec3(),
                    matrix:             meshMatrix && meshMatrix.slice(),
                    inverseMatrix:      null, // Lazy-computed for instancing in precisionRayPickSurface
                    normalMatrix:       null, // Lazy-computed for instancing in precisionRayPickSurface
                }
            };

            if ((this.primitive !== "points") && (this.primitive !== "lines")) {
                buffer.metallicRoughness.append([ cfg.metallic ?? 0, cfg.roughness ?? 255 ], portionSize);
            }

            if (this.primitive !== "lines") {
                buffer.pickColors.append(cfg.pickColor.slice(0, 4), portionSize);
            }

            this._portions.push(portion);
            this.model.numPortions++;
            this._meshes.push(mesh);
            return portionId;
        };

        if (this._instancing) {
            const geometry = this._state.geometry;

            buffer.modelMatrixCol0.append([ meshMatrix[0], meshMatrix[4], meshMatrix[8], meshMatrix[12] ]);
            buffer.modelMatrixCol1.append([ meshMatrix[1], meshMatrix[5], meshMatrix[9], meshMatrix[13] ]);
            buffer.modelMatrixCol2.append([ meshMatrix[2], meshMatrix[6], meshMatrix[10], meshMatrix[14] ]);

            if (this.primitive !== "points") {
                const color = cfg.color; // Color is pre-quantized by SceneModel
                buffer.colors.append([ color[0], color[1], color[2], cfg.opacity ?? 255 ]);
            }

            if ((this.primitive !== "points") && (this.primitive !== "lines")) {
                if (geometry.normals) {
                    // Note: order of inverse and transpose doesn't matter
                    const normalMatrix = math.inverseMat4(math.transposeMat4(meshMatrix, math.mat4()));
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[0], normalMatrix[4], normalMatrix[8], normalMatrix[12] ]);
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[1], normalMatrix[5], normalMatrix[9], normalMatrix[13] ]);
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[2], normalMatrix[6], normalMatrix[10], normalMatrix[14] ]);
                }
            }

            this._state.numInstances++;

            return appendPortion(portionId, 1, geometry.indices, geometry.positionsCompressed, meshMatrix);
        } else {
            const vertsBaseIndex = this._buffer.positions.length() / 3;

            const useCompressed = this._state.positionsDecodeMatrix;
            const positions = useCompressed ? cfg.positionsCompressed : cfg.positions;
            if (! positions) {
                throw ((useCompressed ? "positionsCompressed" : "positions") + " expected");
            }

            buffer.positions.append(positions);

            const numVerts = positions.length / 3;

            const indices = cfg.indices;
            if (indices) {
                buffer.indices.append(indices, 1, 1.0, vertsBaseIndex);
            }

            const normalsCompressed = cfg.normalsCompressed;
            const normals = cfg.normals;
            if (normalsCompressed && normalsCompressed.length > 0) {
                buffer.normals.append(normalsCompressed);
            } else if (normals && normals.length > 0) {
                const worldNormalMatrix = tempMat4;
                if (meshMatrix) {
                    math.transposeMat4(meshMatrix, worldNormalMatrix);
                    math.inverseMat4(worldNormalMatrix, worldNormalMatrix); // Note: order of inverse and transpose doesn't matter
                } else {
                    math.identityMat4(worldNormalMatrix);
                }
                const normalsData = [ ];
                transformAndOctEncodeNormals(worldNormalMatrix, normals, normals.length, normalsData, 0);
                buffer.normals.append(normalsData);
            }

            const colors = cfg.colors;
            const colorsCompressed = cfg.colorsCompressed;
            const color = cfg.color;
            if (colors) {
                if (this.primitive === "points") {
                    buffer.colors.append(colors, 1, 255.0);
                } else {            // triangulated
                    const colorsData = [ ];
                    for (let i = 0, len = colors.length; i < len; i += 3) {
                        colorsData.push(colors[i] * 255);
                        colorsData.push(colors[i + 1] * 255);
                        colorsData.push(colors[i + 2] * 255);
                        colorsData.push(255);
                    }
                    buffer.colors.append(colorsData);
                }
            } else if (colorsCompressed) {
                if (this.primitive === "points") {
                    buffer.colors.append(colorsCompressed);
                } else {            // triangulated
                    const colorsData = [ ];
                    for (let i = 0, len = colorsCompressed.length; i < len; i += 3) {
                        colorsData.push(colorsCompressed[i]);
                        colorsData.push(colorsCompressed[i + 1]);
                        colorsData.push(colorsCompressed[i + 2]);
                        colorsData.push(255);
                    }
                    buffer.colors.append(colorsData);
                }
            } else if (color) {
                // Color is pre-quantized by VBOSceneModel
                buffer.colors.append([ color[0], color[1], color[2], (this.primitive === "points") ? 1.0 : cfg.opacity ], numVerts);
            }

            const nonEmpty = v => v && (v.length > 0) && v;
            const uv = nonEmpty(cfg.uv) || nonEmpty(cfg.uvCompressed);
            if (uv) {
                buffer.uv.append(uv);
            }

            const edgeIndices = cfg.edgeIndices;
            if (edgeIndices) {
                buffer.edgeIndices.append(edgeIndices, 1, 1.0, vertsBaseIndex);
            }

            math.expandAABB3(this._modelAABB, cfg.aabb);

            // quantizedPositions are initialized in finalize()
            return appendPortion(vertsBaseIndex, numVerts, indices);
        }
    }

    finalize() {

        if (this._finalized) {
            throw "Already finalized";
        }

        const state = this._state;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;
        const maybeCreateGlBuffer = (target, srcData, size, usage, normalized = false) => (srcData.length > 0) ? new ArrayBuf(gl, target, srcData, srcData.length, size, usage, normalized) : null;

        this._attributesCnt = this._portions.reduce((acc,p) => acc + p.portionSize, 0);

        state.flagsBuf       = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._attributesCnt), 1, gl.DYNAMIC_DRAW);

        state.colorsBuf      = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.colors.compileBuffer(Uint8Array), 4, gl.DYNAMIC_DRAW);

        state.offsetsBuf     = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._attributesCnt * 3), 3, gl.DYNAMIC_DRAW) : null;

        state.metallicRoughnessBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.metallicRoughness.compileBuffer(Uint8Array), 2, gl.STATIC_DRAW);

        state.pickColorsBuf  = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        if (this._instancing) {
            const geometry = state.geometry;
            state.edgeIndicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.edgeIndices), 1, gl.STATIC_DRAW);

            state.modelMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);

            if (geometry.positionsCompressed) {
                state.positionsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, geometry.positionsCompressed, 3, gl.STATIC_DRAW);
            }
            if ((this.primitive !== "points") && geometry.indices) {
                state.indicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), 1, gl.STATIC_DRAW);
            }
            // if ((this.primitive !== "points") && (this.primitive !== "lines") && geometry.normalsCompressed && geometry.normalsCompressed.length > 0) {
            //     const normalized = true; // For oct-encoded UInt8
            //     state.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, geometry.normalsCompressed, geometry.normalsCompressed.length, 3, gl.STATIC_DRAW, normalized);
            // }
            if (geometry.colorsCompressed) {
                // WARNING: colorsBuf might be already assigned above
                state.colorsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Uint8Array(geometry.colorsCompressed), 4, gl.STATIC_DRAW);
                state.colorsForPointsNotInstancing = (this.primitive === "points");
            }
            if ((this.primitive !== "points") && (this.primitive !== "lines") && geometry.uvCompressed) {
                state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, geometry.uvCompressed, 2, gl.STATIC_DRAW);
                state.uvDecodeMatrix = geometry.uvDecodeMatrix;
            }

            if (state.modelMatrixCol0Buf && state.normalsBuf) { // WARNING: normalsBuf is never defined at the moment
                state.modelNormalMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
                state.modelNormalMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
                state.modelNormalMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            }
        } else {
            state.edgeIndicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.edgeIndices.compileBuffer(Uint32Array), 1, gl.STATIC_DRAW);

            const positions = (state.positionsDecodeMatrix
                               ? buffer.positions.compileBuffer(Uint16Array)
                               : (quantizePositions(buffer.positions.compileBuffer(Float64Array), this._modelAABB, state.positionsDecodeMatrix = math.mat4())));
            state.positionsBuf  = maybeCreateGlBuffer(gl.ARRAY_BUFFER, positions, 3, gl.STATIC_DRAW);

            for (let i = 0, numPortions = this._portions.length; i < numPortions; i++) {
                const portion = this._portions[i];
                if (portion.retainedGeometry) {
                    const start = portion.portionBase * 3;
                    const end = start + (portion.portionSize * 3);
                    portion.retainedGeometry.quantizedPositions = positions.subarray(start, end);
                }
            }

            state.indicesBuf    = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices.compileBuffer(Uint32Array), 1, gl.STATIC_DRAW);

            // Normals are already oct-encoded, so `normalized = true` for oct encoded UInts
            state.normalsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.normals.compileBuffer(Int8Array), 3, gl.STATIC_DRAW, true);

            const uvs = buffer.uv.compileBuffer(Float32Array);
            if (uvs.length > 0) {
                if (state.uvDecodeMatrix) {
                    state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, uvs, 2, gl.STATIC_DRAW);
                } else {
                    const bounds = geometryCompressionUtils.getUVBounds(uvs);
                    const result = geometryCompressionUtils.compressUVs(uvs, bounds.min, bounds.max);
                    const uv = result.quantized;
                    state.uvDecodeMatrix = math.mat3(result.decodeMatrix);
                    state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, result.quantized, 2, gl.STATIC_DRAW);
                }
            }
        }

        const textureSet = state.textureSet;
        state.pbrSupported
            = !!state.metallicRoughnessBuf
            && !!state.uvBuf
            && !!state.normalsBuf
            && !!textureSet
            && !!textureSet.colorTexture
            && !!textureSet.metallicRoughnessTexture;

        state.colorTextureSupported
            = !!state.uvBuf
            && !!textureSet
            && !!textureSet.colorTexture;

        this._surfaceHasNormals = !!state.normalsBuf;
        state.geometry = null;
        this._buffer = null;
        this._finalized = true;
    }

    _setClippableFlags(portionId, flags) {
        this._setFlags(portionId, flags);
    }

    setColor(portionId, color) { // RGBA color is normalized as ints
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (this._state.colorsBuf) {
            const portion = this._portions[portionId];
            const tempArray = scratchMemory.getTypeArray(Uint8Array, portion.portionSize * 4);
            // alpha used to be unset for points, so effectively random (from last use)
            fillArray(tempArray, color.slice(0, 4));
            this._state.colorsBuf.setData(tempArray, portion.portionBase * 4);
        }
    }

    /**
     * flags are 4bits values encoded on a 32bit base. color flag on the first 4 bits, silhouette flag on the next 4 bits and so on for edge, pick and clippable.
     */
    _setFlags(portionId, flags, transparent, deferred = false) {
        if (!this._finalized) {
            throw "Not finalized";
        }

        this._getColSilhEdgePickFlags(flags, transparent, tempUint8Array4);

        const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 1 : 0;

        let vertFlag = 0;
        vertFlag |= tempUint8Array4[0];
        vertFlag |= tempUint8Array4[1] << 4;
        vertFlag |= tempUint8Array4[2] << 8;
        vertFlag |= tempUint8Array4[3] << 12;
        vertFlag |= clippableFlag << 16;

        tempFloat32[0] = vertFlag;

        const portion   = this._portions[portionId];
        const firstFlag = portion.portionBase;
        const lenFlags  = portion.portionSize;

        if (deferred) {
            // Avoid zillions of individual WebGL bufferSubData calls - buffer them to apply in one shot
            if (!this._deferredFlagValues) {
                this._deferredFlagValues = new Float32Array(this._attributesCnt);
            }
            fillArray(this._deferredFlagValues.subarray(firstFlag, firstFlag + lenFlags), tempFloat32);
        } else if (this._state.flagsBuf) {
            const tempArray = scratchMemory.getTypeArray(Float32Array, lenFlags);
            fillArray(tempArray, tempFloat32);
            this._state.flagsBuf.setData(tempArray, firstFlag);
        }
    }

    _setDeferredFlags() {
        if (this._deferredFlagValues) {
            this._state.flagsBuf.setData(this._deferredFlagValues);
            this._deferredFlagValues = null;
        }
    }

    _setFlags2(portionId, flags, deferred) {
    }

    setOffset(portionId, offset) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (!this.model.scene.entityOffsetsEnabled) {
            this.model.error("Entity#offset not enabled for this Viewer"); // See Viewer entityOffsetsEnabled
            return;
        }
        const portion = this._portions[portionId];
        if (this._state.offsetsBuf) {
            tempVec3fa.set(offset);
            const tempArray = scratchMemory.getTypeArray(Float32Array, portion.portionSize * 3);
            fillArray(tempArray, tempVec3fa);
            this._state.offsetsBuf.setData(tempArray, portion.portionBase * 3);
        }
        if (portion.retainedGeometry) {
            portion.retainedGeometry.offset.set(offset);
        }
    }

    setMatrix(portionId, matrix) {
        if (! this._state.modelMatrixCol0Buf) {
            return;
        }

        ////////////////////////////////////////
        // TODO: Update portion matrix
        ////////////////////////////////////////

        if (!this._finalized) {
            throw "Not finalized";
        }

        const offset = portionId * 4;

        tempFloat32Vec4[0] = matrix[0];
        tempFloat32Vec4[1] = matrix[4];
        tempFloat32Vec4[2] = matrix[8];
        tempFloat32Vec4[3] = matrix[12];

        this._state.modelMatrixCol0Buf.setData(tempFloat32Vec4, offset);

        tempFloat32Vec4[0] = matrix[1];
        tempFloat32Vec4[1] = matrix[5];
        tempFloat32Vec4[2] = matrix[9];
        tempFloat32Vec4[3] = matrix[13];

        this._state.modelMatrixCol1Buf.setData(tempFloat32Vec4, offset);

        tempFloat32Vec4[0] = matrix[2];
        tempFloat32Vec4[1] = matrix[6];
        tempFloat32Vec4[2] = matrix[10];
        tempFloat32Vec4[3] = matrix[14];

        this._state.modelMatrixCol2Buf.setData(tempFloat32Vec4, offset);
    }

    //------------------------------------------------------------------------------------------------

    getEachVertex(portionId, callback) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return;
        }

        const retainedGeometry = portion.retainedGeometry;
        if (!retainedGeometry) {
            return;
        }
        const state = this._state;
        const origin = tempVec4b;
        if (state.origin) {
            origin.set(state.origin, 0);
        } else {
            origin[0] = origin[1] = origin[2] = 0;
        }
        origin[3] = 1;
        const sceneModelMatrix = this.model.matrix;
        math.mulMat4v4(sceneModelMatrix, origin, origin);
        const positions = retainedGeometry.quantizedPositions;
        const positionsDecodeMatrix = state.positionsDecodeMatrix;
        const worldPos = tempVec4a;
        for (let i = 0, len = positions.length; i < len; i += 3) {
            worldPos[0] = positions[i];
            worldPos[1] = positions[i + 1];
            worldPos[2] = positions[i + 2];
            math.decompressPosition(worldPos, positionsDecodeMatrix);
            if (retainedGeometry.matrix) {
                math.transformPoint3(retainedGeometry.matrix, worldPos, worldPos);
            }
            worldPos[3] = 1;
            math.mulMat4v4(sceneModelMatrix, worldPos, worldPos);
            math.addVec3(origin, worldPos, worldPos);
            callback(worldPos);
        }
    }

    getEachIndex(portionId, callback) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
        } else if (portion.retainedGeometry) {
            portion.retainedGeometry.indices.forEach(i => callback(i));
        }
    }

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return false;
        }

        const retainedGeometry = portion.retainedGeometry;
        if (!retainedGeometry) {
            return false;
        }

        const state = this._state;

        if (retainedGeometry.matrix && (! retainedGeometry.inverseMatrix)) {
            retainedGeometry.inverseMatrix = math.inverseMat4(retainedGeometry.matrix, math.mat4());
        }

        if (worldNormal && retainedGeometry.inverseMatrix && (! retainedGeometry.normalMatrix)) {
            retainedGeometry.normalMatrix = math.transposeMat4(retainedGeometry.inverseMatrix, math.mat4());
        }

        const origin    = state.origin;
        const positions = retainedGeometry.quantizedPositions;
        const indices   = retainedGeometry.indices;
        const offset    = retainedGeometry.offset;

        const rtcRayOrigin = tempVec3a;
        const rtcRayDir = tempVec3b;

        rtcRayOrigin.set(origin ? math.subVec3(worldRayOrigin, origin, tempVec3c) : worldRayOrigin);  // World -> RTC
        rtcRayDir.set(worldRayDir);

        if (offset) {
            math.subVec3(rtcRayOrigin, offset);
        }

        math.transformRay(this.model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir); // RTC -> local

        if (retainedGeometry.inverseMatrix) {
            math.transformRay(retainedGeometry.inverseMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);
        }

        const a = tempVec3d;
        const b = tempVec3e;
        const c = tempVec3f;

        let gotIntersect = false;
        let closestDist = 0;
        const closestIntersectPos = tempVec3g;

        for (let i = 0, len = indices.length; i < len; i += 3) {

            const ia = indices[i] * 3;
            const ib = indices[i + 1] * 3;
            const ic = indices[i + 2] * 3;

            a[0] = positions[ia];
            a[1] = positions[ia + 1];
            a[2] = positions[ia + 2];

            b[0] = positions[ib];
            b[1] = positions[ib + 1];
            b[2] = positions[ib + 2];

            c[0] = positions[ic];
            c[1] = positions[ic + 1];
            c[2] = positions[ic + 2];

            const positionsDecodeMatrix = state.positionsDecodeMatrix;

            math.decompressPosition(a, positionsDecodeMatrix);
            math.decompressPosition(b, positionsDecodeMatrix);
            math.decompressPosition(c, positionsDecodeMatrix);

            if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, closestIntersectPos)) {

                if (retainedGeometry.matrix) {
                    math.transformPoint3(retainedGeometry.matrix, closestIntersectPos, closestIntersectPos);
                }

                math.transformPoint3(this.model.worldMatrix, closestIntersectPos, closestIntersectPos);

                if (offset) {
                    math.addVec3(closestIntersectPos, offset);
                }

                if (origin) {
                    math.addVec3(closestIntersectPos, origin);
                }

                const dist = Math.abs(math.lenVec3(math.subVec3(closestIntersectPos, worldRayOrigin, [])));

                if (!gotIntersect || dist > closestDist) {
                    closestDist = dist;
                    worldSurfacePos.set(closestIntersectPos);
                    if (worldNormal) { // Not that wasteful to eagerly compute - unlikely to hit >2 surfaces on most geometry
                        math.triangleNormal(a, b, c, worldNormal);
                    }
                    gotIntersect = true;
                }
            }
        }

        if (gotIntersect && worldNormal) {
            if (retainedGeometry.normalMatrix) {
                math.transformVec3(retainedGeometry.normalMatrix, worldNormal, worldNormal);
            }
            math.transformVec3(this.model.worldNormalMatrix, worldNormal, worldNormal);
            math.normalizeVec3(worldNormal);
        }

        return gotIntersect;
    }

    destroy() {
        scratchMemory.release();

        const state = this._state;
        if (state.positionsBuf) {
            state.positionsBuf.destroy();
            state.positionsBuf = null;
        }
        if (state.offsetsBuf) {
            state.offsetsBuf.destroy();
            state.offsetsBuf = null;
        }
        if (state.colorsBuf) {
            state.colorsBuf.destroy();
            state.colorsBuf = null;
        }
        if (state.flagsBuf) {
            state.flagsBuf.destroy();
            state.flagsBuf = null;
        }
        if (state.metallicRoughnessBuf) {
            state.metallicRoughnessBuf.destroy();
            state.metallicRoughnessBuf = null;
        }
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        if (state.indicesBuf) {
            state.indicesBuf.destroy();
            state.indicesBuf = null;
        }
        if (state.normalsBuf) {
            state.normalsBuf.destroy();
            state.normalsBuf = null;
        }
        if (state.edgeIndicesBuf) {
            state.edgeIndicesBuf.destroy();
            state.edgeIndicessBuf = null;
        }
        if (state.modelMatrixCol0Buf) {
            state.modelMatrixCol0Buf.destroy();
            state.modelMatrixCol0Buf = null;
        }
        if (state.modelMatrixCol1Buf) {
            state.modelMatrixCol1Buf.destroy();
            state.modelMatrixCol1Buf = null;
        }
        if (state.modelMatrixCol2Buf) {
            state.modelMatrixCol2Buf.destroy();
            state.modelMatrixCol2Buf = null;
        }
        if (state.modelNormalMatrixCol0Buf) {
            state.modelNormalMatrixCol0Buf.destroy();
            state.modelNormalMatrixCol0Buf = null;
        }
        if (state.modelNormalMatrixCol1Buf) {
            state.modelNormalMatrixCol1Buf.destroy();
            state.modelNormalMatrixCol1Buf = null;
        }
        if (state.modelNormalMatrixCol2Buf) {
            state.modelNormalMatrixCol2Buf.destroy();
            state.modelNormalMatrixCol2Buf = null;
        }
        state.destroy();
        this._state = null;
    }
}
