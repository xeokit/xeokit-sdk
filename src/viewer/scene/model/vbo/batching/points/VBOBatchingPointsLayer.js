import {ENTITY_FLAGS} from '../../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {getPointsRenderers} from "../../renderers/VBOPointsRenderers.js";
import {Configs} from "../../../../../Configs.js";
import {quantizePositions} from "../../../compression.js";

const configs = new Configs();

/**
 * @private
 */
export class VBOBatchingPointsLayer {

    /**
     * @param cfg
     * @param cfg.model
     * @param cfg.layerIndex
     * @param cfg.primitive
     * @param cfg.positionsDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     * @param cfg.origin
     * @param cfg.scratchMemory
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
         * State sorting key.
         * @type {string}
         */
        this.sortId = "PointsBatchingLayer";

        this._renderers = getPointsRenderers(cfg.model.scene, false);

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
            maxVerts:   maxGeometryBatchSize,
            positions:  attribute(),
            colors:     attribute(),
            pickColors: attribute(),
        };
        this._scratchMemory = cfg.scratchMemory;

        this._state = new RenderState({
            origin: cfg.origin && math.vec3(cfg.origin),
            positionsBuf: null,
            colorsBuf: null,
            offsetsBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: cfg.positionsDecodeMatrix && math.mat4(cfg.positionsDecodeMatrix),
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
        this._numVerts = 0;

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
     * @returns {Boolean} True if OK to create another portion.
     */
    canCreatePortion(lenPositions) {
        if (this._finalized) {
            throw "Already finalized";
        }
        return (this._numVerts + (lenPositions / 3)) <= this._buffer.maxVerts;
    }

    /**
     * Creates a new portion within this Layer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.positionsCompressed Flat quantized positions array - decompressed with positionsDecodeMatrix
     * @param [cfg.colorsCompressed] Quantized RGB colors [0..255,0..255,0..255,0..255]
     * @param [cfg.colors] Flat float colors array.
     * @param cfg.color Float RGB color [0..1,0..1,0..1]
     * @param cfg.aabb Flat float AABB World-space AABB
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;

        const positions = this._state.positionsDecodeMatrix ? cfg.positionsCompressed : cfg.positions;
        if (! positions) {
            throw ((this._state.positionsDecodeMatrix ? "positionsCompressed" : "positions") + " expected");
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

        const portionId = this._portions.length;

        const portion = {
            vertsBaseIndex: this._numVerts,
            numVerts: numVerts,
        };

        this._portions.push(portion);
        this._numPortions++;
        this.model.numPortions++;
        this._numVerts += numVerts;
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

        state.flagsBuf      = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._numVerts), 1, gl.DYNAMIC_DRAW);

        state.colorsBuf     = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.colors.compileBuffer(Uint8Array), 4, gl.DYNAMIC_DRAW);

        state.offsetsBuf    = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._numVerts * 3), 3, gl.DYNAMIC_DRAW) : null;

        state.pickColorsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

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
        const deferred = false;
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

        if (deferred) {
            // Avoid zillions of individual WebGL bufferSubData calls - buffer them to apply in one shot
            if (!this._deferredFlagValues) {
                this._deferredFlagValues = new Float32Array(this._numVerts);
            }
            for (let i = firstFlag, len = (firstFlag + lenFlags); i < len; i++) {
                let vertFlag = 0;
                vertFlag |= colorFlag;
                vertFlag |= silhouetteFlag << 4;
                // no edges
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
                // no edges
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
        const portionsIdx = portionId;
        const portion = this._portions[portionsIdx];
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
    }

    __drawLayer(renderFlags, frameCtx, renderer, pass) {
        if ((this._numCulledLayerPortions < this._numPortions) && (this._numVisibleLayerPortions > 0)) {
            renderer.drawLayer(frameCtx, this, pass);
        }
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    __drawColor(renderFlags, frameCtx, renderOpaque) {
        if (((renderOpaque ? (this._numTransparentLayerPortions < this._numPortions) : (this._numTransparentLayerPortions > 0)))
            &&
            (this._numXRayedLayerPortions < this._numPortions)) {
            const renderer = this._renderers.colorRenderer;
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

    drawDepth(renderFlags, frameCtx) {
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
        this.__drawLayer(renderFlags, frameCtx, this._renderers.pickMeshRenderer, RENDER_PASSES.PICK);
    }

    drawPickDepths(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.pickDepthRenderer, RENDER_PASSES.PICK);
    }

    drawPickNormals(renderFlags, frameCtx) {
    }

    drawSnapInit(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.snapInitRenderer, RENDER_PASSES.PICK);
    }

    drawSnap(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.snapRenderer, RENDER_PASSES.PICK);
    }


    drawOcclusion(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.occlusionRenderer, RENDER_PASSES.COLOR_OPAQUE);
    }

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
