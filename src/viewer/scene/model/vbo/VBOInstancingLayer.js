import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {RENDER_PASSES} from "../RENDER_PASSES.js";

import {math} from "../../math/math.js";
import {RenderState} from "../../webgl/RenderState.js";
import {ArrayBuf} from "../../webgl/ArrayBuf.js";
import {getPointsRenderers} from "./renderers/VBOPointsRenderers.js";
import {getLinesRenderers} from "./renderers/VBOLinesRenderers.js";
import {getTrianglesRenderers} from "./renderers/VBOTrianglesRenderers.js";

const tempUint8Vec4 = new Uint8Array(4);
const tempFloat32 = new Float32Array(1);
const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec3fa = new Float32Array(3);

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempVec3g = math.vec3();

const tempFloat32Vec4 = new Float32Array(4);

/**
 * @private
 */
export class VBOInstancingLayer {

    /**
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.model
     * @param cfg.geometry
     * @param cfg.textureSet
     * @param cfg.origin
     */
    constructor(cfg) {

        /**
         * Owner model
         * @type {VBOSceneModel}
         */
        this.model = cfg.model;

        /**
         * Index of this InstancingLayer in VBOSceneModel#_layerList
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        /**
         * The type of primitives in this layer.
         */
        this.primitive = cfg.geometry.primitive;

        /**
         * When true, this layer contains solid triangle meshes, otherwise this layer contains surface triangle meshes
         * @type {boolean}
         */
        this.solid = (this.primitive === "solid");

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = ((this.primitive === "points")
                       ? "PointsInstancingLayer"
                       : ((this.primitive === "lines")
                          ? "LinesInstancingLayer"
                          : ("TrianglesInstancingLayer" + (this.solid ? "-solid" : "-surface") + "-autoNormals")));

        this._renderers = ((this.primitive === "points") ? getPointsRenderers : ((this.primitive === "lines") ? getLinesRenderers : getTrianglesRenderers))(cfg.model.scene, true);

        this._hasEdges = (this.primitive !== "points") && (this.primitive !== "lines");

        this._retainGeometry = this.model.scene.readableGeometryEnabled && (this.primitive !== "points") && (this.primitive !== "lines");

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
            // Modeling matrix per instance, array for each column
            modelMatrixCol0:       attribute(),
            modelMatrixCol1:       attribute(),
            modelMatrixCol2:       attribute(),
            colors:                attribute(), // used for non-points
            metallicRoughness:     attribute(), // used for triangulated
            modelNormalMatrixCol0: attribute(), // used for triangulated
            modelNormalMatrixCol1: attribute(), // used for triangulated
            modelNormalMatrixCol2: attribute(), // used for triangulated
            pickColors:            attribute(), // used for non-lines
        };

        this._state = new RenderState({
            obb: math.OBB3(),
            numInstances: 0,
            origin: cfg.origin && math.vec3(cfg.origin),
            geometry: cfg.geometry,
            positionsBuf: null,
            colorsBuf: null,
            offsetsBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: math.mat4(cfg.geometry.positionsDecodeMatrix), // So we can null the geometry for GC
            metallicRoughnessBuf: null,
            pickColorsBuf: null,
            modelMatrixCol0Buf: null,
            modelMatrixCol1Buf: null,
            modelMatrixCol2Buf: null,
            modelNormalMatrixCol0Buf: null,
            modelNormalMatrixCol1Buf: null,
            modelNormalMatrixCol2Buf: null,
            textureSet: cfg.textureSet,
            pbrSupported: false, // Set in #finalize if we have enough to support quality rendering
        });

        // These counts are used to avoid unnecessary render passes
        this._numPortions = 0;
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numEdgesLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._portions = [];
        this._meshes = [];

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
     * Creates a new portion within this InstancingLayer, returns the new portion ID.
     *
     * The portion will instance this InstancingLayer's geometry.
     *
     * Gives the portion the specified color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg Portion params
     * @param cfg.meshMatrix Flat float 4x4 matrix.
     * @param cfg.color Color [0..255,0..255,0..255]
     * @param cfg.opacity Opacity [0..255].
     * @param cfg.metallic Metalness factor [0..255]
     * @param cfg.roughness Roughness factor [0..255]
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID.
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;

