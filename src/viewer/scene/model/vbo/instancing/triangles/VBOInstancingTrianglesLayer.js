import {ENTITY_FLAGS} from '../../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {getRenderers} from "./renderers/Renderers.js";

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
export class VBOInstancingTrianglesLayer {

    /**
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.model
     * @param cfg.geometry
     * @param cfg.textureSet
     * @param cfg.origin
     */
    constructor(cfg) {

        //   console.info("Creating VBOInstancingTrianglesLayer");

        /**
         * Owner model
         * @type {VBOSceneModel}
         */
        this.model = cfg.model;

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = "TrianglesInstancingLayer" + (cfg.solid ? "-solid" : "-surface") + (cfg.normals ? "-normals" : "-autoNormals");

        /**
         * Index of this InstancingLayer in VBOSceneModel#_layerList
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        this._renderers = getRenderers(cfg.model.scene);

        this._aabb = math.collapseAABB3();

        this._state = new RenderState({
            numInstances: 0,
            obb: math.OBB3(),
            origin: math.vec3(),
            geometry: cfg.geometry,
            textureSet: cfg.textureSet,
            pbrSupported: false, // Set in #finalize if we have enough to support quality rendering
            positionsDecodeMatrix: cfg.geometry.positionsDecodeMatrix, // So we can null the geometry for GC
            colorsBuf: null,
            metallicRoughnessBuf: null,
            flagsBuf: null,
            offsetsBuf: null,
            modelMatrixBuf: null,
            modelMatrixCol0Buf: null,
            modelMatrixCol1Buf: null,
            modelMatrixCol2Buf: null,
            modelNormalMatrixCol0Buf: null,
            modelNormalMatrixCol1Buf: null,
            modelNormalMatrixCol2Buf: null,
            pickColorsBuf: null
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

        /** @private */
        this.numIndices = cfg.geometry.numIndices;

        // Vertex arrays
        this._colors = [];
        this._metallicRoughness = [];
        this._pickColors = [];
        this._offsets = [];

        // Modeling matrix per instance, array for each column

        this._modelMatrix = [];

        this._modelMatrixCol0 = [];
        this._modelMatrixCol1 = [];
        this._modelMatrixCol2 = [];

        // Modeling normal matrix per instance, array for each column
        this._modelNormalMatrixCol0 = [];
        this._modelNormalMatrixCol1 = [];
        this._modelNormalMatrixCol2 = [];

        this._portions = [];
        this._meshes = [];

        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;

        if (cfg.origin) {
            this._state.origin.set(cfg.origin);
        }

        this._finalized = false;

        /**
         * When true, this layer contains solid triangle meshes, otherwise this layer contains surface triangle meshes
         * @type {boolean}
         */
        this.solid = !!cfg.solid;

        /**
         * The number of indices in this layer.
         * @type {number|*}
         */
        this.numIndices = cfg.geometry.numIndices;

        /**
         * The type of primitives in this layer.
         */
        this.primitive = cfg.geometry.primitive;
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
     * @param cfg.color Color [0..255,0..255,0..255]
     * @param cfg.metallic Metalness factor [0..255]
     * @param cfg.roughness Roughness factor [0..255]
     * @param cfg.opacity Opacity [0..255].
     * @param cfg.meshMatrix Flat float 4x4 matrix.
     * @param [cfg.worldMatrix] Flat float 4x4 matrix.
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID.
     */
    createPortion(mesh, cfg) {

        const color = cfg.color;
        const metallic = cfg.metallic;
        const roughness = cfg.roughness;
        const opacity = cfg.opacity !== null && cfg.opacity !== undefined ? cfg.opacity : 255;
        const meshMatrix = cfg.meshMatrix;
        const pickColor = cfg.pickColor;

        if (this._finalized) {
            throw "Already finalized";
        }

        const r = color[0]; // Color is pre-quantized by SceneModel
        const g = color[1];
        const b = color[2];

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

        if (this._state.geometry.normals) {

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

        this._state.numInstances++;

        const portionId = this._portions.length;

        const portion = {};

        if (this.model.scene.readableGeometryEnabled) {
            portion.matrix = meshMatrix.slice();
            portion.inverseMatrix = null; // Lazy-computed in precisionRayPickSurface
            portion.normalMatrix = null; // Lazy-computed in precisionRayPickSurface
        }

        this._portions.push(portion);

        this._numPortions++;
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    finalize() {

        if (this._finalized) {
            return;
        }

        const state = this._state;
        const geometry = state.geometry;
        const textureSet = state.textureSet;
        const gl = this.model.scene.canvas.gl;
        const colorsLength = this._colors.length;
        const flagsLength = colorsLength / 4;

        if (colorsLength > 0) {
            let notNormalized = false;
            state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._colors), this._colors.length, 4, gl.DYNAMIC_DRAW, notNormalized);
            this._colors = []; // Release memory
        }

        if (this._metallicRoughness.length > 0) {
            const metallicRoughness = new Uint8Array(this._metallicRoughness);
            let normalized = false;
            state.metallicRoughnessBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, metallicRoughness, this._metallicRoughness.length, 2, gl.STATIC_DRAW, normalized);
        }

        if (flagsLength > 0) {
            // Because we only build flags arrays here,
            // get their length from the colors array
            let notNormalized = false;
            state.flagsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(flagsLength), flagsLength, 1, gl.DYNAMIC_DRAW, notNormalized);
        }

