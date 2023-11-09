import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';
import {math} from "../../../math/math.js";
import {geometryCompressionUtils} from "../../../math/geometryCompressionUtils.js";
import {dataTextureRamStats} from "./dataTextureRamStats.js";

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


const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempVec4c = math.vec4([0, 0, 0, 1]);
const tempUint8Array4 = new Uint8Array(4);
const tempFloat32Array3 = new Float32Array(3);

const tempAABB3b = math.AABB3();
const DEFAULT_MATRIX = math.identityMat4();

/**
 * @private
 */
export class DTXTrianglesLayerData {

    constructor(model, cfg) {

        this.writeFlagsToTexture = cfg.writeFlagsToTexture; // Used in viewer
        this.writeFlags2ToTexture = cfg.writeFlags2ToTexture; // Used in viewer
        this.writeOffsetToTexture = cfg.writeOffsetToTexture; // Used in viewer
        this.writeColorToTexture = cfg.writeColorToTexture; // Used in viewer
        
        this._buffer = {
            positionsCompressed : [],
            metallicRoughness : [],
            indices8Bits : [],
            indices16Bits : [],
            indices32Bits : [],
            edgeIndices8Bits : [],
            edgeIndices16Bits : [],
            edgeIndices32Bits : [],
            perObjectColors : [],
            perObjectPickColors : [],
            perObjectSolid : [],
            perObjectOffsets : [],
            perObjectPositionsDecodeMatrices : [],
            perObjectInstancePositioningMatrices : [],
            perObjectVertexBases : [],
            perObjectIndexBaseOffsets : [],
            perObjectEdgeIndexBaseOffsets : [],
            perTriangleNumberPortionId8Bits : [],
            perTriangleNumberPortionId16Bits : [],
            perTriangleNumberPortionId32Bits : [],
            perEdgeNumberPortionId8Bits : [],
            perEdgeNumberPortionId16Bits : [],
            perEdgeNumberPortionId32Bits : []
        }
 
        this._state = new RenderState({
            origin: math.vec3(cfg.origin),
            metallicRoughnessBuf: null,
            positionsDecodeMatrix: math.mat4(),
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
        this._portionToSubPortionsMap = [];
        this._bucketGeometries = {};
        this.aabb = math.collapseAABB3();
        this._finalized = false;
    }

    /**
     * Returns whether the ```DTXTrianglesLayerData``` has room for more portions.
     *
     * @param {object} portionCfg An object containing the geometrical data (`positions`, `indices`, `edgeIndices`) for the portion.
     * @returns {Boolean} Wheter the requested portion can be created
     */
    canCreateMeshData(portionCfg) {
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
     * Creates a new portion within this DTXTrianglesLayerData, returns the new portion ID.
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
    createMeshData(portionCfg) {
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
        return portionId;
    }
    
    _createBucketGeometry(portionCfg, bucket) {
        if (bucket.indices) {
            const alignedIndicesLen = Math.ceil((bucket.indices.length / 3) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 3;
            dataTextureRamStats.overheadSizeAlignementIndices += 2 * (alignedIndicesLen - bucket.indices.length);
            const alignedIndices = new Uint32Array(alignedIndicesLen);
            alignedIndices.fill(0);
            alignedIndices.set(bucket.indices);
            bucket.indices = alignedIndices;
        }
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
        return subPortionId;
    }

    createEntityData(entityCfg) {


    }
    
    finalize() {

        if (this._finalized) {
            return;
        }

        const buffer = this._buffer;

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
        
        this.data = {
            origin: this._origin,
          //  perObjectPositionsDecodeMatrices: new Uint32Array(buffer.perObjectPositionsDecodeMatrices),
            perObjectPositionsDecodeMatrices: new Uint32Array(buffer.perObjectPositionsDecodeMatrices),
            perObjectInstancePositioningMatrices: new Uint32Array(buffer.perObjectInstancePositioningMatrices),
            positionsCompressed: new Uint16Array(buffer.positionsCompressed),
            texturePerPolygonIdPortionIds8Bits: new Uint8Array(buffer.perTriangleNumberPortionId8Bits),
            perTriangleNumberPortionId16Bits: new Uint16Array(buffer.perTriangleNumberPortionId16Bits),
            perTriangleNumberPortionId32Bits: new Uint32Array(buffer.perTriangleNumberPortionId32Bits),
            perEdgeNumberPortionId8Bits: new Uint8Array(buffer.perEdgeNumberPortionId8Bits),
            perEdgeNumberPortionId16Bits: new Uint16Array(buffer.perEdgeNumberPortionId16Bits),
            perEdgeNumberPortionId32Bits: new Uint32Array(buffer.perEdgeNumberPortionId32Bits),
            indices8Bits: new Uint8Array(buffer.indices8Bits),
            indices16Bits: new Uint16Array(buffer.indices16Bits),
            indices32Bits: new Uint32Array(buffer.indices32Bits),
            edgeIndices8Bits: new Uint8Array(buffer.edgeIndices8Bits),
            edgeIndices16Bits: new Uint16Array(buffer.edgeIndices16Bits),
            edgeIndices32Bits: new Uint32Array(buffer.edgeIndices32Bits)
        }
        this._buffer = null;
        this._bucketGeometries = {};
        this._finalized = true;
    }

    isEmpty() {
        return this._numPortions === 0;
    }

    initFlags(portionId, flags, meshTransparent) {
        if (flags & ENTITY_FLAGS.VISIBLE) {
            this._numVisibleLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.HIGHLIGHTED) {
            this._numHighlightedLayerPortions++;
        }
        if (flags & ENTITY_FLAGS.XRAYED) {
            this._numXRayedLayerPortions++;
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
        tempUint8Array4 [0] = color[0];
        tempUint8Array4 [1] = color[1];
        tempUint8Array4 [2] = color[2];
        tempUint8Array4 [3] = color[3];
        this.data.perObjectIdColorsAndFlags.set(tempUint8Array4, subPortionId * 32);
        if (this.writeColorToTexture) {
            this.writeColorToTexture(subPortionId, tempUint8Array4);
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
        tempUint8Array4 [0] = f0;
        tempUint8Array4 [1] = f1;
        tempUint8Array4 [2] = f2;
        tempUint8Array4 [3] = f3;
        
        this.data.perObjectIdColorsAndFlags.set(tempUint8Array4, subPortionId * 32 + 8);
        
        if (this.writeFlagsToTexture) {
            this.writeFlagsToTexture(subPortionId, tempUint8Array4);
        }
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
        tempUint8Array4 [0] = clippable;
        tempUint8Array4 [1] = 0;
        tempUint8Array4 [2] = 1;
        tempUint8Array4 [3] = 2;
        this.data.perObjectIdColorsAndFlags.set(tempUint8Array4, subPortionId * 32 + 12);
        if (this.writeFlags2ToTexture) {
            this.writeFlags2ToTexture(subPortionId, tempUint8Array4);
        }
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
        tempFloat32Array3 [0] = offset[0];
        tempFloat32Array3 [1] = offset[1];
        tempFloat32Array3 [2] = offset[2];
        // TODO: Write into offsets array
        if (this.writeOffsetToTexture) {
            this.writeOffsetToTexture(subPortionId, tempFloat32Array3);
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
        state.destroy();
        this._destroyed = true;
    }
}
