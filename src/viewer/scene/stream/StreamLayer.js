import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';
import {math} from "../../../math/math.js";
import {RenderState} from "../../../webgl/RenderState.js";
import {getDataTextureRenderers} from "./TrianglesDataTextureRenderers.js";
import {StreamPositionsBuffer} from "./StreamPositionsBuffer";
import {StreamIndices32Buffer} from "./StreamIndices32Buffer";
import {StreamMatricesBuffer} from "./StreamMatricesBuffer";
import {StreamMeshesBuffer} from "./StreamMeshesBuffer";

/**
 * 12-bits allowed for object ids.
 * Limits the per-object texture height in the layer.
 */
const MAX_NUMBER_OF_OBJECTS_IN_LAYER = (1 << 16);

/**
 * 4096 is max data texture height.
 * Limits the aggregated geometry texture height in the layer.
 */
const MAX_DATA_TEXTURE_HEIGHT = (1 << 12);

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

const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempVec4c = math.vec4([0, 0, 0, 1]);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

const tempAABB3b = math.AABB3();

let numLayers = 0;

const DEFAULT_MATRIX = math.identityMat4();

/**
 * A StreamLayer contains geometry and materials for the StreamMeshes associated with a given RTC coordinate origin.
 *
 * Within a StreamModel, there exists a StreamLayer for each RTC origin.
 *
 * @private
 */
export class StreamLayer {

