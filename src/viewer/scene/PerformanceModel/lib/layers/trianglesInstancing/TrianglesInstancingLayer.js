import {WEBGL_INFO} from "../../../../webglInfo.js";
import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {buildEdgeIndices} from '../../../../math/buildEdgeIndices.js';
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {geometryCompressionUtils} from "../../../../math/geometryCompressionUtils.js";
import {getInstancingRenderers} from "./TrianglesInstancingRenderers.js";
import {quantizePositions, octEncodeNormals} from "../../compression.js";

const bigIndicesSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"];

const tempUint8Vec4 = new Uint8Array(4);
const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempVec4c = math.vec4([0, 0, 0, 1]);
const tempVec3fa = new Float32Array(3);

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();

/**
 * @private
 */
class TrianglesInstancingLayer {

    /**
     * @param model
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.positions Flat float Local-space positions array.
     * @param [cfg.normals] Flat float normals array.
     * @param cfg.indices Flat int indices array.
     * @param [cfg.edgeIndices] Flat int edges indices array.
     * @param cfg.edgeThreshold
     * @param cfg.rtcCenter
     * @params cfg.solid
     */
    constructor(model, cfg) {

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = "TrianglesInstancingLayer" + (cfg.solid ? "-solid" : "-surface") + (cfg.normals ? "-normals" : "-autoNormals");

        /**
         * Index of this InstancingLayer in PerformanceModel#_layerList
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        this._instancingRenderers = getInstancingRenderers(model.scene);
        this.model = model;
        this._aabb = math.collapseAABB3();

        const stateCfg = {
            positionsDecodeMatrix: math.mat4(),
            numInstances: 0,
            obb: math.OBB3(),
            rtcCenter: null
        };

        const preCompressed = (!!cfg.positionsDecodeMatrix);
        const pickSurfacePrecisionEnabled = this.model.scene.pickSurfacePrecisionEnabled;
        const gl = this.model.scene.canvas.gl;

        if (cfg.positions) {

            if (preCompressed) {

                const normalized = false;
                stateCfg.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, cfg.positions, cfg.positions.length, 3, gl.STATIC_DRAW, normalized);
                stateCfg.positionsDecodeMatrix.set(cfg.positionsDecodeMatrix);

                const localAABB = math.collapseAABB3();
                math.expandAABB3Points3(localAABB, cfg.positions);
                geometryCompressionUtils.decompressAABB(localAABB, stateCfg.positionsDecodeMatrix);
                math.AABB3ToOBB3(localAABB, stateCfg.obb);

                if (pickSurfacePrecisionEnabled) {
                    stateCfg.quantizedPositions = cfg.positions;
                }

            } else {

                const lenPositions = cfg.positions.length;
                const localAABB = math.collapseAABB3();
                math.expandAABB3Points3(localAABB, cfg.positions);
                math.AABB3ToOBB3(localAABB, stateCfg.obb);
                const quantizedPositions = quantizePositions(cfg.positions, localAABB, stateCfg.positionsDecodeMatrix);
                let normalized = false;
                stateCfg.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, quantizedPositions, lenPositions, 3, gl.STATIC_DRAW, normalized);

                if (pickSurfacePrecisionEnabled) {
                    stateCfg.quantizedPositions = quantizedPositions;
                }
            }
        }

        if (cfg.normals && cfg.normals.length > 0) {

            if (preCompressed) {

                const normalized = true; // For oct-encoded UInt8
                stateCfg.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, cfg.normals, cfg.normals.length, 3, gl.STATIC_DRAW, normalized);

            } else {

                const compressedNormals = octEncodeNormals(cfg.normals);
                const normalized = true; // For oct-encoded UInt8
                stateCfg.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, compressedNormals, compressedNormals.length, 3, gl.STATIC_DRAW, normalized);
            }
        }

        if (cfg.indices) {
            stateCfg.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, bigIndicesSupported ? new Uint32Array(cfg.indices) : new Uint16Array(cfg.indices), cfg.indices.length, 1, gl.STATIC_DRAW);

            if (pickSurfacePrecisionEnabled) {
                stateCfg.indices = cfg.indices;
            }
        }

        let edgeIndices = cfg.edgeIndices;
        if (!edgeIndices) {
            edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, cfg.edgeThreshold || 10);
        }
        stateCfg.edgeIndicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, bigIndicesSupported ? new Uint32Array(edgeIndices) : new Uint16Array(edgeIndices), edgeIndices.length, 1, gl.STATIC_DRAW);

        this._state = new RenderState(stateCfg);

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

        /** @private */
        this.numIndices = (cfg.indices) ? cfg.indices.length / 3 : 0;

        // Vertex arrays
        this._colors = [];
        this._metallicRoughness = [];
        this._pickColors = [];
        this._offsets = [];

        // Modeling matrix per instance, array for each column
        this._modelMatrixCol0 = [];
        this._modelMatrixCol1 = [];
        this._modelMatrixCol2 = [];

        // Modeling normal matrix per instance, array for each column
        this._modelNormalMatrixCol0 = [];
        this._modelNormalMatrixCol1 = [];
        this._modelNormalMatrixCol2 = [];

        this._portions = [];

        if (cfg.rtcCenter) {
            this._state.rtcCenter = math.vec3(cfg.rtcCenter);
        }

        this._finalized = false;

        /**
         * The axis-aligned World-space boundary of this InstancingLayer's positions.
         * @type {*|Float64Array}
         */
        this.aabb = math.collapseAABB3();

        /**
         * When true, this layer contains solid triangle meshes, otherwise this layer contains surface triangle meshes
         * @type {boolean}
         */
        this.solid = !!cfg.solid;
    }

