import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {getColSilhEdgePickFlags, getRenderers, Layer} from "./Layer.js";

import {math} from "../../math/math.js";
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
const matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

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
     * @param model
     * @param primitive
     * @param origin
     *
     * @param cfg
     * @param cfg.textureSet
     *
     * batching:
     * @param cfg.positionsDecodeMatrix
     * @param cfg.uvDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     *
     * instancing:
     * @param cfg.geometry
     */
    constructor(model, primitive, origin, cfg) {

        super(model, primitive, origin);

        const instancing = !! cfg.geometry;

        this._maxVerts = cfg.maxGeometryBatchSize;

        const positionsDecodeMatrix = instancing ? cfg.geometry.positionsDecodeMatrix : cfg.positionsDecodeMatrix;
        this._positionsDecodeMatrix = positionsDecodeMatrix && math.mat4(positionsDecodeMatrix);

        this._cfgUvDecodeMatrix = cfg.uvDecodeMatrix && math.mat3(cfg.uvDecodeMatrix);
        this._instancedGeometry = cfg.geometry;
        this._textureSet = cfg.textureSet;

        this._modelAABB = (! instancing) && math.collapseAABB3(); // Model-space AABB
        this._portions = [ ];

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
                    modelMatrixCol:       [ attribute(), attribute(), attribute() ],
                    modelNormalMatrixCol: [ attribute(), attribute(), attribute() ]
                }
                : {
                    positions:             attribute(),
                    indices:               attribute(), // used for non-points
                    uv:                    attribute(), // used for triangulated
                    normals:               attribute(), // used for triangulated
                    edgeIndices:           attribute(), // used for triangulated
                })
        };
    }

    /**
     * Tests if there is room for another portion in this Layer.
     *
     * @param lenPositions Number of positions we'd like to create in the portion.
     * @param lenIndices Number of indices we'd like to create in this portion.
     * @returns {Boolean} True if OK to create another portion.
     */
    canCreatePortion(lenPositions, lenIndices) {
        return this._instancedGeometry || (((this._buffer.positions.length() + lenPositions) <= (this._maxVerts * 3)) && ((this._buffer.indices.length() + lenIndices) <= (this._maxVerts * 3)));
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
        const buffer            = this._buffer;
        const instancedGeometry = this._instancedGeometry;
        const model             = this.model;
        const portionId         = this._portions.length;
        const primitive         = this.primitive;
        const useCompressed     = !! this._positionsDecodeMatrix;
        const scene = model.scene;
        const meshMatrix = cfg.meshMatrix;

        const appendPortion = (portionBase, portionSize, indices, quantizedPositions, meshMatrix) => {
            const prevPortion = (this._portions.length > 0) && this._portions[this._portions.length - 1];
            const portion = {
                indicesBaseIndex: prevPortion ? (prevPortion.indicesBaseIndex + prevPortion.numIndices) : 0,
                numIndices: indices ? indices.length : 0,
                portionBase: portionBase,
                portionSize: portionSize,
                retainedGeometry: scene.readableGeometryEnabled && (primitive !== "points") && (primitive !== "lines") && {
                    indices:            indices,
                    quantizedPositions: quantizedPositions,
                    offset:             scene.entityOffsetsEnabled && math.vec3(),
                    matrix:             meshMatrix && meshMatrix.slice(),
                    inverseMatrix:      null, // Lazy-computed for instancing in precisionRayPickSurface
                    normalMatrix:       null, // Lazy-computed for instancing in precisionRayPickSurface
                }
            };

            if ((primitive !== "points") && (primitive !== "lines")) {
                buffer.metallicRoughness.append([ cfg.metallic ?? 0, cfg.roughness ?? 255 ], portionSize);
            }

            if (primitive !== "lines") {
                buffer.pickColors.append(cfg.pickColor.slice(0, 4), portionSize);
            }

            this._portions.push(portion);
            model.numPortions++;
            this._meshes.push(mesh);
            return portionId;
        };

        if (instancedGeometry) {
            buffer.modelMatrixCol.forEach((b, i) => b.append([ meshMatrix[i+0], meshMatrix[i+4], meshMatrix[i+8], meshMatrix[i+12] ]));

            if (primitive !== "points") {
                const color = cfg.color; // Color is pre-quantized by SceneModel
                buffer.colors.append([ color[0], color[1], color[2], cfg.opacity ?? 255 ]);
            }

            if ((primitive !== "points") && (primitive !== "lines")) {
                if (instancedGeometry.normals) {
                    // Note: order of inverse and transpose doesn't matter
                    const normalMatrix = math.inverseMat4(math.transposeMat4(meshMatrix, math.mat4()));
                    buffer.modelNormalMatrixCol.forEach((b, i) => b.append([ normalMatrix[i+0], normalMatrix[i+4], normalMatrix[i+8], normalMatrix[i+12] ]));
                }
            }

            return appendPortion(portionId, 1, instancedGeometry.indices, instancedGeometry.positionsCompressed, meshMatrix);
        } else {
            const vertsBaseIndex = buffer.positions.length() / 3;

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
                if (primitive === "points") {
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
                if (primitive === "points") {
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
                buffer.colors.append([ color[0], color[1], color[2], (primitive === "points") ? 1.0 : cfg.opacity ], numVerts);
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

    compilePortions() {
        const buffer              = this._buffer;
        const instancedGeometry   = this._instancedGeometry;
        const model               = this.model;
        const modelAABB           = this._modelAABB;
        const origin              = this.origin;
        const portions            = this._portions;
        const primitive           = this.primitive;
        const textureSet          = this._textureSet;
        let positionsDecodeMatrix = this._positionsDecodeMatrix;
        const cfgUvDecodeMatrix   = this._cfgUvDecodeMatrix;

        const scene = model.scene;
        const gl = scene.canvas.gl;
        const instancing = !! instancedGeometry;

        const cleanups = [ ];

        const createGlBuffer = (target, srcData, size, usage) => {
            if (srcData.length > 0) {
                const srcDataConstructor = srcData.constructor;
                const [byteSize, type] = ({
                    [Uint8Array]:   [1, gl.UNSIGNED_BYTE],
                    [Int8Array]:    [1, gl.BYTE],
                    [Uint16Array]:  [2, gl.UNSIGNED_SHORT],
                    [Int16Array]:   [2, gl.SHORT],
                    [Uint32Array]:  [4, gl.UNSIGNED_INT],
                    [Int32Array]:   [4, gl.INT],
                    [Float32Array]: [4, gl.FLOAT]
                })[srcDataConstructor];

                const buffer = gl.createBuffer();
                cleanups.push(() => gl.deleteBuffer(buffer));

                const bindBuffer = () => gl.bindBuffer(target, buffer);
                const setData = data => {
                    bindBuffer();
                    gl.bufferData(target, data, usage);
                };
                setData(srcData);

                const bytesPerElement = srcData.BYTES_PER_ELEMENT;
                const numItems = srcData.length / size;
                return {
                    bindBuffer: bindBuffer,
                    getData: (baseIndex = 0, length = numItems - baseIndex) => {
                        bindBuffer();
                        const array = new srcDataConstructor(length * size);
                        gl.getBufferSubData(target, baseIndex * byteSize * size, array, 0, length * size);
                        return array;
                    },
                    numItems: numItems,
                    setData: setData,
                    setSubData: (data, offset) => {
                        bindBuffer();
                        gl.bufferSubData(target, offset * bytesPerElement, data);
                    },
                    type: type
                };
            } else {
                return null;
            }
        };

        const maybeCreateBuffer = (srcData, size, usage, setDivisor = false, normalized = false) => {
            const buf = createGlBuffer(gl.ARRAY_BUFFER, srcData, size, usage);
            return buf && {
                getData: buf.getData,
                numItems: buf.numItems,
                setData: buf.setData,
                setSubData: buf.setSubData,
                attributeDivisor: setDivisor && 1,
                bindAtLocation: location => {
                    buf.bindBuffer();
                    gl.vertexAttribPointer(location, size, buf.type, !!normalized, 0, 0);
                }
            };
        };

        const maybeCreateIndicesBuffer = srcData => {
            const buf = createGlBuffer(gl.ELEMENT_ARRAY_BUFFER, srcData, 1, gl.STATIC_DRAW);
            return buf && {
                getData: buf.getData,
                bindIndicesBuffer: buf.bindBuffer,
                indicesCount: srcData.length,
                indicesType: buf.type
            };
        };

        const attributesCnt = portions.reduce((acc,p) => acc + p.portionSize, 0);

        const flagsBuf = maybeCreateBuffer(new Float32Array(attributesCnt), 1, gl.DYNAMIC_DRAW, instancing);

        const createColorsBuf = (srcData, usage) => maybeCreateBuffer(srcData, 4, usage, instancing && (primitive !== "points"), true);
        const colorsBuf = ((instancing && instancedGeometry.colorsCompressed)
                           ? createColorsBuf(new Uint8Array(instancedGeometry.colorsCompressed), gl.STATIC_DRAW)
                           : createColorsBuf(buffer.colors.compileBuffer(Uint8Array), gl.DYNAMIC_DRAW));

        const offsetsBuf = scene.entityOffsetsEnabled && maybeCreateBuffer(new Float32Array(attributesCnt * 3), 3, gl.DYNAMIC_DRAW, instancing);

        const metallicRoughnessBuf = maybeCreateBuffer(buffer.metallicRoughness.compileBuffer(Uint8Array), 2, gl.STATIC_DRAW, instancing);

        const pickColorsBuf = maybeCreateBuffer(buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW, instancing);

        const edgeIndicesBuf = maybeCreateIndicesBuffer(instancing
                                                        ? new Uint32Array(instancedGeometry.edgeIndices)
                                                        : buffer.edgeIndices.compileBuffer(Uint32Array));

        const indices = (instancing
                         ? ((primitive !== "points") && instancedGeometry.indices && new Uint32Array(instancedGeometry.indices))
                         : buffer.indices.compileBuffer(Uint32Array));
        const indicesBuf = indices && maybeCreateIndicesBuffer(indices);

        const positions = (instancing
                           ? instancedGeometry.positionsCompressed
                           : (positionsDecodeMatrix
                              ? buffer.positions.compileBuffer(Uint16Array)
                              : (quantizePositions(buffer.positions.compileBuffer(Float64Array), modelAABB, positionsDecodeMatrix = math.mat4()))));
        const positionsBuf = positions && maybeCreateBuffer(positions, 3, gl.STATIC_DRAW);
        if (! instancing) {
            portions.forEach(portion => {
                if (portion.retainedGeometry) {
                    const start = 3 * portion.portionBase;
                    portion.retainedGeometry.quantizedPositions = positions.subarray(start, start + 3 * portion.portionSize);
                }
            });
        }

        const modelMatrixColBufs = instancing && buffer.modelMatrixCol.map(b => maybeCreateBuffer(b.compileBuffer(Float32Array), 4, gl.STATIC_DRAW, true));

        const normals = (instancing
                         ? false // (primitive !== "points") && (primitive !== "lines") && instancedGeometry.normalsCompressed
                         : buffer.normals.compileBuffer(Int8Array));
        // Normals are already oct-encoded, so `normalized = true` for oct encoded UInts
        const normalsBuf = normals && maybeCreateBuffer(normals, 3, gl.STATIC_DRAW, false, true);

        // WARNING: modelMatrixColBufs and normalsBuf are never simultaneously defined at the moment (when instancing=true)
        const modelNormalMatrixColBufs = modelMatrixColBufs && normalsBuf && buffer.modelNormalMatrixCol.map(b => maybeCreateBuffer(b.compileBuffer(Float32Array), 4, gl.STATIC_DRAW, true));

        const uvSetup = (instancing
                         ? ((primitive !== "points") && (primitive !== "lines") && instancedGeometry.uvCompressed && {
                             buf: maybeCreateBuffer(instancedGeometry.uvCompressed, 2, gl.STATIC_DRAW),
                             mat: instancedGeometry.uvDecodeMatrix
                         })
                         : (function() {
                             const uvs = buffer.uv.compileBuffer(Float32Array);
                             if (uvs.length === 0) {
                                 return null;
                             } else if (cfgUvDecodeMatrix) {
                                 return {
                                     buf: maybeCreateBuffer(uvs, 2, gl.STATIC_DRAW),
                                     mat: cfgUvDecodeMatrix
                                 };
                             } else {
                                 const bounds = geometryCompressionUtils.getUVBounds(uvs);
                                 const result = geometryCompressionUtils.compressUVs(uvs, bounds.min, bounds.max);
                                 return {
                                     buf: maybeCreateBuffer(result.quantized, 2, gl.STATIC_DRAW),
                                     mat: math.mat3(result.decodeMatrix)
                                 };
                             }
                         })());

        // Free up memory
        this._buffer = null;

        scratchMemory.acquire();
        cleanups.push(() => scratchMemory.release());

        let deferredFlagValues = null;

        /**
         * flags are 4bits values encoded on a 32bit base. color flag on the first 4 bits, silhouette flag on the next 4 bits and so on for edge, pick and clippable.
         */
        const setFlags = (portionId, flags, transparent, deferred = false) => {
            getColSilhEdgePickFlags(flags, transparent, (primitive !== "points") && (primitive !== "lines"), scene, tempUint8Array4);

            const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 1 : 0;

            let vertFlag = 0;
            vertFlag |= tempUint8Array4[0];
            vertFlag |= tempUint8Array4[1] << 4;
            vertFlag |= tempUint8Array4[2] << 8;
            vertFlag |= tempUint8Array4[3] << 12;
            vertFlag |= clippableFlag << 16;

            tempFloat32[0] = vertFlag;

            const portion   = portions[portionId];
            const firstFlag = portion.portionBase;
            const lenFlags  = portion.portionSize;

            if (deferred && (! instancedGeometry)) {
                // Avoid zillions of individual WebGL bufferSubData calls - buffer them to apply in one shot
                if (!deferredFlagValues) {
                    deferredFlagValues = new Float32Array(attributesCnt);
                }
                fillArray(deferredFlagValues.subarray(firstFlag, firstFlag + lenFlags), tempFloat32);
            } else if (flagsBuf) {
                const tempArray = scratchMemory.getTypeArray(Float32Array, lenFlags);
                fillArray(tempArray, tempFloat32);
                flagsBuf.setSubData(tempArray, firstFlag);
            }
        };

        const solid = (primitive === "solid");
        return {
            edgesColorOpaqueAllowed: () => true,
            solid: solid,
            sortId: (((primitive === "points") ? "Points" : ((primitive === "lines") ? "Lines" : "Triangles"))
                     + (instancing ? "Instancing" : "Batching") + "Layer" +
                     (((primitive !== "points") && (primitive !== "lines"))
                      ? ((solid ? "-solid" : "-surface")
                         + "-autoNormals"
                         + (instancing
                            ? ""
                            // TODO: These two parts need to be IDs (ie. unique):
                            : ((textureSet && textureSet.colorTexture ? "-colorTexture" : "")
                               +
                               (textureSet && textureSet.metallicRoughnessTexture ? "-metallicRoughnessTexture" : ""))))
                      : "")),
            setClippableFlags: setFlags,
            setFlags: setFlags,
            setFlags2: (portionId, flags, deferred) => { },
            setDeferredFlags: () => {
                if (deferredFlagValues) {
                    flagsBuf.setData(deferredFlagValues);
                    deferredFlagValues = null;
                }
            },

            setColor: (portionId, color) => { // RGBA color is normalized as ints
                if (colorsBuf) {
                    const portion = portions[portionId];
                    const tempArray = scratchMemory.getTypeArray(Uint8Array, portion.portionSize * 4);
                    // alpha used to be unset for points, so effectively random (from last use)
                    fillArray(tempArray, color.slice(0, 4));
                    colorsBuf.setSubData(tempArray, portion.portionBase * 4);
                }
            },
            setMatrix: (portionId, matrix) => {
                if (modelMatrixColBufs) {
                    modelMatrixColBufs.forEach((b, i) => {
                        tempFloat32Vec4[0] = matrix[i+0];
                        tempFloat32Vec4[1] = matrix[i+4];
                        tempFloat32Vec4[2] = matrix[i+8];
                        tempFloat32Vec4[3] = matrix[i+12];
                        b.setSubData(tempFloat32Vec4, portionId * 4);
                    });
                }
            },
            setOffset: (portionId, offset) => {
                if (!scene.entityOffsetsEnabled) {
                    model.error("Entity#offset not enabled for this Viewer"); // See Viewer entityOffsetsEnabled
                } else {
                    const portion = portions[portionId];
                    if (offsetsBuf) {
                        tempVec3fa.set(offset);
                        const tempArray = scratchMemory.getTypeArray(Float32Array, portion.portionSize * 3);
                        fillArray(tempArray, tempVec3fa);
                        offsetsBuf.setSubData(tempArray, portion.portionBase * 3);
                    }
                    if (portion.retainedGeometry) {
                        portion.retainedGeometry.offset.set(offset);
                    }
                }
            },

            getEachIndex: (portionId, callback) => {
                const retainedGeometry = portions[portionId].retainedGeometry;
                if (retainedGeometry) {
                    retainedGeometry.indices.forEach(i => callback(i));
                }
            },
            getEachVertex: (portionId, callback) => {
                const retainedGeometry = portions[portionId].retainedGeometry;
                if (retainedGeometry) {
                    const origVec = tempVec4b;
                    if (origin) {
                        origVec.set(origin, 0);
                    } else {
                        origVec[0] = origVec[1] = origVec[2] = 0;
                    }
                    origVec[3] = 1;
                    const sceneModelMatrix = model.matrix;
                    math.mulMat4v4(sceneModelMatrix, origVec, origVec);
                    const positions = retainedGeometry.quantizedPositions;
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
                        math.addVec3(origVec, worldPos, worldPos);
                        callback(worldPos);
                    }
                }
            },
            readGeometryData: (primitive !== "points") && (primitive !== "lines") && ((portionId) => {
                const portion = (! instancing) && portions[portionId];
                const indices = (portion
                                 ? indicesBuf.getData(portion.indicesBaseIndex, portion.numIndices).map(i => i - portion.portionBase)
                                 : indicesBuf.getData());

                const sceneModelMatrix = model.matrix;

                const origin4 = math.vec4();
                origin4.set(origin, 0); origin4[3] = 1;
                math.mulMat4v4(sceneModelMatrix, origin4, origin4);

                const instanceMatrix = modelMatrixColBufs && math.mat4();
                if (instanceMatrix) {
                    const col0 = modelMatrixColBufs[0].getData(portionId, 1);
                    const col1 = modelMatrixColBufs[1].getData(portionId, 1);
                    const col2 = modelMatrixColBufs[2].getData(portionId, 1);
                    instanceMatrix.set([
                        col0[0], col1[0], col2[0], 0,
                        col0[1], col1[1], col2[1], 0,
                        col0[2], col1[2], col2[2], 0,
                        col0[3], col1[3], col2[3], 1,
                    ]);
                }

                const matrix = math.mat4();
                math.mulMat4(sceneModelMatrix, instanceMatrix ? math.mulMat4(instanceMatrix, positionsDecodeMatrix, matrix) : positionsDecodeMatrix, matrix);

                matrix[12] += origin4[0];
                matrix[13] += origin4[1];
                matrix[14] += origin4[2];

                const positionsQuantized = portion ? positionsBuf.getData(portion.portionBase, portion.portionSize) : positionsBuf.getData();

                const positions = math.transformPositions3(
                    matrix,
                    positionsQuantized,
                    new Float64Array(positionsQuantized.length));

                return { indices, positions };
            }),
            precisionRayPickSurface: (portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) => {
                const retainedGeometry = portions[portionId].retainedGeometry;
                if (! retainedGeometry) {
                    return false;
                } else {
                    if (retainedGeometry.matrix && (! retainedGeometry.inverseMatrix)) {
                        retainedGeometry.inverseMatrix = math.inverseMat4(retainedGeometry.matrix, math.mat4());
                    }

                    if (worldNormal && retainedGeometry.inverseMatrix && (! retainedGeometry.normalMatrix)) {
                        retainedGeometry.normalMatrix = math.transposeMat4(retainedGeometry.inverseMatrix, math.mat4());
                    }

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

                    math.transformRay(model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir); // RTC -> local

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

                        math.decompressPosition(a, positionsDecodeMatrix);
                        math.decompressPosition(b, positionsDecodeMatrix);
                        math.decompressPosition(c, positionsDecodeMatrix);

                        if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, closestIntersectPos)) {

                            if (retainedGeometry.matrix) {
                                math.transformPoint3(retainedGeometry.matrix, closestIntersectPos, closestIntersectPos);
                            }

                            math.transformPoint3(model.worldMatrix, closestIntersectPos, closestIntersectPos);

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
                        math.transformVec3(model.worldNormalMatrix, worldNormal, worldNormal);
                        math.normalizeVec3(worldNormal);
                    }

                    return gotIntersect;
                }
            },

            layerTextureSet: textureSet,

            renderers: getRenderers(scene, instancing ? "instancing" : "batching", primitive,
                                    model.saoEnabled,
                                    model.pbrEnabled          && uvSetup && textureSet && textureSet.colorTexture && normalsBuf && metallicRoughnessBuf && textureSet.metallicRoughnessTexture,
                                    model.colorTextureEnabled && uvSetup && textureSet && textureSet.colorTexture,
                                    !!normalsBuf,
                                    (programVariables) => makeVBORenderingAttributes(programVariables, instancing && { hasModelNormalMat: !!modelNormalMatrixColBufs }, scene.entityOffsetsEnabled)),
            drawCalls: (function() {
                const drawCallCache = { };
                const makeDrawer = (subGeometry) => (attributesHash, layerTypeInputs, viewState) => {
                    let offset = 0;
                    const mat4Size = 4 * 4;
                    matricesUniformBlockBufferData.set(model.rotationMatrix, 0);
                    matricesUniformBlockBufferData.set(viewState.viewMatrix, offset += mat4Size);
                    matricesUniformBlockBufferData.set(viewState.projMatrix, offset += mat4Size);
                    matricesUniformBlockBufferData.set(positionsDecodeMatrix, offset += mat4Size);
                    if (layerTypeInputs.needNormal()) {
                        matricesUniformBlockBufferData.set(model.worldNormalMatrix, offset += mat4Size);
                        matricesUniformBlockBufferData.set(viewState.viewNormalMatrix, offset += mat4Size);
                    }
                    layerTypeInputs.matrices.setInputValue(matricesUniformBlockBufferData);

                    layerTypeInputs.uvDecodeMatrix.setInputValue && layerTypeInputs.uvDecodeMatrix.setInputValue(uvSetup.mat);

                    if (! (attributesHash in drawCallCache)) {
                        drawCallCache[attributesHash] = [ null, null, null ];
                    }
                    const inputsCache = drawCallCache[attributesHash];
                    const cacheKey = subGeometry ? (subGeometry.vertices ? 0 : 1) : 2;
                    if (! inputsCache[cacheKey]) {
                        const vao = gl.createVertexArray();
                        gl.bindVertexArray(vao);

                        const setAttr = (a, b) => { if (a && a.setInputValue && b) { a.setInputValue(b); } };
                        const attrs = layerTypeInputs.attributes;
                        setAttr(attrs.position, positionsBuf);
                        setAttr(attrs.normal, normalsBuf);
                        setAttr(attrs.color, colorsBuf);
                        setAttr(attrs.pickColor, pickColorsBuf);
                        setAttr(attrs.uV, uvSetup && uvSetup.buf);
                        setAttr(attrs.metallicRoughness, metallicRoughnessBuf);
                        setAttr(attrs.flags, flagsBuf);
                        setAttr(attrs.offset, offsetsBuf);
                        attrs.modelMatrixCol && attrs.modelMatrixCol.forEach((a, i) => setAttr(a, modelMatrixColBufs[i]));
                        attrs.modelNormalMatrixCol && attrs.modelNormalMatrixCol.forEach((a, i) => setAttr(a, modelNormalMatrixColBufs[i]));

                        const drawer = (function() {
                            // TODO: Use drawElements count and offset to draw only one entity

                            const drawPoints = () => {
                                if (instancing) {
                                    gl.drawArraysInstanced(gl.POINTS, 0, positionsBuf.numItems, portions.length);
                                } else {
                                    gl.drawArrays(gl.POINTS, 0, positionsBuf.numItems);
                                }
                            };

                            const elementsDrawer = (mode, indicesBuf) => {
                                indicesBuf.bindIndicesBuffer();
                                const count = indicesBuf.indicesCount;
                                const type = indicesBuf.indicesType;
                                return () => {
                                    if (instancing) {
                                        gl.drawElementsInstanced(mode, count, type, 0, portions.length);
                                    } else {
                                        gl.drawElements(mode, count, type, 0);
                                    }
                                };
                            };

                            if (primitive === "points") {
                                return drawPoints;
                            } else if (primitive === "lines") {
                                if (subGeometry && subGeometry.vertices) {
                                    return drawPoints;
                                } else {
                                    return elementsDrawer(gl.LINES, indicesBuf);
                                }
                            } else {    // triangles
                                if (subGeometry && subGeometry.vertices) {
                                    return drawPoints;
                                } else if (subGeometry && edgeIndicesBuf) {
                                    return elementsDrawer(gl.LINES, edgeIndicesBuf);
                                } else {
                                    return elementsDrawer(gl.TRIANGLES, indicesBuf);
                                }
                            }
                        })();

                        gl.bindVertexArray(null);

                        cleanups.push(() => gl.deleteVertexArray(vao));

                        inputsCache[cacheKey] = () => {
                            gl.bindVertexArray(vao);
                            drawer();
                            gl.bindVertexArray(null);
                        };
                    }

                    inputsCache[cacheKey]();
                };

                return {
                    drawVertices: makeDrawer({ vertices: true }),
                    drawEdges:    makeDrawer({ }),
                    drawSurface:  makeDrawer(null)
                };
            })(),

            destroy: () => {
                cleanups.forEach(c => c());
                cleanups.length = 0;
            }
        };
    }
}