    constructor(model, cfg) {

        this._blocks = {};
        this._layerNumber = numLayers++;
        this.sortId = `TriDTX-${this._layerNumber}`; // State sorting key.
        this.layerIndex = cfg.layerIndex; // Index of this StreamLayer in {@link SceneModel#_layerList}.

        this._dataTextureRenderers = getDataTextureRenderers(model.scene);
        this.model = model;

        const streamPositionsBuffer = new StreamPositionsBuffer(gl);
        const streamIndicesBuffer = new StreamIndices32Buffer(gl);
        const streamEdgeIndicesBuffer = new StreamIndices32Buffer(gl);
        const streamMatricesBuffer = new StreamMatricesBuffer(gl);
        const streamMeshesBuffer = new StreamMeshesBuffer(gl);

        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            streamPositionsBuffer,
            streamIndicesBuffer,
            streamEdgeIndicesBuffer,
            streamMatricesBuffer,
            streamMeshesBuffer,
            numIndices: 0,
            numEdgeIndices: 0,
            numVertices: 0,
        });

        this._numPortions = 0;        // These counts are used to avoid unnecessary render passes
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numEdgesLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;
        this.aabb = math.collapseAABB3();
    }

    canCreatePortion(portionCfg) {
        if (this._numPortions === 100000) { // TODO
            return false;
        }
        return (this._state.numVertices + portionCfg.positionsCompressed.length / 3) <= MAX_DATA_TEXTURE_HEIGHT * 4096
            && (this._state.numIndices + portionCfg.indices.length) <= MAX_DATA_TEXTURE_HEIGHT * 4096;
    }

    createPortion(cfg) {
        if (!this.canCreatePortion(cfg)) {
            throw "Out of space for new portion";
        }
        const positionsStreamBlock = this._state.streamPositionsBuffer.createBlock(cfg.positionsCompressed);
        const indicesStreamBlock = this._state.streamIndicesBuffer.createBlock(cfg.indices);
        const edgeIndicesStreamBlock = this._state.streamEdgeIndicesBuffer.createBlock(cfg.edgeIndices);
        const matricesStreamBlock = this._state.streamMatricesBuffer.createBlock(cfg.meshMatrix || DEFAULT_MATRIX, cfg.positionsDecodeMatrix);
        const entitiesStreamBlock = this._state.streamMeshesBuffer.createBlock(
            cfg.color,
            cfg.pickColor,
            cfg.flags,
            cfg.flags2,
            positionsStreamBlock,
            indicesStreamBlock,
            edgeIndicesStreamBlock,
            cfg.solid);
        const block = {
            positionsStreamBlock,
            indicesStreamBlock,
            edgeIndicesStreamBlock,
            matricesStreamBlock,
            entitiesStreamBlock
        };
        this._blocks[cfg.id] = block;
        this.model.numPortions++;
        this._numPortions++;
    }

    deletePortion(id) {
        const block = this._blocks[id];
        if (!block) {
            throw "Block not in layer";
        }
        this._state.streamPositionsBuffer.deleteBlock(block.blockId);
        this._state.streamIndicesBuffer.deleteBlock(block.blockId)
        this._state.streamEdgeIndicesBuffer.deleteBlock(block.blockId)
        this._state.streamMatricesBuffer.deleteBlock(block.blockId)
        this._state.streamMeshesBuffer.deleteBlock(block.blockId);
    }

    isEmpty() {
        return this._numPortions === 0;
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
        const deferred = true;
        this._setFlags(portionId, flags, meshTransparent, deferred);
        this._setFlags2(portionId, flags, deferred);
    }

    flushInitFlags() {
        this._setDeferredFlags();
        this._setDeferredFlags2();
    }

    setVisible(portionId, flags, transparent) {
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
        if (flags & ENTITY_FLAGS.EDGES) {
            this._numEdgesLayerPortions++;
            this.model.numEdgesLayerPortions++;
        } else {
            this._numEdgesLayerPortions--;
            this.model.numEdgesLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
    }

    setClippable(portionId, flags) {
        if (flags & ENTITY_FLAGS.CLIPPABLE) {
            this._numClippableLayerPortions++;
            this.model.numClippableLayerPortions++;
        } else {
            this._numClippableLayerPortions--;
            this.model.numClippableLayerPortions--;
        }
        this._setFlags2(portionId, flags);
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
        console.info("_uploadDeferredFlags")
        this._deferredSetFlagsActive = false;
        if (!this._deferredSetFlagsDirty) {
            return;
        }
        this._deferredSetFlagsDirty = false;
        const gl = this.model.scene.canvas.gl;
        const textureState = this._dataTextureState;
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // xoffset
            0, // yoffset
            textureState.texturePerObjectIdColorsAndFlags._textureWidth, // width
            textureState.texturePerObjectIdColorsAndFlags._textureHeight, // width
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            textureState.texturePerObjectIdColorsAndFlags._textureData
        );
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdOffsets._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // xoffset
            0, // yoffset
            textureState.texturePerObjectIdOffsets._textureWidth, // width
            textureState.texturePerObjectIdOffsets._textureHeight, // width
            gl.RGB,
            gl.FLOAT,
            textureState.texturePerObjectIdOffsets._textureData
        );
    }

    setCulled(portionId, flags, transparent) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & ENTITY_FLAGS.CULLED) {
            this._numCulledLayerPortions += this._portionToSubPortionsMap[portionId].length;
            this.model.numCulledLayerPortions++;
        } else {
            this._numCulledLayerPortions -= this._portionToSubPortionsMap[portionId].length;
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
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._subPortionSetColor(subPortionIds[i], color);
        }
    }

    _subPortionSetColor(subPortionId, color) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        // Color
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = color[0];
        tempUint8Array4 [1] = color[1];
        tempUint8Array4 [2] = color[2];
        tempUint8Array4 [3] = color[3];
        // object colors
        textureState.texturePerObjectIdColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32);
        if (this._deferredSetFlagsActive) {
            console.info("_subPortionSetColor defer");
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        console.info("_subPortionSetColor write through");
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            (subPortionId % 512) * 8, // xoffset
            Math.floor(subPortionId / 512), // yoffset
            1, // width
            1, //height
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            tempUint8Array4
        );
        // gl.bindTexture (gl.TEXTURE_2D, null);
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

    _setFlags(portionId, flags, transparent, deferred = false) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._subPortionSetFlags(subPortionIds[i], flags, transparent, deferred);
        }
    }

    _subPortionSetFlags(subPortionId, flags, transparent, deferred = false) {
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

        // Color

        let f0;
        if (!visible || culled || xrayed) { // Highlight & select are layered on top of color - not mutually exclusive
            f0 = RENDER_PASSES.NOT_RENDERED;
        } else {
            if (transparent) {
                f0 = RENDER_PASSES.COLOR_TRANSPARENT;
            } else {
                f0 = RENDER_PASSES.COLOR_OPAQUE;
            }
        }

        // Silhouette

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
            if (transparent) {
                f2 = RENDER_PASSES.EDGES_COLOR_TRANSPARENT;
            } else {
                f2 = RENDER_PASSES.EDGES_COLOR_OPAQUE;
            }
        } else {
            f2 = RENDER_PASSES.NOT_RENDERED;
        }

        // Pick

        let f3 = (visible && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = f0;
        tempUint8Array4 [1] = f1;
        tempUint8Array4 [2] = f2;
        tempUint8Array4 [3] = f3;
        // object flags
        textureState.texturePerObjectIdColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32 + 8);
        if (this._deferredSetFlagsActive || deferred) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            (subPortionId % 512) * 8 + 2, // xoffset
            Math.floor(subPortionId / 512), // yoffset
            1, // width
            1, //height
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            tempUint8Array4
        );
        // gl.bindTexture (gl.TEXTURE_2D, null);
    }

    _setDeferredFlags() {
    }

    _setFlags2(portionId, flags, deferred = false) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._subPortionSetFlags2(subPortionIds[i], flags, deferred);
        }
    }

    _subPortionSetFlags2(subPortionId, flags, deferred = false) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        const clippable = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 255 : 0;
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = clippable;
        tempUint8Array4 [1] = 0;
        tempUint8Array4 [2] = 1;
        tempUint8Array4 [3] = 2;
        // object flags2
        textureState.texturePerObjectIdColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32 + 12);
        if (this._deferredSetFlagsActive || deferred) {
            // console.log("_subPortionSetFlags2 set flags defer");
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            (subPortionId % 512) * 8 + 3, // xoffset
            Math.floor(subPortionId / 512), // yoffset
            1, // width
            1, //height
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            tempUint8Array4
        );
        // gl.bindTexture (gl.TEXTURE_2D, null);
    }

    _setDeferredFlags2() {
    }

    setOffset(portionId, offset) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._subPortionSetOffset(subPortionIds[i], offset);
        }
    }

    _subPortionSetOffset(subPortionId, offset) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        // if (!this.model.scene.entityOffsetsEnabled) {
        //     this.model.error("Entity#offset not enabled for this Viewer"); // See Viewer entityOffsetsEnabled
        //     return;
        // }
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempFloat32Array3 [0] = offset[0];
        tempFloat32Array3 [1] = offset[1];
        tempFloat32Array3 [2] = offset[2];
        // object offset
        textureState.texturePerObjectIdOffsets._textureData.set(tempFloat32Array3, subPortionId * 3);
        if (this._deferredSetFlagsActive) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectIdOffsets._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // x offset
            subPortionId, // yoffset
            1, // width
            1, // height
            gl.RGB,
            gl.FLOAT,
            tempFloat32Array3
        );
        // gl.bindTexture (gl.TEXTURE_2D, null);
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (frameCtx.withSAO && this.model.saoEnabled) {
            if (this._dataTextureRenderers.colorRendererWithSAO) {
                this._dataTextureRenderers.colorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
            }
        } else {
            if (this._dataTextureRenderers.colorRenderer) {
                this._dataTextureRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
            }
        }
    }

    _updateBackfaceCull(renderFlags, frameCtx) {
        const backfaces = this.model.backfaces || renderFlags.sectioned;
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
        if (this._dataTextureRenderers.colorRenderer) {
            this._dataTextureRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
        }
    }

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    drawDepth(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.depthRenderer) {
            this._dataTextureRenderers.depthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE); // Assume whatever post-effect uses depth (eg SAO) does not apply to transparent objects
        }
    }

    drawNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.normalsRenderer) {
            this._dataTextureRenderers.normalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);  // Assume whatever post-effect uses normals (eg SAO) does not apply to transparent objects
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.silhouetteRenderer) {
            this._dataTextureRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.silhouetteRenderer) {
            this._dataTextureRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.silhouetteRenderer) {
            this._dataTextureRenderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (this.model.scene.logarithmicDepthBufferEnabled) {
            if (!this.model.scene._loggedWarning) {
                console.log("Edge enhancement for SceneModel data texture layers currently disabled with logarithmic depth buffer");
                this.model.scene._loggedWarning = true;
            }
            return;
        }
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._dataTextureRenderers.edgesColorRenderer) {
            this._dataTextureRenderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0 || this._numTransparentLayerPortions === 0) {
            return;
        }
        if (this._dataTextureRenderers.edgesColorRenderer) {
            this._dataTextureRenderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._dataTextureRenderers.edgesRenderer) {
            this._dataTextureRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._dataTextureRenderers.edgesRenderer) {
            this._dataTextureRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._dataTextureRenderers.edgesRenderer) {
            this._dataTextureRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.occlusionRenderer) {
            this._dataTextureRenderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SHADOW BUFFER RENDERING -----------------------------------

    drawShadow(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.shadowRenderer) {
            this._dataTextureRenderers.shadowRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    setPickMatrices(pickViewMatrix, pickProjMatrix) {
        // if (this._numVisibleLayerPortions === 0) {
        //     return;
        // }
        // this._dataTextureState.texturePickCameraMatrices.updateViewMatrix(pickViewMatrix, pickProjMatrix);
    }

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.pickMeshRenderer) {
            this._dataTextureRenderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.pickDepthRenderer) {
            this._dataTextureRenderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawSnapInitDepthBuf(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.snapDepthBufInitRenderer) {
            this._dataTextureRenderers.snapDepthBufInitRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawSnapDepths(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.vertexDepthRenderer) {
            this._dataTextureRenderers.vertexDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.pickNormalsRenderer) {
            this._dataTextureRenderers.pickNormalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
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
