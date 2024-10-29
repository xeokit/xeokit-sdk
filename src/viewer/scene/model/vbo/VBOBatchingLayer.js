import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {RENDER_PASSES} from "../RENDER_PASSES.js";

import {math} from "../../math/math.js";
import {RenderState} from "../../webgl/RenderState.js";
import {ArrayBuf} from "../../webgl/ArrayBuf.js";
import {getPointsRenderers} from "./renderers/VBOPointsRenderers.js";
import {getLinesRenderers} from "./renderers/VBOLinesRenderers.js";
import {getTrianglesRenderers} from "./renderers/VBOTrianglesRenderers.js";
import {Configs} from "../../../Configs.js";
import {quantizePositions, transformAndOctEncodeNormals} from "../compression.js";
import {geometryCompressionUtils} from "../../math/geometryCompressionUtils.js";

const tempMat4 = math.mat4();
const tempMat4b = math.mat4();
const tempVec4a = math.vec4([0, 0, 0, 1]);

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempVec3g = math.vec3();

const configs = new Configs();

/**
 * @private
 */
export class VBOBatchingLayer {

    /**
     * @param cfg
     * @param cfg.model
     * @param cfg.layerIndex
     * @param cfg.primitive
     * @param cfg.positionsDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     * @param cfg.origin
     * @param cfg.scratchMemory
     * @param cfg.uvDecodeMatrix
     * @param cfg.textureSet
     */
    constructor(cfg) {

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
        this.solid = (cfg.primitive === "solid");

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = ((cfg.primitive === "points")
                       ? "PointsBatchingLayer"
                       : ((cfg.primitive === "lines")
                          ? "LinesBatchingLayer"
                          : ("TrianglesBatchingLayer" + (this.solid ? "-solid" : "-surface") + "-autonormals"
                             // TODO: These two parts need to be IDs (ie. unique):
                             + (cfg.textureSet && cfg.textureSet.colorTexture ? "-colorTexture" : "")
                             + (cfg.textureSet && cfg.textureSet.metallicRoughnessTexture ? "-metallicRoughnessTexture" : ""))));

        this._renderers = ((cfg.primitive === "points") ? getPointsRenderers : ((cfg.primitive === "lines") ? getLinesRenderers : getTrianglesRenderers))(cfg.model.scene, false);

        this._hasEdges = (cfg.primitive !== "points") && (cfg.primitive !== "lines");

        const maxGeometryBatchSize = cfg.maxGeometryBatchSize ?? configs.maxGeometryBatchSize;

        const attribute = function() {
            const portions = [ ];

            return {
                append: function(data, times = 1, denormalizeScale = 1.0, increment = 0.0) {
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
            maxVerts:          maxGeometryBatchSize,
            positions:         attribute(),
            colors:            attribute(),
            indices:           attribute(), // used for non-points
            uv:                attribute(), // used for triangulated
            metallicRoughness: attribute(), // used for triangulated
            normals:           attribute(), // used for triangulated
            pickColors:        attribute(), // used for non-lines
            edgeIndices:       attribute(), // used for triangulated
        };
        this._scratchMemory = cfg.scratchMemory;

        this._state = new RenderState({
            origin: cfg.origin && math.vec3(cfg.origin),
            positionsBuf: null,
            colorsBuf: null,
            offsetsBuf: null,
            indicesBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: cfg.positionsDecodeMatrix && math.mat4(cfg.positionsDecodeMatrix),
            uvBuf: null,
            metallicRoughnessBuf: null,
            normalsBuf: null,
            pickColorsBuf: null,
            edgeIndicesBuf: null,
            uvDecodeMatrix: cfg.uvDecodeMatrix && math.mat3(cfg.uvDecodeMatrix),
            textureSet: cfg.textureSet,
            pbrSupported: false // Set in #finalize if we have enough to support quality rendering
        });

        // These counts are used to avoid unnecessary render passes
        this._numPortions = 0;
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

        this._modelAABB = math.collapseAABB3(); // Model-space AABB
        this._portions = [];
        this._meshes = [];
        this._numVerts = 0;
        this._numIndices = 0;

        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;

        this._finalized = false;
    }

    get aabb() {
        if (this.aabbDirty) {
            math.collapseAABB3(this._aabb);
            for (let i = 0, len = this._meshes.length; i < len; i++) {
                math.expandAABB3(this._aabb, this._meshes[i].aabb);
            }
            this.aabbDirty = false;
        }
        return this._aabb;
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
        return ((this._numVerts + (lenPositions / 3)) <= this._buffer.maxVerts) && ((this._numIndices + lenIndices) <= (this._buffer.maxVerts * 3));
    }

    /**
     * Creates a new portion within this Layer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.positionsCompressed Flat quantized positions array - decompressed with positionsDecodeMatrix
     * @param cfg.indices  Flat int indices array.
     * @param [cfg.colorsCompressed] Quantized RGB colors [0..255,0..255,0..255,0..255] (non-lines)
     * @param [cfg.colors] Flat float colors array (non-lines)
     * @param cfg.color Float RGB color [0..1,0..1,0..1] (points) or Quantized RGB color [0..255,0..255,0..255,0..255] (non-points)
     * @param cfg.opacity Opacity [0..255] (non-points)
     * @param cfg.aabb Flat float AABB World-space AABB
     * @param cfg.pickColor Quantized pick color (non-lines)
     * @param [cfg.normals] Flat float normals array (triangulated)
     * @param [cfg.uv] Flat UVs array (triangulated)
     * @param [cfg.uvCompressed] (triangulated)
     * @param [cfg.edgeIndices] Flat int edges indices array (triangulated)
     * @param cfg.metallic Metalness factor [0..255] (triangulated)
     * @param cfg.roughness Roughness factor [0..255] (triangulated)
     * @param [cfg.meshMatrix] Flat float 4x4 matrix (triangulated)
     * @returns {number} Portion ID
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;
        const vertsBaseIndex = this._numVerts;

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
            const meshMatrix = cfg.meshMatrix;
            if (meshMatrix) {
                math.inverseMat4(math.transposeMat4(meshMatrix, tempMat4b), worldNormalMatrix); // Note: order of inverse and transpose doesn't matter
            } else {
                math.identityMat4(worldNormalMatrix, worldNormalMatrix);
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

        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            buffer.metallicRoughness.append([ cfg.metallic ?? 0, cfg.roughness ?? 255 ], numVerts);
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

        if (this.primitive !== "lines") {
            buffer.pickColors.append(cfg.pickColor.slice(0, 4), numVerts);
        }

        math.expandAABB3(this._modelAABB, cfg.aabb);

        const portionId = this._portions.length;

        const portion = {
            vertsBaseIndex: vertsBaseIndex,
            numVerts: numVerts,
            retainedGeometry: this.model.scene.readableGeometryEnabled && (this.primitive !== "points") && (this.primitive !== "lines") && {
                quantizedPositions: null, // Quantized in-memory positions are initialized in finalize()
                indices:            indices,
                offset:             this.model.scene.entityOffsetsEnabled && math.vec3(),
            }
        };

        this._portions.push(portion);
        this._numPortions++;
        this.model.numPortions++;
        this._numVerts += numVerts;
        this._numIndices += indices ? indices.length : 0;
        this._meshes.push(mesh);
        return portionId;
    }

    /**
     * Builds batch VBOs from appended geometries.
     * No more portions can then be created.
     */
    finalize() {

        if (this._finalized) {
            return;
        }

        const state = this._state;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;
        const maybeCreateGlBuffer = (target, srcData, size, usage, normalized = false) => (srcData.length > 0) ? new ArrayBuf(gl, target, srcData, srcData.length, size, usage, normalized) : null;

        const positions = (state.positionsDecodeMatrix
                           ? buffer.positions.compileBuffer(Uint16Array)
                           : (quantizePositions(buffer.positions.compileBuffer(Float64Array), this._modelAABB, state.positionsDecodeMatrix = math.mat4())));
        state.positionsBuf  = maybeCreateGlBuffer(gl.ARRAY_BUFFER, positions, 3, gl.STATIC_DRAW);

        for (let i = 0, numPortions = this._portions.length; i < numPortions; i++) {
            const portion = this._portions[i];
            if (portion.retainedGeometry) {
                const start = portion.vertsBaseIndex * 3;
                const end = start + (portion.numVerts * 3);
                portion.retainedGeometry.quantizedPositions = positions.subarray(start, end);
            }
        }

        state.flagsBuf      = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._numVerts), 1, gl.DYNAMIC_DRAW);

        state.colorsBuf     = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.colors.compileBuffer(Uint8Array), 4, gl.DYNAMIC_DRAW);

