import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';
import {math} from "../../../math/math.js";
import {RenderState} from "../../../webgl/RenderState.js";
import {geometryCompressionUtils} from "../../../math/geometryCompressionUtils.js";
import {getDataTextureRenderers} from "./TrianglesDataTextureRenderers.js";
import {TrianglesDataTextureBuffer} from "./TrianglesDataTextureBuffer.js";
import {DataTextureState} from "./DataTextureState.js"
import {DataTextureGenerator} from "./DataTextureGenerator";
import {dataTextureRamStats} from "./dataTextureRamStats";

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
 * @private
 */
export class TrianglesDataTextureLayer {

    constructor(model, cfg) {

        dataTextureRamStats.numberOfLayers++;

        this._layerNumber = numLayers++;
        this.sortId = `TriDTX-${this._layerNumber}`; // State sorting key.
        this.layerIndex = cfg.layerIndex; // Index of this TrianglesDataTextureLayer in {@link SceneModel#_layerList}.

        this._dataTextureRenderers = getDataTextureRenderers(model.scene);
        this.model = model;
        this._buffer = new TrianglesDataTextureBuffer();
        this._dataTextureState = new DataTextureState();
        this._dataTextureGenerator = new DataTextureGenerator();

        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            metallicRoughnessBuf: null,
            positionsDecodeMatrix: math.mat4(),
            textureState: this._dataTextureState,
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

        /**
         * The axis-aligned World-space boundary of this TrianglesDataTextureLayer's positions.
         */
        this.aabb = math.collapseAABB3();

        /**
         * The number of updates in the current frame;
         */
        this._numUpdatesInFrame = 0;

        this._finalized = false;
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
    createPortion(portionCfg) {
        if (this._finalized) {
            throw "Already finalized";
        }
        const subPortionIds = [];
        const portionAABB = portionCfg.worldAABB;
        portionCfg.buckets.forEach((bucket, bucketIndex) => {
            const bucketGeometryId = portionCfg.geometryId !== undefined && portionCfg.geometryId !== null
                ? `${portionCfg.geometryId}#${bucketIndex}`
                : `${portionCfg.id}#${bucketIndex}`;
            let bucketGeometry = this._bucketGeometries[bucketGeometryId];
            if (!bucketGeometry) {
                bucketGeometry = this._createBucketGeometry(portionCfg, bucket);
                this._bucketGeometries[bucketGeometryId] = bucketGeometry;
            }
            const subPortionAABB = math.collapseAABB3(tempAABB3b);
            const subPortionId = this._createSubPortion(portionCfg, bucketGeometry, bucket, subPortionAABB);
            math.expandAABB3(portionAABB, subPortionAABB);
            subPortionIds.push(subPortionId);
        });
        const origin = this._state.origin;
        if (origin[0] !== 0 || origin[1] !== 0 || origin[2] !== 0) {
            portionAABB[0] += origin[0];
            portionAABB[1] += origin[1];
            portionAABB[2] += origin[2];
            portionAABB[3] += origin[0];
            portionAABB[4] += origin[1];
            portionAABB[5] += origin[2];
        }
        math.expandAABB3(this.aabb, portionAABB);
        const portionId = this._portionToSubPortionsMap.length;
        this._portionToSubPortionsMap.push(subPortionIds);
        this.model.numPortions++;
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
        const vertexBase = buffer.positionsCompressed.length / 3;
        const numVertices = positionsCompressed.length / 3;

        for (let i = 0, len = positionsCompressed.length; i < len; i++) {
            buffer.positionsCompressed.push(positionsCompressed[i]);
        }

        let indicesBase;
        let numTriangles = 0;
        if (indices) {
            numTriangles = indices.length / 3;
            let indicesBuffer;
            if (numVertices <= (1 << 8)) {
                indicesBuffer = buffer.indices8Bits;
            } else if (numVertices <= (1 << 16)) {
                indicesBuffer = buffer.indices16Bits;
            } else {
                indicesBuffer = buffer.indices32Bits;
            }
            indicesBase = indicesBuffer.length / 3;
            for (let i = 0, len = indices.length; i < len; i++) {
                indicesBuffer.push(indices[i]);
            }
        }

        let edgeIndicesBase;
        let numEdges = 0;
        if (edgeIndices) {
            numEdges = edgeIndices.length / 2;
            let edgeIndicesBuffer;
            if (numVertices <= (1 << 8)) {
                edgeIndicesBuffer = buffer.edgeIndices8Bits;
            } else if (numVertices <= (1 << 16)) {
                edgeIndicesBuffer = buffer.edgeIndices16Bits;
            } else {
                edgeIndicesBuffer = buffer.edgeIndices32Bits;
            }
            edgeIndicesBase = edgeIndicesBuffer.length / 2;
            for (let i = 0, len = edgeIndices.length; i < len; i++) {
                edgeIndicesBuffer.push(edgeIndices[i]);
            }
        }

        this._state.numVertices += numVertices;

        dataTextureRamStats.numberOfGeometries++;

        const aabb = math.collapseAABB3();
        math.expandAABB3Points3(aabb, bucket.positionsCompressed);
        geometryCompressionUtils.decompressAABB(aabb, portionCfg.positionsDecodeMatrix);

        const bucketGeometry = {
            vertexBase,
            numVertices,
            numTriangles,
            numEdges,
            indicesBase,
            edgeIndicesBase,
            aabb,
            obb: null // Lazy-created in _createSubPortion if needed
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

        if (meshMatrix) { // NB: SceneModel world matrix is used in shaders and SceneModelMesh.aabb

            if (!bucketGeometry.obb) {
                bucketGeometry.obb = math.AABB3ToOBB3(bucketGeometry.aabb);
            }
            const geometryOBB = bucketGeometry.obb;
            for (let i = 0, len = geometryOBB.length; i < len; i += 4) {
                tempVec4a[0] = geometryOBB[i + 0];
                tempVec4a[1] = geometryOBB[i + 1];
                tempVec4a[2] = geometryOBB[i + 2];
                tempVec4a[3] = 1.0;
                if (meshMatrix) {
                    math.transformPoint4(meshMatrix, tempVec4a, tempVec4b);
                }
                math.expandAABB3Point3(subPortionAABB, tempVec4b);
            }
        } else {
            math.expandAABB3(subPortionAABB, bucketGeometry.aabb);
        }

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

        textureState.texturePerObjectIdColorsAndFlags = this._dataTextureGenerator.generateTextureForColorsAndFlags(
            gl,
            buffer.perObjectColors,
            buffer.perObjectPickColors,
            buffer.perObjectVertexBases,
            buffer.perObjectIndexBaseOffsets,
            buffer.perObjectEdgeIndexBaseOffsets,
            buffer.perObjectSolid);

        textureState.texturePerObjectIdOffsets
            = this._dataTextureGenerator.generateTextureForObjectOffsets(gl, this._numPortions);

        textureState.texturePerObjectIdPositionsDecodeMatrix = this._dataTextureGenerator.generateTextureForPositionsDecodeMatrices(
            gl,
            buffer.perObjectPositionsDecodeMatrices,
            buffer.perObjectInstancePositioningMatrices);

        textureState.texturePerVertexIdCoordinates = this._dataTextureGenerator.generateTextureForPositions(
            gl,
            buffer.positionsCompressed);

        textureState.texturePerPolygonIdPortionIds8Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId8Bits);

        textureState.texturePerPolygonIdPortionIds16Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId16Bits);

        textureState.texturePerPolygonIdPortionIds32Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
            gl,
            buffer.perTriangleNumberPortionId32Bits);