    /**
     * Creates a new portion within this InstancingLayer, returns the new portion ID.
     *
     * The portion will instance this InstancingLayer's geometry.
     *
     * Gives the portion the specified color and matrix.
     *
     * @param cfg Portion params
     * @param cfg.color Color [0..255,0..255,0..255]
     * @param cfg.metallic Metalness factor [0..255]
     * @param cfg.roughness Roughness factor [0..255]
     * @param cfg.opacity Opacity [0..255].
     * @param cfg.meshMatrix Flat float 4x4 matrix.
     * @param [cfg.worldMatrix] Flat float 4x4 matrix.
     * @param cfg.worldAABB Flat float AABB.
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID.
     */
    createPortion(cfg) {

        const color = cfg.color;
        const metallic = cfg.metallic;
        const roughness = cfg.roughness;
        const opacity = cfg.opacity;
        const meshMatrix = cfg.meshMatrix;
        const worldMatrix = cfg.worldMatrix;
        const worldAABB = cfg.aabb;
        const pickColor = cfg.pickColor;

        if (this._finalized) {
            throw "Already finalized";
        }

        // TODO: find AABB for portion by transforming the geometry local AABB by the given meshMatrix?

        const r = color[0]; // Color is pre-quantized by PerformanceModel
        const g = color[1];
        const b = color[2];
        const a = color[3];

        this._colors.push(r);
        this._colors.push(g);
        this._colors.push(b);
        this._colors.push(opacity);

        this._metallicRoughness.push((metallic !== null && metallic !== undefined) ? metallic : 0);
        this._metallicRoughness.push((roughness !== null && roughness !== undefined) ? roughness : 255);

        if (this.model.scene.entityOffsetsEnabled) {
            this._offsets.push(0);
            this._offsets.push(0);
            this._offsets.push(0);
        }

        this._modelMatrixCol0.push(meshMatrix[0]);
        this._modelMatrixCol0.push(meshMatrix[4]);
        this._modelMatrixCol0.push(meshMatrix[8]);
        this._modelMatrixCol0.push(meshMatrix[12]);

        this._modelMatrixCol1.push(meshMatrix[1]);
        this._modelMatrixCol1.push(meshMatrix[5]);
        this._modelMatrixCol1.push(meshMatrix[9]);
        this._modelMatrixCol1.push(meshMatrix[13]);

        this._modelMatrixCol2.push(meshMatrix[2]);
        this._modelMatrixCol2.push(meshMatrix[6]);
        this._modelMatrixCol2.push(meshMatrix[10]);
        this._modelMatrixCol2.push(meshMatrix[14]);

        if (this._state.normalsBuf) {

            // Note: order of inverse and transpose doesn't matter

        let transposedMat = math.transposeMat4(meshMatrix, math.mat4()); // TODO: Use cached matrix
        let normalMatrix = math.inverseMat4(transposedMat);

        this._modelNormalMatrixCol0.push(normalMatrix[0]);
        this._modelNormalMatrixCol0.push(normalMatrix[4]);
        this._modelNormalMatrixCol0.push(normalMatrix[8]);
        this._modelNormalMatrixCol0.push(normalMatrix[12]);

        this._modelNormalMatrixCol1.push(normalMatrix[1]);
        this._modelNormalMatrixCol1.push(normalMatrix[5]);
        this._modelNormalMatrixCol1.push(normalMatrix[9]);
        this._modelNormalMatrixCol1.push(normalMatrix[13]);

            this._modelNormalMatrixCol2.push(normalMatrix[2]);
            this._modelNormalMatrixCol2.push(normalMatrix[6]);
            this._modelNormalMatrixCol2.push(normalMatrix[10]);
            this._modelNormalMatrixCol2.push(normalMatrix[14]);
        }

        // Per-vertex pick colors

        this._pickColors.push(pickColor[0]);
        this._pickColors.push(pickColor[1]);
        this._pickColors.push(pickColor[2]);
        this._pickColors.push(pickColor[3]);

        // Expand AABB

        math.collapseAABB3(worldAABB);
        const obb = this._state.obb;
        const lenPositions = obb.length;
        for (let i = 0; i < lenPositions; i += 4) {
            tempVec4a[0] = obb[i + 0];
            tempVec4a[1] = obb[i + 1];
            tempVec4a[2] = obb[i + 2];
            math.transformPoint4(meshMatrix, tempVec4a, tempVec4b);
            if (worldMatrix) {
                math.transformPoint4(worldMatrix, tempVec4b, tempVec4c);
                math.expandAABB3Point3(worldAABB, tempVec4c);
            } else {
                math.expandAABB3Point3(worldAABB, tempVec4b);
            }
        }

        if (this._state.rtcCenter) {
            const rtcCenter = this._state.rtcCenter;
            worldAABB[0] += rtcCenter[0];
            worldAABB[1] += rtcCenter[1];
            worldAABB[2] += rtcCenter[2];
            worldAABB[3] += rtcCenter[0];
            worldAABB[4] += rtcCenter[1];
            worldAABB[5] += rtcCenter[2];
        }

        math.expandAABB3(this.aabb, worldAABB);

        this._state.numInstances++;

        const portionId = this._portions.length;

        const portion = {};

        if (this.model.scene.pickSurfacePrecisionEnabled) {
            portion.matrix = meshMatrix.slice();
            portion.inverseMatrix = null; // Lazy-computed in precisionRayPickSurface
        }

        this._portions.push(portion);

        this._numPortions++;
        this.model.numPortions++;

        return portionId;
    }