        state.offsetsBuf    = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._numVerts * 3), 3, gl.DYNAMIC_DRAW) : null;

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

        state.metallicRoughnessBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.metallicRoughness.compileBuffer(Uint8Array), 2, gl.STATIC_DRAW);

        state.pickColorsBuf        = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        state.edgeIndicesBuf       = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.edgeIndices.compileBuffer(Uint32Array), 1, gl.STATIC_DRAW);

        this._state.pbrSupported
            = !!state.metallicRoughnessBuf
            && !!state.uvBuf
            && !!state.normalsBuf
            && !!state.textureSet
            && !!state.textureSet.colorTexture
            && !!state.textureSet.metallicRoughnessTexture;

        this._state.colorTextureSupported
            = !!state.uvBuf
            && !!state.textureSet
            && !!state.textureSet.colorTexture;

        this._buffer = null;
        this._finalized = true;
    }

    initFlags(portionId, flags, meshTransparent) {
        if (flags & ENTITY_FLAGS.VISIBLE) {
            this._numVisibleLayerPortions++;
            this.model.numVisibleLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.HIGHLIGHTED) {
            this._numHighlightedLayerPortions++;
            this.model.numHighlightedLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.XRAYED) {
            this._numXRayedLayerPortions++;
            this.model.numXRayedLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.SELECTED) {
            this._numSelectedLayerPortions++;
            this.model.numSelectedLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.CLIPPABLE) {
            this._numClippableLayerPortions++;
            this.model.numClippableLayerPortions++;
        }
        if (this._hasEdges && flags & ENTITY_FLAGS.EDGES) {
            this._numEdgesLayerPortions++;
            this.model.numEdgesLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.PICKABLE) {
            this._numPickableLayerPortions++;
            this.model.numPickableLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.CULLED) {
            this._numCulledLayerPortions++;
            this.model.numCulledLayerPortions++;
        }
        if (meshTransparent) {
            this._numTransparentLayerPortions++;
            this.model.numTransparentLayerPortions++;
        }
        const deferred = this.primitive !== "points";
        this._setFlags(portionId, flags, meshTransparent, deferred);
    }

    flushInitFlags() {
        this._setDeferredFlags();
    }

    setVisible(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.VISIBLE) {
            this._numVisibleLayerPortions++;
            this.model.numVisibleLayerPortions++;
        } else {
            this._numVisibleLayerPortions--;
            this.model.numVisibleLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setHighlighted(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.HIGHLIGHTED) {
            this._numHighlightedLayerPortions++;
            this.model.numHighlightedLayerPortions++;
        } else {
            this._numHighlightedLayerPortions--;
            this.model.numHighlightedLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setXRayed(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.XRAYED) {
            this._numXRayedLayerPortions++;
            this.model.numXRayedLayerPortions++;
        } else {
            this._numXRayedLayerPortions--;
            this.model.numXRayedLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setSelected(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.SELECTED) {
            this._numSelectedLayerPortions++;
            this.model.numSelectedLayerPortions++;
        } else {
            this._numSelectedLayerPortions--;
            this.model.numSelectedLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setEdges(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (this._hasEdges) {
            if (flags & ENTITY_FLAGS.EDGES) {
                this._numEdgesLayerPortions++;
                this.model.numEdgesLayerPortions++;
            } else {
                this._numEdgesLayerPortions--;
                this.model.numEdgesLayerPortions--;
            }
            this._setFlags(portionId, flags, transparent);
        }
    }

    setClippable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.CLIPPABLE) {
            this._numClippableLayerPortions++;
            this.model.numClippableLayerPortions++;
        } else {
            this._numClippableLayerPortions--;
            this.model.numClippableLayerPortions--;
        }
        this._setFlags(portionId, flags);
    }

    setCulled(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.CULLED) {
            this._numCulledLayerPortions++;
            this.model.numCulledLayerPortions++;
        } else {
            this._numCulledLayerPortions--;
            this.model.numCulledLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setCollidable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
    }

    setPickable(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.PICKABLE) {
            this._numPickableLayerPortions++;
            this.model.numPickableLayerPortions++;
        } else {
            this._numPickableLayerPortions--;
            this.model.numPickableLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setColor(portionId, color) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        const portionsIdx = portionId;
        const portion = this._portions[portionsIdx];
        const vertsBaseIndex = portion.vertsBaseIndex;
        const numVerts = portion.numVerts;
        const firstColor = vertsBaseIndex * 4;
        const lenColor = numVerts * 4;
        const tempArray = this._scratchMemory.getUInt8Array(lenColor);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        const a = color[3];
        for (let i = 0; i < lenColor; i += 4) {
            tempArray[i + 0] = r;
            tempArray[i + 1] = g;
            tempArray[i + 2] = b;
            tempArray[i + 3] = a; // this used to be unset for points, so effectively random (from last use)
        }
        if (this._state.colorsBuf) {
            this._state.colorsBuf.setData(tempArray, firstColor, lenColor);
        }
    }

    setTransparent(portionId, flags, transparent) {
        if (transparent) {
            this._numTransparentLayerPortions++;
            this.model.numTransparentLayerPortions++;
        } else {
            this._numTransparentLayerPortions--;
            this.model.numTransparentLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    /**
     * flags are 4bits values encoded on a 32bit base. color flag on the first 4 bits, silhouette flag on the next 4 bits and so on for edge, pick and clippable.
     */
    _setFlags(portionId, flags, transparent, deferred = false) {

        if (!this._finalized) {
            throw "Not finalized";
        }

        const portionsIdx = portionId;
        const portion = this._portions[portionsIdx];
        const vertsBaseIndex = portion.vertsBaseIndex;
        const numVerts = portion.numVerts;
        const firstFlag = vertsBaseIndex;
        const lenFlags = numVerts;

        const visible = !!(flags & ENTITY_FLAGS.VISIBLE);
        const xrayed = !!(flags & ENTITY_FLAGS.XRAYED);
        const highlighted = !!(flags & ENTITY_FLAGS.HIGHLIGHTED);
        const selected = !!(flags & ENTITY_FLAGS.SELECTED);
        const edges = !!(this._hasEdges && flags & ENTITY_FLAGS.EDGES);
        const pickable = !!(flags & ENTITY_FLAGS.PICKABLE);
        const culled = !!(flags & ENTITY_FLAGS.CULLED);

        let colorFlag;
        if (!visible || culled || xrayed
            || (highlighted && !this.model.scene.highlightMaterial.glowThrough)
            || (selected && !this.model.scene.selectedMaterial.glowThrough)) {
            colorFlag = RENDER_PASSES.NOT_RENDERED;
        } else {
            if (transparent) {
                colorFlag = RENDER_PASSES.COLOR_TRANSPARENT;
            } else {
                colorFlag = RENDER_PASSES.COLOR_OPAQUE;
            }
        }

        let silhouetteFlag;
        if (!visible || culled) {
            silhouetteFlag = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            silhouetteFlag = RENDER_PASSES.SILHOUETTE_SELECTED;
        } else if (highlighted) {
            silhouetteFlag = RENDER_PASSES.SILHOUETTE_HIGHLIGHTED;
        } else if (xrayed) {
            silhouetteFlag = RENDER_PASSES.SILHOUETTE_XRAYED;
        } else {
            silhouetteFlag = RENDER_PASSES.NOT_RENDERED;
        }

        let edgeFlag = 0;
        if ((!this._hasEdges) || (!visible) || culled) {
            edgeFlag = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            edgeFlag = RENDER_PASSES.EDGES_SELECTED;
        } else if (highlighted) {
            edgeFlag = RENDER_PASSES.EDGES_HIGHLIGHTED;
        } else if (xrayed) {
            edgeFlag = RENDER_PASSES.EDGES_XRAYED;
        } else if (edges) {
            if (transparent) {
                edgeFlag = RENDER_PASSES.EDGES_COLOR_TRANSPARENT;
            } else {
                edgeFlag = RENDER_PASSES.EDGES_COLOR_OPAQUE;
            }
        } else {
            edgeFlag = RENDER_PASSES.NOT_RENDERED;
        }

        let pickFlag = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 1 : 0;

        if (deferred) {
            // Avoid zillions of individual WebGL bufferSubData calls - buffer them to apply in one shot
            if (!this._deferredFlagValues) {
                this._deferredFlagValues = new Float32Array(this._numVerts);
            }
            for (let i = firstFlag, len = (firstFlag + lenFlags); i < len; i++) {
                let vertFlag = 0;
                vertFlag |= colorFlag;
                vertFlag |= silhouetteFlag << 4;
                vertFlag |= edgeFlag << 8;
                vertFlag |= pickFlag << 12;
                vertFlag |= clippableFlag << 16;

                this._deferredFlagValues[i] = vertFlag;
            }
        } else if (this._state.flagsBuf) {
            const tempArray = this._scratchMemory.getFloat32Array(lenFlags);
            for (let i = 0; i < lenFlags; i++) {
                let vertFlag = 0;
                vertFlag |= colorFlag;
                vertFlag |= silhouetteFlag << 4;
                vertFlag |= edgeFlag << 8;
                vertFlag |= pickFlag << 12;
                vertFlag |= clippableFlag << 16;

                tempArray[i] = vertFlag;
            }
            this._state.flagsBuf.setData(tempArray, firstFlag, lenFlags);
        }
    }

    _setDeferredFlags() {
        if (this._deferredFlagValues) {
            this._state.flagsBuf.setData(this._deferredFlagValues);
            this._deferredFlagValues = null;
        }
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
        const vertsBaseIndex = portion.vertsBaseIndex;
        const numVerts = portion.numVerts;
        const firstOffset = vertsBaseIndex * 3;
        const lenOffsets = numVerts * 3;
        const tempArray = this._scratchMemory.getFloat32Array(lenOffsets);
        const x = offset[0];
        const y = offset[1];
        const z = offset[2];
        for (let i = 0; i < lenOffsets; i += 3) {
            tempArray[i + 0] = x;
            tempArray[i + 1] = y;
            tempArray[i + 2] = z;
        }
        if (this._state.offsetsBuf) {
            this._state.offsetsBuf.setData(tempArray, firstOffset, lenOffsets);
        }
        if (portion.retainedGeometry) {
            portion.retainedGeometry.offset.set(offset);
        }
    }

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
        const positions = retainedGeometry.quantizedPositions;
        const sceneModelMatrix = this.model.matrix;
        const origin = math.vec4();
        if (state.origin) {
            origin.set(state.origin, 0);
        }
        origin[3] = 1;
        math.mulMat4v4(sceneModelMatrix, origin, origin);
        const offsetX = origin[0];
        const offsetY = origin[1];
        const offsetZ = origin[2];
        const worldPos = tempVec4a;
        const positionsDecodeMatrix = state.positionsDecodeMatrix;
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
            worldPos[0] += offsetX;
            worldPos[1] += offsetY;
            worldPos[2] += offsetZ;
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


    __drawLayer(renderFlags, frameCtx, renderer, pass) {
        if ((this._numCulledLayerPortions < this._numPortions) && (this._numVisibleLayerPortions > 0)) {
            const backfacePasses = (this.primitive !== "points") && (this.primitive !== "lines") && [
                RENDER_PASSES.COLOR_OPAQUE,
                RENDER_PASSES.COLOR_TRANSPARENT,
                RENDER_PASSES.PICK,
                RENDER_PASSES.SILHOUETTE_HIGHLIGHTED,
                RENDER_PASSES.SILHOUETTE_SELECTED,
                RENDER_PASSES.SILHOUETTE_XRAYED,
            ];
            if (backfacePasses && backfacePasses.includes(pass)) {
                // _updateBackfaceCull
                const backfaces = true; // See XCD-230
                if (frameCtx.backfaces !== backfaces) {
                    const gl = frameCtx.gl;
                    if (backfaces) {
                        gl.disable(gl.CULL_FACE);
                    } else {
                        gl.enable(gl.CULL_FACE);
                    }
                    frameCtx.backfaces = backfaces;
                }
            }
            renderer.drawLayer(frameCtx, this, pass);
        }
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    __drawColor(renderFlags, frameCtx, renderOpaque) {
        if ((renderOpaque ? (this._numTransparentLayerPortions < this._numPortions) : (this._numTransparentLayerPortions > 0))
            &&
            (this._numXRayedLayerPortions < this._numPortions)) {
            const usePBR = frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported;
            const useColorTexture = frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported;
            const useAlphaCutoff = this._state.textureSet && (typeof(this._state.textureSet.alphaCutoff) === "number");
            const renderer = (((this.primitive === "points") || (this.primitive === "lines"))
                              ? this._renderers.colorRenderer
                              : ((renderOpaque && frameCtx.withSAO && this.model.saoEnabled)
                                 ? (usePBR
                                    ? this._renderers.pbrRendererWithSAO
                                    : (useColorTexture
                                       ? (useAlphaCutoff
                                          ? this._renderers.colorTextureRendererWithSAOAlphaCutoff
                                          : this._renderers.colorTextureRendererWithSAO)
                                       : (this._state.normalsBuf
                                          ? this._renderers.colorRendererWithSAO
                                          : this._renderers.flatColorRendererWithSAO)))
                                 : (usePBR
                                    ? this._renderers.pbrRenderer
                                    : (useColorTexture
                                       ? (useAlphaCutoff
                                          ? this._renderers.colorTextureRendererAlphaCutoff
                                          : this._renderers.colorTextureRenderer)
                                       : (this._state.normalsBuf
                                          ? this._renderers.colorRenderer
                                          : this._renderers.flatColorRenderer)))));
            const pass = renderOpaque ? RENDER_PASSES.COLOR_OPAQUE : RENDER_PASSES.COLOR_TRANSPARENT;
            this.__drawLayer(renderFlags, frameCtx, renderer, pass);
        }
    }

    drawColorOpaque(renderFlags, frameCtx) {
        this.__drawColor(renderFlags, frameCtx, true);
    }

    drawColorTransparent(renderFlags, frameCtx) {
        this.__drawColor(renderFlags, frameCtx, false);
    }

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    __drawPost(renderFlags, frameCtx, renderer) {
        // Assume whatever post-effect uses depth or normals (eg SAO) does not apply to transparent objects
        if ((this.primitive !== "points") && (this.primitive !== "lines")
            &&
            (this._numTransparentLayerPortions < this._numPortions) && (this._numXRayedLayerPortions < this._numPortions)) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawDepth(renderFlags, frameCtx) {
        this.__drawPost(renderFlags, frameCtx, this._renderers.depthRenderer);
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    __drawSilhouette(renderFlags, frameCtx, renderPass) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.silhouetteRenderer, renderPass);
    }

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numXRayedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numHighlightedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numSelectedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numEdgesLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesColorRenderer, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numEdgesLayerPortions > 0) && (this._numTransparentLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesColorRenderer, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numHighlightedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numSelectedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numXRayedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.pickMeshRenderer, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.pickDepthRenderer, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf && (this.primitive !== "points") && (this.primitive !== "lines")) {
            const renderer = (false // TODO: this._state.normalsBuf
                              ? this._renderers.pickNormalsRenderer
                              : this._renderers.pickNormalsFlatRenderer);
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.PICK);
        }
    }

    drawSnapInit(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.snapInitRenderer, RENDER_PASSES.PICK);
    }

    drawSnap(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.snapRenderer, RENDER_PASSES.PICK);
    }


    drawOcclusion(renderFlags, frameCtx) {
        if (this.primitive !== "lines") {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.occlusionRenderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawShadow(renderFlags, frameCtx) {
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.shadowRenderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //------------------------------------------------------------------------------------------------

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

    // ---------

    destroy() {
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
        state.destroy();
    }
}
