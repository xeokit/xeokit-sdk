import {ENTITY_FLAGS} from '../../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {getRenderers} from "./renderers/VBOBatchingPointsRenderers.js";
import {quantizePositions} from "../../../compression.js";

/**
 * @private
 */
export class VBOBatchingPointsLayer {

    /**
     * @param model
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.positionsDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     * @param cfg.origin
     * @param cfg.scratchMemory
     */
    constructor(cfg) {

     //   console.info("Creating VBOBatchingPointsLayer");

        /**
         * Owner model
         * @type {VBOSceneModel}
         */
        this.model = cfg.model;

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = "PointsBatchingLayer";

        /**
         * Index of this PointsBatchingLayer in {@link VBOSceneModel#_layerList}.
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        this._renderers = getRenderers(cfg.model.scene);

        const maxGeometryBatchSize = cfg.maxGeometryBatchSize || 5000000;

        const attribute = function() {
            const portions = [ ];

            return {
                append: function(data, times = 1, denormalizeScale = 1.0) {
                    portions.push({ data: data, times: times, denormalizeScale: denormalizeScale });
                },
                compileBuffer: function(type) {
                    let len = 0;
                    portions.forEach(p => { len += p.times * p.data.length; });
                    const buf = new type(len);

                    let begin = 0;
                    portions.forEach(p => {
                        const data = p.data;
                        const dScale = p.denormalizeScale;
                        const subBuf = buf.subarray(begin);

                        if (dScale === 1.0) {
                            subBuf.set(data, 0);
                        } else {
                            for (let i = 0; i < data.length; ++i) {
                                subBuf[i] = data[i] * dScale;
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
            maxVerts:   maxGeometryBatchSize,
            positions:  attribute(),
            colors:     attribute(),
            pickColors: attribute(),
            vertsIndex: 0
        };

        this._scratchMemory = cfg.scratchMemory;

        this._state = new RenderState({
            positionsBuf: null,
            offsetsBuf: null,
            colorsBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: math.mat4(),
            origin: null
        });

        // These counts are used to avoid unnecessary render passes
        this._numPortions = 0;
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._modelAABB = math.collapseAABB3(); // Model-space AABB
        this._portions = [];
        this._meshes = [];

        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;

        this._finalized = false;

        if (cfg.positionsDecodeMatrix) {
            this._state.positionsDecodeMatrix.set(cfg.positionsDecodeMatrix);
            this._preCompressedPositionsExpected = true;
        } else {
            this._preCompressedPositionsExpected = false;
        }

        if (cfg.origin) {
            this._state.origin = math.vec3(cfg.origin);
        }
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
     * Tests if there is room for another portion in this PointsBatchingLayer.
     *
     * @param lenPositions Number of positions we'd like to create in the portion.
     * @returns {Boolean} True if OK to create another portion.
     */
    canCreatePortion(lenPositions) {
        if (this._finalized) {
            throw "Already finalized";
        }
        return (this._buffer.vertsIndex + (lenPositions / 3)) <= this._buffer.maxVerts;
    }

    /**
     * Creates a new portion within this PointsBatchingLayer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.positionsCompressed Flat quantized positions array - decompressed with PointsBatchingLayer positionsDecodeMatrix
     * @param [cfg.colorsCompressed] Quantized RGB colors [0..255,0..255,0..255,0..255]
     * @param [cfg.colors] Flat float colors array.
     * @param cfg.color Float RGB color [0..1,0..1,0..1]
     * @param [cfg.meshMatrix] Flat float 4x4 matrix
     * @param cfg.aabb Flat float AABB World-space AABB
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;

        const positions = this._preCompressedPositionsExpected ? cfg.positionsCompressed : cfg.positions;
        if (! positions) {
            throw ((this._preCompressedPositionsExpected ? "positionsCompressed" : "positions") + " expected");
        }

        buffer.positions.append(positions);

        const numVerts = positions.length / 3;

        const color = cfg.color;
        const colorsCompressed = cfg.colorsCompressed;
        const colors = cfg.colors;
        const pickColor = cfg.pickColor;

        if (colorsCompressed) {
            buffer.colors.append(colorsCompressed);
        } else if (colors) {
            buffer.colors.append(colors, 1, 255.0);
        } else if (color) {
            // Color is pre-quantized by VBOSceneModel
            buffer.colors.append([ color[0], color[1], color[2], 1.0 ], numVerts);
        }

        buffer.pickColors.append(pickColor.slice(0, 4), numVerts);

        math.expandAABB3(this._modelAABB, cfg.aabb);

        const portionId = this._portions.length / 2;

        this._portions.push(this._buffer.vertsIndex);
        this._portions.push(numVerts);
        this._buffer.vertsIndex += numVerts;

        this._numPortions++;
        this.model.numPortions++;
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
        const maybeCreateGlBuffer = (srcData, size, usage) => (srcData.length > 0) ? new ArrayBuf(gl, gl.ARRAY_BUFFER, srcData, srcData.length, size, usage) : null;

        const positions = (this._preCompressedPositionsExpected
                           ? buffer.positions.compileBuffer(Uint16Array)
                           : (quantizePositions(buffer.positions.compileBuffer(Float32Array), this._modelAABB, state.positionsDecodeMatrix)));
        state.positionsBuf  = maybeCreateGlBuffer(positions, 3, gl.STATIC_DRAW);

        state.flagsBuf      = maybeCreateGlBuffer(new Float32Array(this._buffer.vertsIndex), 1, gl.DYNAMIC_DRAW); // Because we build flags arrays here, get their length from the positions array

        state.colorsBuf     = maybeCreateGlBuffer(buffer.colors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        state.pickColorsBuf = maybeCreateGlBuffer(buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        state.offsetsBuf    = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(new Float32Array(this._buffer.vertsIndex * 3), 3, gl.DYNAMIC_DRAW) : null;

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
        // Not applicable to point clouds
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
        const portionsIdx = portionId * 2;
        const vertexBase = this._portions[portionsIdx];
        const numVerts = this._portions[portionsIdx + 1];
        const firstColor = vertexBase * 4;
        const lenColor = numVerts * 4;
        const tempArray = this._scratchMemory.getUInt8Array(lenColor);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        for (let i = 0; i < lenColor; i += 4) {
            tempArray[i + 0] = r;
            tempArray[i + 1] = g;
            tempArray[i + 2] = b;
        }
        this._state.colorsBuf.setData(tempArray, firstColor, lenColor);
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
    _setFlags(portionId, flags, transparent) {

        if (!this._finalized) {
            throw "Not finalized";
        }

        const portionsIdx = portionId * 2;
        const vertexBase = this._portions[portionsIdx];
        const numVerts = this._portions[portionsIdx + 1];
        const firstFlag = vertexBase;
        const lenFlags = numVerts;
        const tempArray = this._scratchMemory.getFloat32Array(lenFlags);

        const visible = !!(flags & ENTITY_FLAGS.VISIBLE);
        const xrayed = !!(flags & ENTITY_FLAGS.XRAYED);
        const highlighted = !!(flags & ENTITY_FLAGS.HIGHLIGHTED);
        const selected = !!(flags & ENTITY_FLAGS.SELECTED);
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

        let pickFlag = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        const clippableFlag = !!(flags & ENTITY_FLAGS.CLIPPABLE) ? 1 : 0;

        for (let i = 0; i < lenFlags; i++) {
            let vertFlag = 0;
            vertFlag |= colorFlag;
            vertFlag |= silhouetteFlag << 4;
            // no edges
            vertFlag |= pickFlag << 12;
            vertFlag |= clippableFlag << 16;

            tempArray[i] = vertFlag;
        }

        this._state.flagsBuf.setData(tempArray, firstFlag);
    }

    setOffset(portionId, offset) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (!this.model.scene.entityOffsetsEnabled) {
            this.model.error("Entity#offset not enabled for this Viewer"); // See Viewer entityOffsetsEnabled
            return;
        }
        const portionsIdx = portionId * 2;
        const vertexBase = this._portions[portionsIdx];
        const numVerts = this._portions[portionsIdx + 1];
        const firstOffset = vertexBase * 3;
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
        this._state.offsetsBuf.setData(tempArray, firstOffset, lenOffsets);
    }

    //-- NORMAL RENDERING ----------------------------------------------------------------------------------------------

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

    // -- EMPHASIS RENDERING -------------------------------------------------------------------------------------------

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

    //---- OCCLUSION TESTING -------------------------------------------------------------------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._renderers.occlusionRenderer) {
            this._renderers.occlusionRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //---- SHADOWS -----------------------------------------------------------------------------------------------------

    drawShadow(renderFlags, frameCtx) {
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
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        state.destroy();
    }
}