    finalize() {
        if (this._finalized) {
            throw "Already finalized";
        }
        const gl = this.model.scene.canvas.gl;
        const colorsLength = this._colors.length;
        const flagsLength = colorsLength;
        if (colorsLength > 0) {
            let notNormalized = false;
            this._state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._colors), this._colors.length, 4, gl.DYNAMIC_DRAW, notNormalized);
            this._colors = []; // Release memory
        }
        if (this._metallicRoughness.length > 0) {
            const metallicRoughness = new Uint8Array(this._metallicRoughness);
            let normalized = false;
            this._state.metallicRoughnessBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, metallicRoughness, this._metallicRoughness.length, 2, gl.STATIC_DRAW, normalized);
        }
        if (flagsLength > 0) {
            // Because we only build flags arrays here,
            // get their length from the colors array
            let notNormalized = false;
            let normalized = true;
            this._state.flagsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(flagsLength), flagsLength, 4, gl.DYNAMIC_DRAW, notNormalized);
            this._state.flags2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(flagsLength), flagsLength, 4, gl.DYNAMIC_DRAW, normalized);
        }
        if (this.model.scene.entityOffsetsEnabled) {
            if (this._offsets.length > 0) {
                const notNormalized = false;
                this._state.offsetsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._offsets), this._offsets.length, 3, gl.DYNAMIC_DRAW, notNormalized);
                this._offsets = []; // Release memory
            }
        }
        if (this._modelMatrixCol0.length > 0) {

            const normalized = false;

            this._state.modelMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol0), this._modelMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol1), this._modelMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol2), this._modelMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
            this._modelMatrixCol0 = [];
            this._modelMatrixCol1 = [];
            this._modelMatrixCol2 = [];

            if (this._state.normalsBuf) {
                this._state.modelNormalMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol0), this._modelNormalMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
                this._state.modelNormalMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol1), this._modelNormalMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
                this._state.modelNormalMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol2), this._modelNormalMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
                this._modelNormalMatrixCol0 = [];
                this._modelNormalMatrixCol1 = [];
                this._modelNormalMatrixCol2 = [];
            }
        }
        if (this._pickColors.length > 0) {
            const normalized = false;
            this._state.pickColorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._pickColors), this._pickColors.length, 4, gl.STATIC_DRAW, normalized);
            this._pickColors = []; // Release memory
        }
        this._finalized = true;
    }

    // The following setters are called by PerformanceMesh, in turn called by PerformanceNode, only after the layer is finalized.
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
        this._setFlags2(portionId, flags);
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
        this._setFlags2(portionId, flags);
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
        this._setFlags2(portionId, flags, meshTransparent);
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
        tempUint8Vec4[3] = color[3];
        if (this._state.colorsBuf) {
            this._state.colorsBuf.setData(tempUint8Vec4, portionId * 4, 4);
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

    // setMatrix(portionId, matrix) {
    //
    //     if (!this._finalized) {
    //         throw "Not finalized";
    //     }
    //
    //     var offset = portionId * 4;
    //
    //     tempFloat32Vec4[0] = matrix[0];
    //     tempFloat32Vec4[1] = matrix[4];
    //     tempFloat32Vec4[2] = matrix[8];
    //     tempFloat32Vec4[3] = matrix[12];
    //
    //     this._state.modelMatrixCol0Buf.setData(tempFloat32Vec4, offset, 4);
    //
    //     tempFloat32Vec4[0] = matrix[1];
    //     tempFloat32Vec4[1] = matrix[5];
    //     tempFloat32Vec4[2] = matrix[9];
    //     tempFloat32Vec4[3] = matrix[13];
    //
    //     this._state.modelMatrixCol1Buf.setData(tempFloat32Vec4, offset, 4);
    //
    //     tempFloat32Vec4[0] = matrix[2];
    //     tempFloat32Vec4[1] = matrix[6];
    //     tempFloat32Vec4[2] = matrix[10];
    //     tempFloat32Vec4[3] = matrix[14];
    //
    //     this._state.modelMatrixCol2Buf.setData(tempFloat32Vec4, offset, 4);
    // }

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

        // Normal fill

        let f0;
        if (!visible || culled || xrayed) { // Highlight & select are layered on top of color - not mutually exclusive
            f0 = RENDER_PASSES.NOT_RENDERED;
        } else {
            if (meshTransparent) {
                f0 = RENDER_PASSES.COLOR_TRANSPARENT;
            } else {
                f0 = RENDER_PASSES.COLOR_OPAQUE;
            }
        }

        // Emphasis fill

        let f1;
        if (!visible || culled) {
            f1 = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            f1 = RENDER_PASSES.SILHOUETTE_SELECTED;
        } else if (highlighted) {
            f1 = RENDER_PASSES.SILHOUETTE_HIGHLIGHTED;
        } else if (xrayed) {
            f1 = RENDER_PASSES.SILHOUETTE_XRAYED;
        } else {
            f1 = RENDER_PASSES.NOT_RENDERED;
        }

        // Edges

        let f2 = 0;
        if (!visible || culled) {
            f2 = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            f2 = RENDER_PASSES.EDGES_SELECTED;
        } else if (highlighted) {
            f2 = RENDER_PASSES.EDGES_HIGHLIGHTED;
        } else if (xrayed) {
            f2 = RENDER_PASSES.EDGES_XRAYED;
        } else if (edges) {
            if (meshTransparent) {
                f2 = RENDER_PASSES.EDGES_COLOR_TRANSPARENT;
            } else {
                f2 = RENDER_PASSES.EDGES_COLOR_OPAQUE;
            }
        } else {
            f2 = RENDER_PASSES.NOT_RENDERED;
        }

        // Pick

        let f3 = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        tempUint8Vec4[0] = f0; // x - normal fill
        tempUint8Vec4[1] = f1; // y - emphasis fill
        tempUint8Vec4[2] = f2; // z - edges
        tempUint8Vec4[3] = f3; // w - pick

        if (this._state.flagsBuf) {
            this._state.flagsBuf.setData(tempUint8Vec4, portionId * 4, 4);
        }
    }

    _setFlags2(portionId, flags) {

        if (!this._finalized) {
            throw "Not finalized";
        }

        const clippable = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 255 : 0;
        tempUint8Vec4[0] = clippable;

        if (this._state.flags2Buf) {
            this._state.flags2Buf.setData(tempUint8Vec4, portionId * 4, 4);
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
            this._state.offsetsBuf.setData(tempVec3fa, portionId * 3, 3);
        }
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (frameCtx.withSAO && this.model.saoEnabled) {
            if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.normalsBuf) {
                if (this._instancingRenderers.colorQualityRendererWithSAO) {
                    this._instancingRenderers.colorQualityRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else {
                if (this._state.normalsBuf) {
                    if (this._instancingRenderers.colorRendererWithSAO) {
                        this._instancingRenderers.colorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                } else {
                    if (this._instancingRenderers.flatColorRendererWithSAO) {
                        this._instancingRenderers.flatColorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                }
            }
        } else {
            if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.normalsBuf) {
                if (this._instancingRenderers.colorQualityRenderer) {
                    this._instancingRenderers.colorQualityRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else {
                if (this._state.normalsBuf) {
                    if (this._instancingRenderers.colorRenderer) {
                        this._instancingRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                } else {
                    if (this._instancingRenderers.flatColorRenderer) {
                        this._instancingRenderers.flatColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                    }
                }
            }
        }
    }

    _updateBackfaceCull(renderFlags, frameCtx) {
        const backfaces = this.model.backfaces || (!this.solid) || renderFlags.sectioned;
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
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.normalsBuf) {
            if (this._instancingRenderers.colorQualityRenderer) {
                this._instancingRenderers.colorQualityRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
            }
        } else {
            if (this._state.normalsBuf) {
                if (this._instancingRenderers.colorRenderer) {
                    this._instancingRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                }
            } else {
                if (this._instancingRenderers.flatColorRenderer) {
                    this._instancingRenderers.flatColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
                }
            }
        }
    }

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    drawDepth(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.depthRenderer) {
            this._instancingRenderers.depthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses depth (eg SAO) does not apply to transparent objects
        }
    }

    drawNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.normalsRenderer) {
            this._instancingRenderers.normalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses normals (eg SAO) does not apply to transparent objects
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.silhouetteRenderer) {
            this._instancingRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.silhouetteRenderer) {
            this._instancingRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.silhouetteRenderer) {
            this._instancingRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._instancingRenderers.edgesColorRenderer) {
            this._instancingRenderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._instancingRenderers.edgesColorRenderer) {
            this._instancingRenderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._instancingRenderers.edgesRenderer) {
            this._instancingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._instancingRenderers.edgesRenderer) {
            this._instancingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._instancingRenderers.edgesRenderer) {
            this._instancingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.occlusionRenderer) {
            // Only opaque, filled objects can be occluders
            this._instancingRenderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SHADOW BUFFER RENDERING -----------------------------------

    drawShadow(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.shadowRenderer) {
            this._instancingRenderers.shadowRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.pickMeshRenderer) {
            this._instancingRenderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.pickDepthRenderer) {
            this._instancingRenderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._instancingRenderers.pickNormalsRenderer) {
            this._instancingRenderers.pickNormalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    //-----------------------------------------------------------------------------------------

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos) {

        if (!this.model.scene.pickSurfacePrecisionEnabled) {
            return false;
        }

        const state = this._state;
        const portion = this._portions[portionId];

        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return false;
        }

        if (!portion.inverseMatrix) {
            portion.inverseMatrix = math.inverseMat4(portion.matrix, math.mat4());
        }

        const quantizedPositions = state.quantizedPositions;
        const indices = state.indices;
        const rtcCenter = state.rtcCenter;
        const offset = portion.offset;

        const rtcRayOrigin = tempVec3a;
        const rtcRayDir = tempVec3b;

        rtcRayOrigin.set(rtcCenter ? math.subVec3(worldRayOrigin, rtcCenter, tempVec3c) : worldRayOrigin);  // World -> RTC
        rtcRayDir.set(worldRayDir);

        if (offset) {
            math.subVec3(rtcRayOrigin, offset);
        }

        math.transformRay(this.model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);

        math.transformRay(portion.inverseMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);

        const a = tempVec3d;
        const b = tempVec3e;
        const c = tempVec3f;

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

            math.decompressPosition(a, state.positionsDecodeMatrix);
            math.decompressPosition(b, state.positionsDecodeMatrix);
            math.decompressPosition(c, state.positionsDecodeMatrix);

            if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, worldSurfacePos)) {

                math.transformPoint3(portion.matrix, worldSurfacePos, worldSurfacePos);

                math.transformPoint3(this.model.worldMatrix, worldSurfacePos, worldSurfacePos);

                if (offset) {
                    math.addVec3(worldSurfacePos, offset);
                }

                if (rtcCenter) {
                    math.addVec3(worldSurfacePos, rtcCenter);
                }

                return true;
            }
        }

        return false;
    }

    destroy() {
        const state = this._state;
        if (state.positionsBuf) {
            state.positionsBuf.destroy();
            state.positionsBuf = null;
        }
        if (state.normalsBuf) {
            state.normalsBuf.destroy();
            state.normalsBuf = null;
        }
        if (state.colorsBuf) {
            state.colorsBuf.destroy();
            state.colorsBuf = null;
        }
        if (state.metallicRoughnessBuf) {
            state.metallicRoughnessBuf.destroy();
            state.metallicRoughnessBuf = null;
        }
        if (state.flagsBuf) {
            state.flagsBuf.destroy();
            state.flagsBuf = null;
        }
        if (state.flags2Buf) {
            state.flags2Buf.destroy();
            state.flags2Buf = null;
        }
        if (state.offsetsBuf) {
            state.offsetsBuf.destroy();
            state.offsetsBuf = null;
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
        if (state.indicesBuf) {
            state.indicesBuf.destroy();
            state.indicessBuf = null;
        }
        if (state.edgeIndicesBuf) {
            state.edgeIndicesBuf.destroy();
            state.edgeIndicessBuf = null;
        }
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        state.destroy();
    }
}

export {TrianglesInstancingLayer};