        if (this.model.scene.entityOffsetsEnabled) {
            if (this._offsets.length > 0) {
                const notNormalized = false;
                state.offsetsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._offsets), this._offsets.length, 3, gl.DYNAMIC_DRAW, notNormalized);
                this._offsets = []; // Release memory
            }
        }

        if (geometry.positionsCompressed && geometry.positionsCompressed.length > 0) {
            const normalized = false;
            state.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, geometry.positionsCompressed, geometry.positionsCompressed.length, 3, gl.STATIC_DRAW, normalized);
            state.positionsDecodeMatrix = math.mat4(geometry.positionsDecodeMatrix);
        }
        // if (geometry.normalsCompressed && geometry.normalsCompressed.length > 0) {
        //     const normalized = true; // For oct-encoded UInt8
        //     state.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, geometry.normalsCompressed, geometry.normalsCompressed.length, 3, gl.STATIC_DRAW, normalized);
        // }
        if (geometry.colorsCompressed && geometry.colorsCompressed.length > 0) {
            const colorsCompressed = new Uint8Array(geometry.colorsCompressed);
            const notNormalized = false;
            state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, colorsCompressed, colorsCompressed.length, 4, gl.STATIC_DRAW, notNormalized);
        }
        if (geometry.uvCompressed && geometry.uvCompressed.length > 0) {
            const uvCompressed = geometry.uvCompressed;
            state.uvDecodeMatrix = geometry.uvDecodeMatrix;
            state.uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uvCompressed, uvCompressed.length, 2, gl.STATIC_DRAW, false);
        }
        if (geometry.indices && geometry.indices.length > 0) {
            state.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), geometry.indices.length, 1, gl.STATIC_DRAW);
            state.numIndices = geometry.indices.length;
        }
        if (geometry.edgeIndices && geometry.edgeIndices.length > 0) {
            state.edgeIndicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.edgeIndices), geometry.edgeIndices.length, 1, gl.STATIC_DRAW);
        }

        if (this._modelMatrixCol0.length > 0) {

            const normalized = false;

            state.modelMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol0), this._modelMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
            state.modelMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol1), this._modelMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
            state.modelMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol2), this._modelMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
            this._modelMatrixCol0 = [];
            this._modelMatrixCol1 = [];
            this._modelMatrixCol2 = [];

            if (state.normalsBuf) {
                state.modelNormalMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol0), this._modelNormalMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
                state.modelNormalMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol1), this._modelNormalMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
                state.modelNormalMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol2), this._modelNormalMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
                this._modelNormalMatrixCol0 = [];
                this._modelNormalMatrixCol1 = [];
                this._modelNormalMatrixCol2 = [];
            }
        }

        if (this._pickColors.length > 0) {
            const normalized = false;
            state.pickColorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._pickColors), this._pickColors.length, 4, gl.STATIC_DRAW, normalized);
            this._pickColors = []; // Release memory
        }

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


        if (!this.model.scene.readableGeometryEnabled) {
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
        tempUint8Vec4[3] = color[3];
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
    //     this._state.modelMatrixCol0Buf.setData(tempFloat32Vec4, offset);
    //
    //     tempFloat32Vec4[0] = matrix[1];
    //     tempFloat32Vec4[1] = matrix[5];
    //     tempFloat32Vec4[2] = matrix[9];
    //     tempFloat32Vec4[3] = matrix[13];
    //
    //     this._state.modelMatrixCol1Buf.setData(tempFloat32Vec4, offset);
    //
    //     tempFloat32Vec4[0] = matrix[2];
    //     tempFloat32Vec4[1] = matrix[6];
    //     tempFloat32Vec4[2] = matrix[10];
    //     tempFloat32Vec4[3] = matrix[14];
    //
    //     this._state.modelMatrixCol2Buf.setData(tempFloat32Vec4, offset);
    // }

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
    }

    getEachVertex(portionId, callback) {
        if (!this.model.scene.readableGeometryEnabled) {
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
        origin.set(state.origin, 0);
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
        if (!this.model.scene.readableGeometryEnabled) {
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
        if (!this._finalized) {
            throw "Not finalized";
        }

        ////////////////////////////////////////
        // TODO: Update portion matrix
        ////////////////////////////////////////

        var offset = portionId * 4;

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

    readGeometryData(portionId) {
        if (!this._finalized) {
            throw "Not finalized";
        }

        const state = this._state;
        const sceneModelMatrix = this.model.matrix;

        const col0 = state.modelMatrixCol0Buf.getData(portionId, 1);
        const col1 = state.modelMatrixCol1Buf.getData(portionId, 1);
        const col2 = state.modelMatrixCol2Buf.getData(portionId, 1);

        const portionMatrix = [
            col0[0], col1[0], col2[0], 0,
            col0[1], col1[1], col2[1], 0,
            col0[2], col1[2], col2[2], 0,
            col0[3], col1[3], col2[3], 1,
        ];

        const positionsDecodeMatrix = state.positionsDecodeMatrix;

        const origin = math.vec4();
        origin.set(state.origin, 0);
        origin[3] = 1;
        math.mulMat4v4(sceneModelMatrix, origin, origin);

        const indices = state.indicesBuf.getData();

        const matrix = math.mulMat4(
            portionMatrix,
            positionsDecodeMatrix,
            new Array(16)
        );

        math.mulMat4(
            sceneModelMatrix,
            matrix,
            matrix
        );

        matrix[12] += origin[0];
        matrix[13] += origin[1];
        matrix[14] += origin[2];

        const positionsQuantized = state.positionsBuf.getData();

        const positions = math.transformPositions3(
            matrix,
            positionsQuantized,
            new Array(positionsQuantized.length)
        );

        // const aabb = math.positions3ToAABB3(positions);
        // console.log({aabbToniInstancing: aabb});

        return { indices, positions };
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
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
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported) {
            if (this._renderers.pbrRenderer) {
                this._renderers.pbrRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
            }
        } else if (frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported) {
            if (this._renderers.colorTextureRenderer) {
                this._renderers.colorTextureRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
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

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    drawDepth(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.depthRenderer) {
            this._renderers.depthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses depth (eg SAO) does not apply to transparent objects
        }
    }

    drawNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.normalsRenderer) {
            this._renderers.normalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses normals (eg SAO) does not apply to transparent objects
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.occlusionRenderer) {
            // Only opaque, filled objects can be occluders
            this._renderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SHADOW BUFFER RENDERING -----------------------------------

    drawShadow(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.shadowRenderer) {
            this._renderers.shadowRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.pickMeshRenderer) {
            this._renderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.pickDepthRenderer) {
            this._renderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);

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
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.snapInitRenderer) {
            this._renderers.snapInitRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawSnap(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.snapRenderer) {
            this._renderers.snapRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    //-----------------------------------------------------------------------------------------

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {

        if (!this.model.scene.readableGeometryEnabled) {
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
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        state.destroy();
        this._state = null;
    }
}