        const meshMatrix = cfg.meshMatrix;
        buffer.modelMatrixCol0.append([ meshMatrix[0], meshMatrix[4], meshMatrix[8], meshMatrix[12] ]);
        buffer.modelMatrixCol1.append([ meshMatrix[1], meshMatrix[5], meshMatrix[9], meshMatrix[13] ]);
        buffer.modelMatrixCol2.append([ meshMatrix[2], meshMatrix[6], meshMatrix[10], meshMatrix[14] ]);

        if (this.primitive !== "points") {
            const color = cfg.color; // Color is pre-quantized by SceneModel
            buffer.colors.append([ color[0], color[1], color[2], cfg.opacity ?? 255 ]);
        }

        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            buffer.metallicRoughness.append([ cfg.metallic ?? 0, cfg.roughness ?? 255 ]);

            if (this._state.geometry.normals) {
                // Note: order of inverse and transpose doesn't matter
                const normalMatrix = math.inverseMat4(math.transposeMat4(meshMatrix, math.mat4()));
                buffer.modelNormalMatrixCol0.append([ normalMatrix[0], normalMatrix[4], normalMatrix[8], normalMatrix[12] ]);
                buffer.modelNormalMatrixCol0.append([ normalMatrix[1], normalMatrix[5], normalMatrix[9], normalMatrix[13] ]);
                buffer.modelNormalMatrixCol0.append([ normalMatrix[2], normalMatrix[6], normalMatrix[10], normalMatrix[14] ]);
            }
        }

        if (this.primitive !== "lines") {
            buffer.pickColors.append(cfg.pickColor.slice(0, 4));
        }

        this._state.numInstances++;

        const portionId = this._portions.length;

        const portion = {};
        if (this._retainGeometry) {
            portion.matrix = meshMatrix.slice();
            portion.inverseMatrix = null; // Lazy-computed in precisionRayPickSurface
            portion.normalMatrix = null; // Lazy-computed in precisionRayPickSurface

            if (this.model.scene.entityOffsetsEnabled) {
                portion.offset = new Float32Array(3);
            }
        }

        this._portions.push(portion);
        this._numPortions++;
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    finalize() {

        if (this._finalized) {
            throw "Already finalized";
        }

        const state = this._state;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;
        const maybeCreateGlBuffer = (target, srcData, size, usage, normalized = false) => (srcData.length > 0) ? new ArrayBuf(gl, target, srcData, srcData.length, size, usage, normalized) : null;

        state.modelMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
        state.modelMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
        state.modelMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);

        state.flagsBuf           = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(state.numInstances), 1, gl.DYNAMIC_DRAW);

        state.colorsBuf          = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.colors.compileBuffer(Uint8Array), 4, gl.DYNAMIC_DRAW);

        state.offsetsBuf         = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(state.numInstances * 3), 3, gl.DYNAMIC_DRAW) : null;

        state.metallicRoughnessBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.metallicRoughness.compileBuffer(Uint8Array), 2, gl.STATIC_DRAW);

        state.pickColorsBuf      = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        const geometry = state.geometry;
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
            state.colorsForPointsNotInstancing = true;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines") && geometry.uvCompressed) {
            state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, geometry.uvCompressed, 2, gl.STATIC_DRAW);
            state.uvDecodeMatrix = geometry.uvDecodeMatrix;
        }
        if (geometry.edgeIndices) {
            state.edgeIndicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.edgeIndices), 1, gl.STATIC_DRAW);
        }

        if (state.modelMatrixCol0Buf && state.normalsBuf) { // WARNING: normalsBuf is never defined at the moment
            state.modelNormalMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelNormalMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelNormalMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
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


        this._buffer = null;
        if (!this._retainGeometry) {
            this._state.geometry = null;
        }
        this._finalized = true;
    }

    // The following setters are called by VBOSceneModelMesh, in turn called by VBOSceneModelNode, only after the layer is finalized.
    // It's important that these are called after finalize() in order to maintain integrity of counts like _numVisibleLayerPortions etc.

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
        if (flags & ENTITY_FLAGS.EDGES) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setVisible(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setHighlighted(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setXRayed(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setSelected(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setEdges(portionId, flags, meshTransparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.EDGES) {
            this._numEdgesLayerPortions++;
            this.model.numEdgesLayerPortions++;
        } else {
            this._numEdgesLayerPortions--;
            this.model.numEdgesLayerPortions--;
        }
        this._setFlags(portionId, flags, meshTransparent);
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

    setCollidable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
    }

    setPickable(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setCulled(portionId, flags, meshTransparent) {
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
        this._setFlags(portionId, flags, meshTransparent);
    }

    setColor(portionId, color) { // RGBA color is normalized as ints
        if (!this._finalized) {
            throw "Not finalized";
        }
        tempUint8Vec4[0] = color[0];
        tempUint8Vec4[1] = color[1];
        tempUint8Vec4[2] = color[2];
        tempUint8Vec4[3] = color[3]; // this used to be unset for points, so effectively random (from last use)
        if (this._state.colorsBuf) {
            this._state.colorsBuf.setData(tempUint8Vec4, portionId * 4);
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
    _setFlags(portionId, flags, meshTransparent) {

        if (!this._finalized) {
            throw "Not finalized";
        }

        const visible = !!(flags & ENTITY_FLAGS.VISIBLE);
        const xrayed = !!(flags & ENTITY_FLAGS.XRAYED);
        const highlighted = !!(flags & ENTITY_FLAGS.HIGHLIGHTED);
        const selected = !!(flags & ENTITY_FLAGS.SELECTED);
        const edges = !!(flags & ENTITY_FLAGS.EDGES);
        const pickable = !!(flags & ENTITY_FLAGS.PICKABLE);
        const culled = !!(flags & ENTITY_FLAGS.CULLED);

        let colorFlag;
        if (!visible || culled || xrayed
            || (highlighted && !this.model.scene.highlightMaterial.glowThrough)
            || (selected && !this.model.scene.selectedMaterial.glowThrough)) {
            colorFlag = RENDER_PASSES.NOT_RENDERED;
        } else {
            if (meshTransparent) {
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
        if (!visible || culled) {
            edgeFlag = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            edgeFlag = RENDER_PASSES.EDGES_SELECTED;
        } else if (highlighted) {
            edgeFlag = RENDER_PASSES.EDGES_HIGHLIGHTED;
        } else if (xrayed) {
            edgeFlag = RENDER_PASSES.EDGES_XRAYED;
        } else if (edges) {
            if (meshTransparent) {
                edgeFlag = RENDER_PASSES.EDGES_COLOR_TRANSPARENT;
            } else {
                edgeFlag = RENDER_PASSES.EDGES_COLOR_OPAQUE;
            }
        } else {
            edgeFlag = RENDER_PASSES.NOT_RENDERED;
        }

        const pickFlag = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 1 : 0;

        let vertFlag = 0;
        vertFlag |= colorFlag;
        vertFlag |= silhouetteFlag << 4;
        vertFlag |= edgeFlag << 8;
        vertFlag |= pickFlag << 12;
        vertFlag |= clippableFlag << 16;

        tempFloat32[0] = vertFlag;

        if (this._state.flagsBuf) {
            this._state.flagsBuf.setData(tempFloat32, portionId);
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
        tempVec3fa[0] = offset[0];
        tempVec3fa[1] = offset[1];
        tempVec3fa[2] = offset[2];
        if (this._state.offsetsBuf) {
            this._state.offsetsBuf.setData(tempVec3fa, portionId * 3);
        }
        if (this._retainGeometry) {
            const portion = this._portions[portionId];
            portion.offset[0] = offset[0];
            portion.offset[1] = offset[1];
            portion.offset[2] = offset[2];
        }
    }

    getEachVertex(portionId, callback) {
        if (!this._retainGeometry) {
            return false;
        }
        const state = this._state;
        const geometry = state.geometry;
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return;
        }
        const positions = geometry.positionsCompressed;
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
        const portionMatrix = portion.matrix;
        const positionsDecodeMatrix = state.positionsDecodeMatrix;
        for (let i = 0, len = positions.length; i < len; i += 3) {
            worldPos[0] = positions[i];
            worldPos[1] = positions[i + 1];
            worldPos[2] = positions[i + 2];
            math.decompressPosition(worldPos, positionsDecodeMatrix);
            math.transformPoint3(portionMatrix, worldPos, worldPos);
            worldPos[3] = 1;
            math.mulMat4v4(sceneModelMatrix, worldPos, worldPos);
            worldPos[0] += offsetX;
            worldPos[1] += offsetY;
            worldPos[2] += offsetZ;
            callback(worldPos);
        }
    }

    getEachIndex(portionId, callback) {
        if (!this._retainGeometry) {
            return false;
        }
        const state = this._state;
        const geometry = state.geometry;
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return;
        }
        const indices = geometry.indices;
        for (let i = 0, len = indices.length; i < len; i++) {
            callback(indices[i]);
        }
    }

    setMatrix(portionId, matrix) {

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

    // ---------------------- COLOR RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if ((this.primitive === "points") || (this.primitive === "lines")) {
            if (this._renderers.colorRenderer) {
                this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
            }
        } else {
            this._updateBackfaceCull(renderFlags, frameCtx);
            const useAlphaCutoff = this._state.textureSet && (typeof (this._state.textureSet.alphaCutoff) === "number");
            if (frameCtx.withSAO && this.model.saoEnabled) {
                if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported) {
                    if (this._renderers.pbrRendererWithSAO) {
                        this._renderers.pbrRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                } else if (frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported) {
                    if (useAlphaCutoff) {
                        if (this._renderers.colorTextureRendererWithSAOAlphaCutoff) {
                            this._renderers.colorTextureRendererWithSAOAlphaCutoff.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                        }
                    } else {
                        if (this._renderers.colorTextureRendererWithSAO) {
                            this._renderers.colorTextureRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                        }
                    }
                } else if (this._state.normalsBuf) {
                    if (this._renderers.colorRendererWithSAO) {
                        this._renderers.colorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                } else {
                    if (this._renderers.flatColorRendererWithSAO) {
                        this._renderers.flatColorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                }
            } else if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported) {
                if (this._renderers.pbrRenderer) {
                    this._renderers.pbrRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else if (frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported) {
                if (useAlphaCutoff) {
                    if (this._renderers.colorTextureRendererAlphaCutoff) {
                        this._renderers.colorTextureRendererAlphaCutoff.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                } else {
                    if (this._renderers.colorTextureRenderer) {
                        this._renderers.colorTextureRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                }
            } else if (this._state.normalsBuf) {
                if (this._renderers.colorRenderer) {
                    this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else {
                if (this._renderers.flatColorRenderer) {
                    this._renderers.flatColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            }
        }
    }

    _updateBackfaceCull(renderFlags, frameCtx) {
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

    drawColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === 0 || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if ((this.primitive === "points") || (this.primitive === "lines")) {
            if (this._renderers.colorRenderer) {
                this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
            }
        } else {
            this._updateBackfaceCull(renderFlags, frameCtx);
            if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported) {
                if (this._renderers.pbrRenderer) {
                    this._renderers.pbrRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
		}
            } else if (frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported) {
		const useAlphaCutoff = this._state.textureSet && (typeof(this._state.textureSet.alphaCutoff) === "number");
		if (useAlphaCutoff) {
                    if (this._renderers.colorTextureRendererAlphaCutoff) {
			this._renderers.colorTextureRendererAlphaCutoff.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                    }
		} else {
                    if (this._renderers.colorTextureRenderer) {
			this._renderers.colorTextureRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                    }
		}
            } else if (this._state.normalsBuf) {
                if (this._renderers.colorRenderer) {
                    this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                }
            } else {
                if (this._renderers.flatColorRenderer) {
                    this._renderers.flatColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                }
            }
        }
    }

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    drawDepth(renderFlags, frameCtx) {
        if ((this.primitive === "points") || (this.primitive === "lines")) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.depthRenderer) {
            this._renderers.depthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses depth (eg SAO) does not apply to transparent objects
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (! this._hasEdges) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (! this._hasEdges) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0 ||  this._numTransparentLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (! this._hasEdges) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (! this._hasEdges) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (! this._hasEdges) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (!this._state.pickColorsBuf) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.pickMeshRenderer) {
            this._renderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (!this._state.pickColorsBuf) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.pickDepthRenderer) {
            this._renderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if ((!this._state.pickColorsBuf) || (this.primitive === "points") || (this.primitive === "lines")) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////
        // TODO
        // if (this._state.normalsBuf) {
        //     if (this._renderers.pickNormalsRenderer) {
        //         this._renderers.pickNormalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        //     }
        ////////////////////////////////////////////////////////////////////////////////////////////////////
        // } else {
        if (this._renderers.pickNormalsFlatRenderer) {
            this._renderers.pickNormalsFlatRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
        // }
    }

    drawSnapInit(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.snapInitRenderer) {
            this._renderers.snapInitRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawSnap(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.snapRenderer) {
            this._renderers.snapRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawOcclusion(renderFlags, frameCtx) {
        if (this.primitive === "lines") {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.occlusionRenderer) {
            // Only opaque, filled objects can be occluders
            this._renderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawShadow(renderFlags, frameCtx) {
        if ((this.primitive === "points") || (this.primitive === "lines")) {
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this._updateBackfaceCull(renderFlags, frameCtx);
        }
        if (this._renderers.shadowRenderer) {
            this._renderers.shadowRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //-----------------------------------------------------------------------------------------

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {

        if (!this._retainGeometry) {
            return false;
        }

        const geometry = this._state.geometry;
        const state = this._state;
        const portion = this._portions[portionId];

        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return false;
        }

        if (!portion.inverseMatrix) {
            portion.inverseMatrix = math.inverseMat4(portion.matrix, math.mat4());
        }

        if (worldNormal && !portion.normalMatrix) {
            portion.normalMatrix = math.transposeMat4(portion.inverseMatrix, math.mat4());
        }

        const quantizedPositions = geometry.quantizedPositions;
        const indices = geometry.indices;
        const origin = state.origin;
        const offset = portion.offset;

        const rtcRayOrigin = tempVec3a;
        const rtcRayDir = tempVec3b;

        rtcRayOrigin.set(origin ? math.subVec3(worldRayOrigin, origin, tempVec3c) : worldRayOrigin);  // World -> RTC
        rtcRayDir.set(worldRayDir);

        if (offset) {
            math.subVec3(rtcRayOrigin, offset);
        }

        math.transformRay(this.model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);

        math.transformRay(portion.inverseMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);

        const a = tempVec3d;
        const b = tempVec3e;
        const c = tempVec3f;

        let gotIntersect = false;
        let closestDist = 0;
        const closestIntersectPos = tempVec3g;

        for (let i = 0, len = indices.length; i < len; i += 3) {

            const ia = indices[i + 0] * 3;
            const ib = indices[i + 1] * 3;
            const ic = indices[i + 2] * 3;

            a[0] = quantizedPositions[ia];
            a[1] = quantizedPositions[ia + 1];
            a[2] = quantizedPositions[ia + 2];

            b[0] = quantizedPositions[ib];
            b[1] = quantizedPositions[ib + 1];
            b[2] = quantizedPositions[ib + 2];

            c[0] = quantizedPositions[ic];
            c[1] = quantizedPositions[ic + 1];
            c[2] = quantizedPositions[ic + 2];

            const {positionsDecodeMatrix} = state.geometry;

            math.decompressPosition(a, positionsDecodeMatrix);
            math.decompressPosition(b, positionsDecodeMatrix);
            math.decompressPosition(c, positionsDecodeMatrix);

            if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, closestIntersectPos)) {

                math.transformPoint3(portion.matrix, closestIntersectPos, closestIntersectPos);

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
            math.transformVec3(portion.normalMatrix, worldNormal, worldNormal);
            math.transformVec3(this.model.worldNormalMatrix, worldNormal, worldNormal);
            math.normalizeVec3(worldNormal);
        }

        return gotIntersect;
    }

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