const lazyShaderVariable = function(name) {
    const variable = {
        toString: () => {
            variable.needed = true;
            return name;
        }
    };
    return variable;
};

const makeVBORenderingAttributes = function(programVariables, instancing, entityOffsetsEnabled) {
    const createAttribute = programVariables.createAttribute;

    const attributes = {
        position:             createAttribute("vec3",  "positionA"),
        normal:               createAttribute("vec3",  "normalA"),
        color:                createAttribute("vec4",  "colorA"),
        pickColor:            createAttribute("vec4",  "pickColor"),
        uV:                   createAttribute("vec2",  "uvApremul"),
        metallicRoughness:    createAttribute("vec2",  "metallicRoughness"),
        flags:                createAttribute("float", "flagsA"),
        offset:               entityOffsetsEnabled && createAttribute("vec3", "offset"),
        modelMatrixCol:       instancing && iota(3).map(i => createAttribute("vec4", "modelMatrixCol" + i)),
        modelNormalMatrixCol: instancing && instancing.hasModelNormalMat && iota(3).map(i => createAttribute("vec4", "modelNormalMatrixCol" + i))
    };

    const uvA            = lazyShaderVariable("aUv");
    const viewNormal     = lazyShaderVariable("viewNormal");
    const worldNormal    = lazyShaderVariable("worldNormal");
    const uvDecodeMatrix = programVariables.createUniform("mat3", "uvDecodeMatrix");

    const needNormal = () => (viewNormal.needed || worldNormal.needed);
    const matrices = programVariables.createUniformBlock(
        "Matrices",
        {
            worldMatrix:           "mat4",
            viewMatrix:            "mat4",
            projMatrix:            "mat4",
            positionsDecodeMatrix: "mat4",
            worldNormalMatrix:     "mat4",
            viewNormalMatrix:      "mat4"
        });

    return {
        dontCullOnAlphaZero: true,

        clippableTest: (function() {
            const vClippable = programVariables.createVarying("float", "vClippable", () => `${`((int(${attributes.flags}) >> 16 & 0xF) == 1)`} ? 1.0 : 0.0`); // Using `flat uint` for vClippable causes an instability - see XEOK-385
            return () => `${vClippable} != 0.0`;
        })(),

        geometryParameters: {
            attributes: {
                color:             attributes.color,
                flags:             iota(4).map(i => ({ toString: () => `(int(${attributes.flags}) >> ${i * 4} & 0xF)` })),
                metallicRoughness: attributes.metallicRoughness,
                normal:            {
                    view:  viewNormal,
                    world: worldNormal
                },
                pickColor:         attributes.pickColor,
                position:          {
                    clip:  "gl_Position",
                    view:  "viewPosition",
                    world: "worldPosition"
                },
                uv:                uvA
            },
            projMatrix: matrices.projMatrix,
            viewMatrix: matrices.viewMatrix
        },

        appendVertexData: (src) => {
            uvA.needed && src.push(`vec2 ${uvA} = (${uvDecodeMatrix} * vec3(${attributes.uV}, 1.0)).xy;`);

            const modelMatrixTransposed = attributes.modelMatrixCol && `mat4(${attributes.modelMatrixCol[0]}, ${attributes.modelMatrixCol[1]}, ${attributes.modelMatrixCol[2]}, vec4(0.0,0.0,0.0,1.0))`;
            src.push(`vec4 worldPosition = ${matrices.worldMatrix} * (${matrices.positionsDecodeMatrix} * vec4(${attributes.position}, 1.0)${modelMatrixTransposed ? (" * " + modelMatrixTransposed) : ""});`);
            attributes.offset && src.push(`worldPosition.xyz = worldPosition.xyz + ${attributes.offset};`);

            if (needNormal()) {
                const timesModelNormalMatrixT = attributes.modelNormalMatrixCol && `* mat4(${attributes.modelNormalMatrixCol[0]}, ${attributes.modelNormalMatrixCol[1]}, ${attributes.modelNormalMatrixCol[2]}, vec4(0.0,0.0,0.0,1.0))`;
                src.push(`vec4 modelNormal = vec4(${programVariables.commonLibrary.octDecode}(${attributes.normal}.xy), 0.0)${timesModelNormalMatrixT || ""};`);
                src.push(`vec3 ${worldNormal} = (${matrices.worldNormalMatrix} * modelNormal).xyz;`);
                if (viewNormal.needed) {
                    src.push(`vec3 ${viewNormal} = normalize((${matrices.viewNormalMatrix} * vec4(${worldNormal}, 0.0)).xyz);`);
                }
            }
        },

        layerTypeInputs: {
            attributes:     attributes,
            matrices:       matrices,
            uvDecodeMatrix: uvDecodeMatrix,
            needNormal:     needNormal
        }
    };
};
