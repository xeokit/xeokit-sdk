import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';
import {math} from "../../../math/math.js";
import {RenderState} from "../../../webgl/RenderState.js";
import {getRenderers} from "./renderers/DTXLinesRenderers.js";
import {DTXLinesBuffer} from "./DTXLinesBuffer.js";
import {DTXLinesState} from "./DTXLinesState.js"
import {DTXLinesTextureFactory} from "./DTXLinesTextureFactory.js";
import {dataTextureRamStats} from "./dataTextureRamStats.js";
import {Configs} from "../../../../Configs.js";

const configs = new Configs();

const MAX_NUMBER_OF_OBJECTS_IN_LAYER = (1 << 16);
const MAX_DATA_TEXTURE_HEIGHT = configs.maxDataTextureHeight;
const INDICES_EDGE_INDICES_ALIGNEMENT_SIZE = 8;
const MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE = 10;

const tempMat4a = new Float32Array(16);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

let numLayers = 0;

const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXLinesLayer {

    constructor(model, cfg) {

      //  console.info("Creating DTXLinesLayer");

        dataTextureRamStats.numberOfLayers++;

        this._layerNumber = numLayers++;
        this.sortId = `TriDTX-${this._layerNumber}`; // State sorting key.
        this.layerIndex = cfg.layerIndex; // Index of this DTXLinesLayer in {@link SceneModel#_layerList}.
        this._renderers = getRenderers(model.scene);
        this.model = model;
        this._buffer = new DTXLinesBuffer();
        this._dataTextureState = new DTXLinesState();
        this._dataTextureGenerator = new DTXLinesTextureFactory();

        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            textureState: this._dataTextureState,
            numIndices8Bits: 0,
            numIndices16Bits: 0,
            numIndices32Bits: 0,
            numVertices: 0,
        });

        this._numPortions = 0;        // These counts are used to avoid unnecessary render passes
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._subPortions = [];
        this._portionToSubPortionsMap = [];
        this._bucketGeometries = {};
        this._meshes = [];
        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;
        this._numUpdatesInFrame = 0;

        /**
         * The type of primitives in this layer.
         */
        this.primitive = cfg.primitive;

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

    canCreatePortion(portionCfg) {
        if (this._finalized) {
            throw "Already finalized";
        }
        const numNewPortions = portionCfg.buckets.length;
        if ((this._numPortions + numNewPortions) > MAX_NUMBER_OF_OBJECTS_IN_LAYER) {
            dataTextureRamStats.cannotCreatePortion.because10BitsObjectId++;
        }
        let retVal = (this._numPortions + numNewPortions) <= MAX_NUMBER_OF_OBJECTS_IN_LAYER;
        const bucketIndex = 0; // TODO: Is this a bug?
        const bucketGeometryId = portionCfg.geometryId !== undefined && portionCfg.geometryId !== null
            ? `${portionCfg.geometryId}#${bucketIndex}`
            : `${portionCfg.id}#${bucketIndex}`;
        const alreadyHasPortionGeometry = this._bucketGeometries[bucketGeometryId];
        if (!alreadyHasPortionGeometry) {
            const maxIndicesOfAnyBits = Math.max(this._state.numIndices8Bits, this._state.numIndices16Bits, this._state.numIndices32Bits,);
            let numVertices = 0;
            let numIndices = 0;
            portionCfg.buckets.forEach(bucket => {
                numVertices += bucket.positionsCompressed.length / 3;
                numIndices += bucket.indices.length / 2;
            });
            if ((this._state.numVertices + numVertices) > MAX_DATA_TEXTURE_HEIGHT * 4096 ||
                (maxIndicesOfAnyBits + numIndices) > MAX_DATA_TEXTURE_HEIGHT * 4096) {
                dataTextureRamStats.cannotCreatePortion.becauseTextureSize++;
            }
            retVal &&=
                (this._state.numVertices + numVertices) <= MAX_DATA_TEXTURE_HEIGHT * 4096 &&
                (maxIndicesOfAnyBits + numIndices) <= MAX_DATA_TEXTURE_HEIGHT * 4096;
        }
        return retVal;
    }

    createPortion(mesh, portionCfg) {
        if (this._finalized) {
            throw "Already finalized";
        }
        const subPortionIds = [];
        //   const portionAABB = portionCfg.worldAABB;
        portionCfg.buckets.forEach((bucket, bucketIndex) => {
            const bucketGeometryId = portionCfg.geometryId !== undefined && portionCfg.geometryId !== null
                ? `${portionCfg.geometryId}#${bucketIndex}`
                : `${portionCfg.id}#${bucketIndex}`;
            let bucketGeometry = this._bucketGeometries[bucketGeometryId];
            if (!bucketGeometry) {
                bucketGeometry = this._createBucketGeometry(portionCfg, bucket);
                this._bucketGeometries[bucketGeometryId] = bucketGeometry;
            }
            //  const subPortionAABB = math.collapseAABB3(tempAABB3b);
            const subPortionId = this._createSubPortion(portionCfg, bucketGeometry, bucket);
            //math.expandAABB3(portionAABB, subPortionAABB);
            subPortionIds.push(subPortionId);
        });
        const portionId = this._portionToSubPortionsMap.length;
        this._portionToSubPortionsMap.push(subPortionIds);
        this.model.numPortions++;
        this._meshes.push(mesh);
        return portionId;
    }

    _createBucketGeometry(portionCfg, bucket) {
        if (bucket.indices) {
            const alignedIndicesLen = Math.ceil((bucket.indices.length / 2) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 2;
            dataTextureRamStats.overheadSizeAlignementIndices += 2 * (alignedIndicesLen - bucket.indices.length);
            const alignedIndices = new Uint32Array(alignedIndicesLen);
            alignedIndices.fill(0);
            alignedIndices.set(bucket.indices);
            bucket.indices = alignedIndices;
        }
        const positionsCompressed = bucket.positionsCompressed;
        const indices = bucket.indices;
        const buffer = this._buffer;
        buffer.positionsCompressed.push(positionsCompressed)
        const vertexBase = buffer.lenPositionsCompressed / 3;
        const numVertices = positionsCompressed.length / 3;
        buffer.lenPositionsCompressed += positionsCompressed.length;
        let indicesBase;
        let numLines = 0;
        if (indices) {
            numLines = indices.length / 2;
            let indicesBuffer;
            if (numVertices <= (1 << 8)) {
                indicesBuffer = buffer.indices8Bits;
                indicesBase = buffer.lenIndices8Bits / 2;
                buffer.lenIndices8Bits += indices.length;
            } else if (numVertices <= (1 << 16)) {
                indicesBuffer = buffer.indices16Bits;
                indicesBase = buffer.lenIndices16Bits / 2;
                buffer.lenIndices16Bits += indices.length;
            } else {
                indicesBuffer = buffer.indices32Bits;
                indicesBase = buffer.lenIndices32Bits / 2;
                buffer.lenIndices32Bits += indices.length;
            }
            indicesBuffer.push(indices);
        }
        this._state.numVertices += numVertices;
        dataTextureRamStats.numberOfGeometries++;
        const bucketGeometry = {
            vertexBase,
            numVertices,
            numLines,
            indicesBase
        };
        return bucketGeometry;
    }

    _createSubPortion(portionCfg, bucketGeometry) {
        const color = portionCfg.color;
        const colors = portionCfg.colors;
        const opacity = portionCfg.opacity;
        const meshMatrix = portionCfg.meshMatrix;
        const pickColor = portionCfg.pickColor;
        const buffer = this._buffer;
        const state = this._state;
        buffer.perObjectPositionsDecodeMatrices.push(portionCfg.positionsDecodeMatrix);
        buffer.perObjectInstancePositioningMatrices.push(meshMatrix || DEFAULT_MATRIX);
        buffer.perObjectSolid.push(!!portionCfg.solid);
        if (colors) {
            buffer.perObjectColors.push([colors[0] * 255, colors[1] * 255, colors[2] * 255, 255]);
        } else if (color) { // Color is pre-quantized by SceneModel
            buffer.perObjectColors.push([color[0], color[1], color[2], opacity]);
        }
        buffer.perObjectPickColors.push(pickColor);
        buffer.perObjectVertexBases.push(bucketGeometry.vertexBase);
        {
            let currentNumIndices;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                currentNumIndices = state.numIndices8Bits;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                currentNumIndices = state.numIndices16Bits;
            } else {
                currentNumIndices = state.numIndices32Bits;
            }
            buffer.perObjectIndexBaseOffsets.push(currentNumIndices / 2 - bucketGeometry.indicesBase);
        }
        const subPortionId = this._subPortions.length;
        if (bucketGeometry.numLines > 0) {
            let numIndices = bucketGeometry.numLines * 2;
            let indicesPortionIdBuffer;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                indicesPortionIdBuffer = buffer.perLineNumberPortionId8Bits;
                state.numIndices8Bits += numIndices;
                dataTextureRamStats.totalLines8Bits += bucketGeometry.numLines;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                indicesPortionIdBuffer = buffer.perLineNumberPortionId16Bits;
                state.numIndices16Bits += numIndices;
                dataTextureRamStats.totalLines16Bits += bucketGeometry.numLines;
            } else {
                indicesPortionIdBuffer = buffer.perLineNumberPortionId32Bits;
                state.numIndices32Bits += numIndices;
                dataTextureRamStats.totalLines32Bits += bucketGeometry.numLines;
            }
            dataTextureRamStats.totalLines += bucketGeometry.numLines;
            for (let i = 0; i < bucketGeometry.numLines; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                indicesPortionIdBuffer.push(subPortionId);
            }
        }
        this._subPortions.push({
            // vertsBase: vertsIndex,
            numVertices: bucketGeometry.numLines
        });
        this._numPortions++;
        dataTextureRamStats.numberOfPortions++;
        return subPortionId;
    }

    /**
     * Builds data textures from the appended geometries and loads them into the GPU.
     *
     * No more portions can then be created.
     */
    finalize() {
        if (this._finalized) {
            return;
        }
        const state = this._state;
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;
        state.gl = gl;
        textureState.texturePerObjectColorsAndFlags = this._dataTextureGenerator.generateTextureForColorsAndFlags(
            gl,
            buffer.perObjectColors,
            buffer.perObjectPickColors,
            buffer.perObjectVertexBases,
            buffer.perObjectIndexBaseOffsets,
            buffer.perObjectSolid);
        textureState.texturePerObjectInstanceMatrices = this._dataTextureGenerator.generateTextureForInstancingMatrices(gl, buffer.perObjectInstancePositioningMatrices);
        textureState.texturePerObjectPositionsDecodeMatrix = this._dataTextureGenerator.generateTextureForPositionsDecodeMatrices(gl, buffer.perObjectPositionsDecodeMatrices);
        textureState.texturePerVertexIdCoordinates = this._dataTextureGenerator.generateTextureForPositions(gl, buffer.positionsCompressed, buffer.lenPositionsCompressed);
        textureState.texturePerLineIdPortionIds8Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(gl, buffer.perLineNumberPortionId8Bits);
        textureState.texturePerLineIdPortionIds16Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(gl, buffer.perLineNumberPortionId16Bits);
        textureState.texturePerLineIdPortionIds32Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(gl, buffer.perLineNumberPortionId32Bits);
        if (buffer.lenIndices8Bits > 0) {
            textureState.texturePerLineIdIndices8Bits = this._dataTextureGenerator.generateTextureFor8BitIndices(gl, buffer.indices8Bits, buffer.lenIndices8Bits);
        }
        if (buffer.lenIndices16Bits > 0) {
            textureState.texturePerLineIdIndices16Bits = this._dataTextureGenerator.generateTextureFor16BitIndices(gl, buffer.indices16Bits, buffer.lenIndices16Bits);
        }
        if (buffer.lenIndices32Bits > 0) {
            textureState.texturePerLineIdIndices32Bits = this._dataTextureGenerator.generateTextureFor32BitIndices(gl, buffer.indices32Bits, buffer.lenIndices32Bits);
        }
        textureState.finalize();
        // Free up memory
        this._buffer = null;
        this._bucketGeometries = {};
        this._finalized = true;
        this._deferredSetFlagsDirty = false; //
        this._onSceneRendering = this.model.scene.on("rendering", () => {
            if (this._deferredSetFlagsDirty) {
                this._uploadDeferredFlags();
            }
            this._numUpdatesInFrame = 0;
        });
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
        const deferred = true;
        this._setFlags(portionId, flags, meshTransparent, deferred);
        this._setFlags2(portionId, flags, deferred);
    }

    flushInitFlags() {
        this._setDeferredFlags();
        this._setDeferredFlags2();
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
        this._deferredSetFlagsActive = false;
        if (!this._deferredSetFlagsDirty) {
            return;
        }
        this._deferredSetFlagsDirty = false;
        const gl = this.model.scene.canvas.gl;
        const textureState = this._dataTextureState;
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectColorsAndFlags._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // xoffset
            0, // yoffset
            textureState.texturePerObjectColorsAndFlags._textureWidth, // width
            textureState.texturePerObjectColorsAndFlags._textureHeight, // width
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            textureState.texturePerObjectColorsAndFlags._textureData
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
        textureState.texturePerObjectColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32);
        if (this._deferredSetFlagsActive) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectColorsAndFlags._texture);
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

        // // Edges
        //
        // let f2 = 0;
        // if (!visible || culled) {
        //     f2 = RENDER_PASSES.NOT_RENDERED;
        // } else if (selected) {
        //     f2 = RENDER_PASSES.EDGES_SELECTED;
        // } else if (highlighted) {
        //     f2 = RENDER_PASSES.EDGES_HIGHLIGHTED;
        // } else if (xrayed) {
        //     f2 = RENDER_PASSES.EDGES_XRAYED;
        // } else if (edges) {
        //     if (transparent) {
        //         f2 = RENDER_PASSES.EDGES_COLOR_TRANSPARENT;
        //     } else {
        //         f2 = RENDER_PASSES.EDGES_COLOR_OPAQUE;
        //     }
        // } else {
        //     f2 = RENDER_PASSES.NOT_RENDERED;
        // }

        // Pick

        let f3 = (visible && (!culled) && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = f0;
        tempUint8Array4 [1] = f1;
       // tempUint8Array4 [2] = f2;
        tempUint8Array4 [3] = f3;
        // object flags
        textureState.texturePerObjectColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32 + 8);
        if (this._deferredSetFlagsActive || deferred) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectColorsAndFlags._texture);
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
        textureState.texturePerObjectColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32 + 12);
        if (this._deferredSetFlagsActive || deferred) {
            // console.log("_subPortionSetFlags2 set flags defer");
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectColorsAndFlags._texture);
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
        textureState.texturePerObjectOffsets._textureData.set(tempFloat32Array3, subPortionId * 3);
        if (this._deferredSetFlagsActive) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectOffsets._texture);
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

    setMatrix(portionId, matrix) {
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            this._subPortionSetMatrix(subPortionIds[i], matrix);
        }
    }

    _subPortionSetMatrix(subPortionId, matrix) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        // if (!this.model.scene.entityMatrixsEnabled) {
        //     this.model.error("Entity#matrix not enabled for this Viewer"); // See Viewer entityMatrixsEnabled
        //     return;
        // }
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        tempMat4a.set(matrix);
        textureState.texturePerObjectInstanceMatrices._textureData.set(tempMat4a, subPortionId * 16);
        if (this._deferredSetFlagsActive) {
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectInstanceMatrices._texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            (subPortionId % 512) * 4, // xoffset
            Math.floor(subPortionId / 512), // yoffset
            // 1,
            4, // width
            1, // height
            gl.RGBA,
            gl.FLOAT,
            tempMat4a
        );
        // gl.bindTexture (gl.TEXTURE_2D, null);
    }

    // ---------------------- COLOR RENDERING -----------------------------------

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

    drawDepth(renderFlags, frameCtx) {
    }

    drawNormals(renderFlags, frameCtx) {
    }

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        // if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
        //     return;
        // }
        // if (this._renderers.silhouetteRenderer) {
        //     this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_XRAYED);
        // }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        // if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
        //     return;
        // }
        // if (this._renderers.silhouetteRenderer) {
        //     this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        // }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        // if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
        //     return;
        // }
        // if (this._renderers.silhouetteRenderer) {
        //     this._renderers.silhouetteRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SILHOUETTE_SELECTED);
        // }
    }

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

    drawOcclusion(renderFlags, frameCtx) {
    }

    drawShadow(renderFlags, frameCtx) {
    }

    setPickMatrices(pickViewMatrix, pickProjMatrix) {
    }

    drawPickMesh(renderFlags, frameCtx) {
    }

    drawPickDepths(renderFlags, frameCtx) {
    }

    drawSnapInit(renderFlags, frameCtx) {
    }

    drawSnap(renderFlags, frameCtx) {
    }

    drawPickNormals(renderFlags, frameCtx) {
    }

    destroy() {
        if (this._destroyed) {
            return;
        }
        const state = this._state;
        this.model.scene.off(this._onSceneRendering);
        state.destroy();
        this._destroyed = true;
    }
}
