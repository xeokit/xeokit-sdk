import {math} from "../../../math/math.js";
import {RenderState} from "../../../webgl/RenderState.js";
import {Configs} from "../../../../Configs.js";
import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';
import {getRenderers} from "./renderers/DTXTrianglesRenderers.js";
import {DTXTrianglesBuffer} from "./lib/DTXTrianglesBuffer.js";
import {DTXTrianglesState} from "./lib/DTXTrianglesState.js"
import {dataTextureRamStats} from "./lib/dataTextureRamStats.js";
import {DTXTrianglesTextureFactory} from "./lib/DTXTrianglesTextureFactory.js";

const configs = new Configs();

/**
 * 12-bits allowed for object ids.
 * Limits the per-object texture height in the layer.
 */
const MAX_NUMBER_OF_OBJECTS_IN_LAYER = (1 << 16);

/**
 * 4096 is max data texture height.
 * Limits the aggregated geometry texture height in the layer.
 */
const MAX_DATA_TEXTURE_HEIGHT = configs.maxDataTextureHeight;

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

const tempVec4a = math.vec4();
const tempMat4a = new Float32Array(16);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

let numLayers = 0;

const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXTrianglesLayer {

    constructor(model, cfg) {

        //console.info("Creating DTXTrianglesLayer");

        dataTextureRamStats.numberOfLayers++;

        this._layerNumber = numLayers++;
        this.sortId = `TriDTX-${this._layerNumber}`; // State sorting key.
        this.layerIndex = cfg.layerIndex; // Index of this TrianglesDataTextureLayer in {@link SceneModel#_layerList}.

        this._renderers = getRenderers(model.scene);
        this.model = model;
        this._buffer = new DTXTrianglesBuffer();
        this._dtxState = new DTXTrianglesState();
        this._dtxTextureFactory = new DTXTrianglesTextureFactory();

        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            metallicRoughnessBuf: null,
            textureState: this._dtxState,
            numIndices8Bits: 0,
            numIndices16Bits: 0,
            numIndices32Bits: 0,
            numEdgeIndices8Bits: 0,
            numEdgeIndices16Bits: 0,
            numEdgeIndices32Bits: 0,
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

        this._subPortions = [];

        if (this.model.scene.readableGeometryEnabled) {
            this._subPortionReadableGeometries = {};
        }

        /**
         * Due to `index rebucketting` process in ```prepareMeshGeometry``` function, it's possible that a single
         * portion is expanded to more than 1 real sub-portion.
         *
         * This Array tracks the mapping between:
         *
         * - external `portionIds` as seen by consumers of this class.
         * - internal `sub-portionIds` actually managed by this class.
         *
         * The outer index of this array is the externally seen `portionId`.
         * The inner value of the array, are `sub-portionIds` corresponding to the `portionId`.
         */
        this._portionToSubPortionsMap = [];

        this._bucketGeometries = {};

        this._meshes = [];

        /**
         * The axis-aligned World-space boundary of this TrianglesDataTextureLayer's positions.
         */
        this._aabb = math.collapseAABB3();
        this.aabbDirty = true;

        /**
         * The number of updates in the current frame;
         */
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

    /**
     * Returns whether the ```TrianglesDataTextureLayer``` has room for more portions.
     *
     * @param {object} portionCfg An object containing the geometrical data (`positions`, `indices`, `edgeIndices`) for the portion.
     * @returns {Boolean} Wheter the requested portion can be created
     */
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
                numIndices += bucket.indices.length / 3;
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

    /**
     * Creates a new portion within this TrianglesDataTextureLayer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param portionCfg.positionsCompressed Flat float Local-space positionsCompressed array.
     * @param [portionCfg.normals] Flat float normals array.
     * @param [portionCfg.colors] Flat float colors array.
     * @param portionCfg.indices  Flat int indices array.
     * @param [portionCfg.edgeIndices] Flat int edges indices array.
     * @param portionCfg.color Quantized RGB color [0..255,0..255,0..255,0..255]
     * @param portionCfg.metallic Metalness factor [0..255]
     * @param portionCfg.roughness Roughness factor [0..255]
     * @param portionCfg.opacity Opacity [0..255]
     * @param [portionCfg.meshMatrix] Flat float 4x4 matrix - transforms the portion within the coordinate system that's local to the SceneModel
     * @param portionCfg.worldAABB Flat float AABB World-space AABB
     * @param portionCfg.pickColor Quantized pick color
     * @returns {number} Portion ID
     */
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

        // Indices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the triangles of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)

        if (bucket.indices) {
            const alignedIndicesLen = Math.ceil((bucket.indices.length / 3) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 3;
            dataTextureRamStats.overheadSizeAlignementIndices += 2 * (alignedIndicesLen - bucket.indices.length);
            const alignedIndices = new Uint32Array(alignedIndicesLen);
            alignedIndices.fill(0);
            alignedIndices.set(bucket.indices);
            bucket.indices = alignedIndices;
        }

        // EdgeIndices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the edges of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)

        if (bucket.edgeIndices) {
            const alignedEdgeIndicesLen = Math.ceil((bucket.edgeIndices.length / 2) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 2;
            dataTextureRamStats.overheadSizeAlignementEdgeIndices += 2 * (alignedEdgeIndicesLen - bucket.edgeIndices.length);
            const alignedEdgeIndices = new Uint32Array(alignedEdgeIndicesLen);
            alignedEdgeIndices.fill(0);
            alignedEdgeIndices.set(bucket.edgeIndices);
            bucket.edgeIndices = alignedEdgeIndices;
        }

        const positionsCompressed = bucket.positionsCompressed;
        const indices = bucket.indices;
        const edgeIndices = bucket.edgeIndices;
        const buffer = this._buffer;

        buffer.positionsCompressed.push(positionsCompressed)
        const vertexBase = buffer.lenPositionsCompressed / 3;
        const numVertices = positionsCompressed.length / 3;
        buffer.lenPositionsCompressed += positionsCompressed.length;

        let indicesBase;
        let numTriangles = 0;
        if (indices) {
            numTriangles = indices.length / 3;
            let indicesBuffer;
            if (numVertices <= (1 << 8)) {
                indicesBuffer = buffer.indices8Bits;
                indicesBase = buffer.lenIndices8Bits / 3;
                buffer.lenIndices8Bits += indices.length;
            } else if (numVertices <= (1 << 16)) {
                indicesBuffer = buffer.indices16Bits;
                indicesBase = buffer.lenIndices16Bits / 3;
                buffer.lenIndices16Bits += indices.length;
            } else {
                indicesBuffer = buffer.indices32Bits;
                indicesBase = buffer.lenIndices32Bits / 3;
                buffer.lenIndices32Bits += indices.length;
            }
            indicesBuffer.push(indices);
        }

        let edgeIndicesBase;
        let numEdges = 0;
        if (edgeIndices) {
            numEdges = edgeIndices.length / 2;
            let edgeIndicesBuffer;
            if (numVertices <= (1 << 8)) {
                edgeIndicesBuffer = buffer.edgeIndices8Bits;
                edgeIndicesBase = buffer.lenEdgeIndices8Bits / 2;
                buffer.lenEdgeIndices8Bits += edgeIndices.length;
            } else if (numVertices <= (1 << 16)) {
                edgeIndicesBuffer = buffer.edgeIndices16Bits;
                edgeIndicesBase = buffer.lenEdgeIndices16Bits / 2;
                buffer.lenEdgeIndices16Bits += edgeIndices.length;
            } else {
                edgeIndicesBuffer = buffer.edgeIndices32Bits;
                edgeIndicesBase = buffer.lenEdgeIndices32Bits / 2;
                buffer.lenEdgeIndices32Bits += edgeIndices.length;
            }
            edgeIndicesBuffer.push(edgeIndices);
        }

        this._state.numVertices += numVertices;

        dataTextureRamStats.numberOfGeometries++;

        const bucketGeometry = {
            vertexBase,
            numVertices,
            numTriangles,
            numEdges,
            indicesBase,
            edgeIndicesBase
        };

        return bucketGeometry;
    }

    _createSubPortion(portionCfg, bucketGeometry, bucket, subPortionAABB) {

        const color = portionCfg.color;
        const metallic = portionCfg.metallic;
        const roughness = portionCfg.roughness;
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
            buffer.perObjectIndexBaseOffsets.push(currentNumIndices / 3 - bucketGeometry.indicesBase);
        }

        {
            let currentNumEdgeIndices;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                currentNumEdgeIndices = state.numEdgeIndices8Bits;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                currentNumEdgeIndices = state.numEdgeIndices16Bits;
            } else {
                currentNumEdgeIndices = state.numEdgeIndices32Bits;
            }
            buffer.perObjectEdgeIndexBaseOffsets.push(currentNumEdgeIndices / 2 - bucketGeometry.edgeIndicesBase);
        }

        const subPortionId = this._subPortions.length;
        if (bucketGeometry.numTriangles > 0) {
            let numIndices = bucketGeometry.numTriangles * 3;
            let indicesPortionIdBuffer;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId8Bits;
                state.numIndices8Bits += numIndices;
                dataTextureRamStats.totalPolygons8Bits += bucketGeometry.numTriangles;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId16Bits;
                state.numIndices16Bits += numIndices;
                dataTextureRamStats.totalPolygons16Bits += bucketGeometry.numTriangles;
            } else {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId32Bits;
                state.numIndices32Bits += numIndices;
                dataTextureRamStats.totalPolygons32Bits += bucketGeometry.numTriangles;
            }
            dataTextureRamStats.totalPolygons += bucketGeometry.numTriangles;
            for (let i = 0; i < bucketGeometry.numTriangles; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                indicesPortionIdBuffer.push(subPortionId);
            }
        }

        if (bucketGeometry.numEdges > 0) {
            let numEdgeIndices = bucketGeometry.numEdges * 2;
            let edgeIndicesPortionIdBuffer;
            if (bucketGeometry.numVertices <= (1 << 8)) {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId8Bits;
                state.numEdgeIndices8Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges8Bits += bucketGeometry.numEdges;
            } else if (bucketGeometry.numVertices <= (1 << 16)) {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId16Bits;
                state.numEdgeIndices16Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges16Bits += bucketGeometry.numEdges;
            } else {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId32Bits;
                state.numEdgeIndices32Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges32Bits += bucketGeometry.numEdges;
            }
            dataTextureRamStats.totalEdges += bucketGeometry.numEdges;
            for (let i = 0; i < bucketGeometry.numEdges; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                edgeIndicesPortionIdBuffer.push(subPortionId);
            }
        }

        //   buffer.perObjectOffsets.push([0, 0, 0]);

        this._subPortions.push({
            // vertsBase: vertsIndex,
            numVertices: bucketGeometry.numTriangles
        });

        if (this.model.scene.readableGeometryEnabled) {
            this._subPortionReadableGeometries[subPortionId] = {
                indices: bucket.indices,
                positionsCompressed: bucket.positionsCompressed,
                positionsDecodeMatrix: portionCfg.positionsDecodeMatrix,
                meshMatrix: portionCfg.meshMatrix
            };
        }

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
        const textureState = this._dtxState;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;

        state.gl = gl;
        textureState.texturePerObjectColorsAndFlags = this._dtxTextureFactory.createTextureForColorsAndFlags(
            gl,
            buffer.perObjectColors,
            buffer.perObjectPickColors,
            buffer.perObjectVertexBases,
            buffer.perObjectIndexBaseOffsets,
            buffer.perObjectEdgeIndexBaseOffsets,
            buffer.perObjectSolid);

        textureState.texturePerObjectInstanceMatrices
            = this._dtxTextureFactory.createTextureForInstancingMatrices(gl, buffer.perObjectInstancePositioningMatrices);

        textureState.texturePerObjectPositionsDecodeMatrix
            = this._dtxTextureFactory.createTextureForPositionsDecodeMatrices(
            gl,
            buffer.perObjectPositionsDecodeMatrices);

        textureState.texturePerVertexIdCoordinates = this._dtxTextureFactory.createTextureForPositions(
            gl,
            buffer.positionsCompressed,
            buffer.lenPositionsCompressed);

        textureState.texturePerPolygonIdPortionIds8Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId8Bits);

        textureState.texturePerPolygonIdPortionIds16Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId16Bits);

        textureState.texturePerPolygonIdPortionIds32Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId32Bits);

        if (buffer.perEdgeNumberPortionId8Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds8Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId8Bits);
        }

        if (buffer.perEdgeNumberPortionId16Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds16Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId16Bits);
        }

        if (buffer.perEdgeNumberPortionId32Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds32Bits = this._dtxTextureFactory.createTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId32Bits);
        }

        if (buffer.lenIndices8Bits > 0) {
            textureState.texturePerPolygonIdIndices8Bits = this._dtxTextureFactory.createTextureFor8BitIndices(
                gl,
                buffer.indices8Bits, buffer.lenIndices8Bits);
        }

        if (buffer.lenIndices16Bits > 0) {
            textureState.texturePerPolygonIdIndices16Bits = this._dtxTextureFactory.createTextureFor16BitIndices(
                gl,
                buffer.indices16Bits, buffer.lenIndices16Bits);
        }

        if (buffer.lenIndices32Bits > 0) {
            textureState.texturePerPolygonIdIndices32Bits = this._dtxTextureFactory.createTextureFor32BitIndices(
                gl,
                buffer.indices32Bits, buffer.lenIndices32Bits);
        }

        if (buffer.lenEdgeIndices8Bits > 0) {
            textureState.texturePerPolygonIdEdgeIndices8Bits = this._dtxTextureFactory.createTextureFor8BitsEdgeIndices(
                gl,
                buffer.edgeIndices8Bits, buffer.lenEdgeIndices8Bits);
        }

        if (buffer.lenEdgeIndices16Bits > 0) {
            textureState.texturePerPolygonIdEdgeIndices16Bits = this._dtxTextureFactory.createTextureFor16BitsEdgeIndices(
                gl,
                buffer.edgeIndices16Bits, buffer.lenEdgeIndices16Bits);
        }

        if (buffer.lenEdgeIndices32Bits > 0) {
            textureState.texturePerPolygonIdEdgeIndices32Bits = this._dtxTextureFactory.createTextureFor32BitsEdgeIndices(
                gl,
                buffer.edgeIndices32Bits, buffer.lenEdgeIndices32Bits);
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
        const textureState = this._dtxState;
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
        // gl.bindTexture(gl.TEXTURE_2D, textureState.texturePerObjectInstanceMatrices._texture);
        // gl.texSubImage2D(
        //     gl.TEXTURE_2D,
        //     0, // level
        //     0, // xoffset
        //     0, // yoffset
        //     textureState.texturePerObjectInstanceMatrices._textureWidth, // width
        //     textureState.texturePerObjectInstanceMatrices._textureHeight, // width
        //     gl.RGB,
        //     gl.FLOAT,
        //     textureState.texturePerObjectInstanceMatrices._textureData
        // );
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
        const textureState = this._dtxState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = color[0];
        tempUint8Array4 [1] = color[1];
        tempUint8Array4 [2] = color[2];
        tempUint8Array4 [3] = color[3];
        // object colors
        textureState.texturePerObjectColorsAndFlags._textureData.set(tempUint8Array4, subPortionId * 32);
        if (this._deferredSetFlagsActive) {
            //console.info("_subPortionSetColor defer");
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        //console.info("_subPortionSetColor write through");
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
        const edges = !!(flags & ENTITY_FLAGS.EDGES);
        const pickable = !!(flags & ENTITY_FLAGS.PICKABLE);
        const culled = !!(flags & ENTITY_FLAGS.CULLED);

        // Color

        let f0;
        if (!visible || culled || xrayed
            || (highlighted && !this.model.scene.highlightMaterial.glowThrough)
            || (selected && !this.model.scene.selectedMaterial.glowThrough)) {
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

        let f3 = (visible && (!culled) && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;
        const textureState = this._dtxState;
        const gl = this.model.scene.canvas.gl;
        tempUint8Array4 [0] = f0;
        tempUint8Array4 [1] = f1;
        tempUint8Array4 [2] = f2;
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
        const textureState = this._dtxState;
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
        const textureState = this._dtxState;
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
        const textureState = this._dtxState;
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

    getEachVertex(portionId, callback) {
        if (!this.model.scene.readableGeometryEnabled) {
            return;
        }
        const state = this._state;
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        if (!subPortionIds) {
            this.model.error("portion not found: " + portionId);
            return;
        }
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            const subPortionId = subPortionIds[i];
            const subPortionReadableGeometry = this._subPortionReadableGeometries[subPortionId];
            const positions = subPortionReadableGeometry.positionsCompressed;
            const positionsDecodeMatrix = subPortionReadableGeometry.positionsDecodeMatrix;
            const meshMatrix = subPortionReadableGeometry.meshMatrix;
            const origin = state.origin;
            const offsetX = origin[0] ;
            const offsetY = origin[1] ;
            const offsetZ = origin[2] ;
            const worldPos = tempVec4a;
            for (let i = 0, len = positions.length; i < len; i += 3) {
                worldPos[0] = positions[i];
                worldPos[1] = positions[i + 1];
                worldPos[2] = positions[i + 2];
                worldPos[3] = 1.0;
                math.decompressPosition(worldPos, positionsDecodeMatrix);
                math.mulMat4v4(this.model.worldMatrix, worldPos, worldPos);
                worldPos[0] += offsetX;
                worldPos[1] += offsetY;
                worldPos[2] += offsetZ;
                callback(worldPos);
            }
        }
    }

    getEachIndex(portionId, callback) {
        if (!this.model.scene.readableGeometryEnabled) {
            return;
        }
        const subPortionIds = this._portionToSubPortionsMap[portionId];
        if (!subPortionIds) {
            this.model.error("portion not found: " + portionId);
            return;
        }
        for (let i = 0, len = subPortionIds.length; i < len; i++) {
            const subPortionId = subPortionIds[i];
            const subPortionReadableGeometry = this._subPortionReadableGeometries[subPortionId];
            const indices = subPortionReadableGeometry.indices;
            for (let i = 0, len = indices.length; i < len; i++) {
                callback(indices[i]);
            }
        }
    }


    // ---------------------- COLOR RENDERING -----------------------------------

    drawColorOpaque(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (frameCtx.withSAO && this.model.saoEnabled) {
            if (this._renderers.colorRendererWithSAO) {
                this._renderers.colorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
            }
        } else {
            if (this._renderers.colorRenderer) {
                this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
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
        if (this._renderers.colorRenderer) {
            this._renderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
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
            this._renderers.normalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);  // Assume whatever post-effect uses normals (eg SAO) does not apply to transparent objects
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
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0 || this._numTransparentLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesColorRenderer) {
            this._renderers.edgesColorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
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

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._renderers.edgesRenderer) {
            this._renderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    drawOcclusion(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.occlusionRenderer) {
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

    setPickMatrices(pickViewMatrix, pickProjMatrix) {
        // if (this._numVisibleLayerPortions === 0) {
        //     return;
        // }
        // this._dtxState.texturePickCameraMatrices.updateViewMatrix(pickViewMatrix, pickProjMatrix);
    }

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.pickMeshRenderer) {
            this._renderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.pickDepthRenderer) {
            this._renderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
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

    drawPickNormals(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._renderers.pickNormalsRenderer) {
            this._renderers.pickNormalsRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
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
