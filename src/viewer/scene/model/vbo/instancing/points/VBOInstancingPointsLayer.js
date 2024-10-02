import {ENTITY_FLAGS} from '../../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {getRenderers} from "./renderers/VBOInstancingPointsRenderers.js";

const tempUint8Vec4 = new Uint8Array(4);
const tempFloat32 = new Float32Array(1);
const tempVec3fa = new Float32Array(3);

const tempFloat32Vec4 = new Float32Array(4);

/**
 * @private
 */
export class VBOInstancingPointsLayer {

    /**
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.model
     * @param cfg.geometry
     * @param cfg.material
     * @param cfg.origin
     */
    constructor(cfg) {

      //  console.info("VBOInstancingPointsLayer");

        /**
         * Owner model
         * @type {VBOSceneModel}
         */
        this.model = cfg.model;

        /**
         * Shared material
         * @type {VBOSceneModelGeometry}
         */
        this.material = cfg.material;

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = "PointsInstancingLayer";

        /**
         * Index of this InstancingLayer in VBOSceneModel#_layerList
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        this._renderers = getRenderers(cfg.model.scene);
        this._aabb = math.collapseAABB3();

        this._state = new RenderState({
            obb: math.OBB3(),
            numInstances: 0,
            origin: cfg.origin ? math.vec3(cfg.origin) : null,
            geometry: cfg.geometry,
            positionsDecodeMatrix: cfg.geometry.positionsDecodeMatrix, // So we can null the geometry for GC
            colorsBuf: null,
            flagsBuf: null,
            offsetsBuf: null,
            modelMatrixCol0Buf: null,
            modelMatrixCol1Buf: null,
            modelMatrixCol2Buf: null,
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

        // Per-instance arrays
        this._pickColors = [];
        this._offsets = [];

        // Modeling matrix per instance, array for each column
        this._modelMatrixCol0 = [];
        this._modelMatrixCol1 = [];
        this._modelMatrixCol2 = [];

        this._portions = [];
        this._meshes = [];
        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;

        this._finalized = false;

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
     * @param cfg.meshMatrix Flat float 4x4 matrix.
     * @param [cfg.worldMatrix] Flat float 4x4 matrix.
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID.
     */
    createPortion(mesh, cfg) {

        const meshMatrix = cfg.meshMatrix;
        const pickColor = cfg.pickColor;

        if (this._finalized) {
            throw "Already finalized";
        }

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

        // Per-instance pick colors

        this._pickColors.push(pickColor[0]);
        this._pickColors.push(pickColor[1]);
        this._pickColors.push(pickColor[2]);
        this._pickColors.push(pickColor[3]);

        this._state.numInstances++;

        const portionId = this._portions.length;
        this._portions.push({});

        this._numPortions++;
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    finalize() {
        if (this._finalized) {
            throw "Already finalized";
        }
        const gl = this.model.scene.canvas.gl;
        const flagsLength = this._pickColors.length / 4;
        const state = this._state;
        const geometry = state.geometry;
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
        if (geometry.colorsCompressed && geometry.colorsCompressed.length > 0) {
            const colorsCompressed = new Uint8Array(geometry.colorsCompressed);
            const notNormalized = false;
            state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, colorsCompressed, colorsCompressed.length, 4, gl.STATIC_DRAW, notNormalized);
        }
        if (this._modelMatrixCol0.length > 0) {
            const normalized = false;
            state.modelMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol0), this._modelMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
            state.modelMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol1), this._modelMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
            state.modelMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol2), this._modelMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
            this._modelMatrixCol0 = [];
            this._modelMatrixCol1 = [];
            this._modelMatrixCol2 = [];
        }
        if (this._pickColors.length > 0) {
            const normalized = false;
            state.pickColorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._pickColors), this._pickColors.length, 4, gl.STATIC_DRAW, normalized);
            this._pickColors = []; // Release memory
        }
        state.geometry = null;
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
        this._state.colorsBuf.setData(tempUint8Vec4, portionId * 3);
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

    ////////////////////////////////////////
    // TODO: Update portion matrix
    ////////////////////////////////////////
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

        let pickFlag = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 255 : 0;

        let vertFlag = 0;
        vertFlag |= colorFlag;
        vertFlag |= silhouetteFlag << 4;
        vertFlag |= edgeFlag << 8;
        vertFlag |= pickFlag << 12;
        vertFlag |= clippableFlag << 16;

        tempFloat32[0] = vertFlag;

        this._state.flagsBuf.setData(tempFloat32, portionId);
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
        this._state.offsetsBuf.setData(tempVec3fa, portionId * 3);
    }

    setMatrix(portionId, matrix) {
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

    // ---------------------- NORMAL RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (this._renderers.colorRenderer) {
            this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === 0 || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (this._renderers.colorRenderer) {
            this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
        }
    }

    // -- RENDERING SAO POST EFFECT TARGETS ----------------------------------------------------------------------------

    drawDepth(renderFlags, frameCtx) {
    }

    drawNormals(renderFlags, frameCtx) {
    }

    // ---------------------- EMPHASIS RENDERING -----------------------------------

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._renderers.silhouetteRenderer) {
            this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    //-- EDGES RENDERING -----------------------------------------------------------------------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
    }

    drawEdgesSelected(renderFlags, frameCtx) {
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.occlusionRenderer) {
            // Only opaque, filled objects can be occluders
            this._renderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SHADOW BUFFER RENDERING -----------------------------------

    drawShadow(renderFlags, frameCtx) {
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.pickMeshRenderer) {
            this._renderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.pickDepthRenderer) {
            this._renderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
    }

    drawSnapInit(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.snapInitRenderer) {
            this._renderers.snapInitRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawSnap(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.snapRenderer) {
            this._renderers.snapRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    destroy() {
        const state = this._state;
        if (state.colorsBuf) {
            state.colorsBuf.destroy();
            state.colorsBuf = null;
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
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        state.destroy();
    }
}