        if (buffer.perEdgeNumberPortionId8Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds8Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId8Bits);
        }

        if (buffer.perEdgeNumberPortionId16Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds16Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId16Bits);
        }


        if (buffer.perEdgeNumberPortionId32Bits.length > 0) {
            textureState.texturePerEdgeIdPortionIds32Bits = this._dataTextureGenerator.generateTextureForPackedPortionIds(
                gl,
                buffer.perEdgeNumberPortionId32Bits);
        }

        if (buffer.indices8Bits.length > 0) {
            textureState.texturePerPolygonIdIndices8Bits = this._dataTextureGenerator.generateTextureFor8BitIndices(
                gl,
                buffer.indices8Bits);
        }

        if (buffer.indices16Bits.length > 0) {
            textureState.texturePerPolygonIdIndices16Bits = this._dataTextureGenerator.generateTextureFor16BitIndices(
                gl,
                buffer.indices16Bits);
        }

        if (buffer.indices32Bits.length > 0) {
            textureState.texturePerPolygonIdIndices32Bits = this._dataTextureGenerator.generateTextureFor32BitIndices(
                gl,
                buffer.indices32Bits);
        }

        if (buffer.edgeIndices8Bits.length > 0) {
            textureState.texturePerPolygonIdEdgeIndices8Bits = this._dataTextureGenerator.generateTextureFor8BitsEdgeIndices(
                gl,
                buffer.edgeIndices8Bits);
        }

        if (buffer.edgeIndices16Bits.length > 0) {
            textureState.texturePerPolygonIdEdgeIndices16Bits = this._dataTextureGenerator.generateTextureFor16BitsEdgeIndices(
                gl,
                buffer.edgeIndices16Bits);
        }

        if (buffer.edgeIndices32Bits.length > 0) {
            textureState.texturePerPolygonIdEdgeIndices32Bits = this._dataTextureGenerator.generateTextureFor32BitsEdgeIndices(
                gl,
                buffer.edgeIndices32Bits);
        }

        // if (buffer.metallicRoughness.length > 0) {
        //     const metallicRoughness = new Uint8Array(buffer.metallicRoughness);
        //     let normalized = false;
        //     state.metallicRoughnessBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, metallicRoughness, buffer.metallicRoughness.length, 2, gl.STATIC_DRAW, normalized);
        // }

        // Model matrices texture
        if (!this.model._modelMatricesTexture) {
            this.model._modelMatricesTexture = this._dataTextureGenerator.generateModelTexture(gl, this.model);
        }

        textureState.textureModelMatrices = this.model._modelMatricesTexture;

        // Camera textures

        textureState.cameraTexture = this._dataTextureGenerator.generateCameraDataTexture(
            this.model.scene.canvas.gl,
            this.model.scene.camera,
            this.model.scene,
            this._state.origin.slice());

        textureState.textureCameraMatrices = textureState.cameraTexture;

        textureState.texturePickCameraMatrices = this._dataTextureGenerator.generatePickCameraDataTexture(
            this.model.scene.canvas.gl,
            this.model.scene.camera,
            this._state.origin.slice());

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
            console.info("_subPortionSetFlags set flags defer");
            this._deferredSetFlagsDirty = true;
            return;
        }
        if (++this._numUpdatesInFrame >= MAX_OBJECT_UPDATES_IN_FRAME_WITHOUT_BATCHED_UPDATE) {
            this._beginDeferredFlags(); // Subsequent flags updates now deferred
        }
        console.info("_subPortionSetFlags set flags write through");
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
        console.info("_subPortionSetFlags2 set flags write through");
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
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        this._dataTextureState.texturePickCameraMatrices.updateViewMatrix(pickViewMatrix, pickProjMatrix);
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
