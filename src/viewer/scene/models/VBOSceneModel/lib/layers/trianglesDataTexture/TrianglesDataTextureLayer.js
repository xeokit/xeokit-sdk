import {WEBGL_INFO} from "../../../../webglInfo.js";
import {ENTITY_FLAGS} from '../../ENTITY_FLAGS.js';
import {RENDER_PASSES} from '../../RENDER_PASSES.js';

import {math} from "../../../../math/math.js";
import {RenderState} from "../../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../../webgl/ArrayBuf.js";
import {geometryCompressionUtils} from "../../../../math/geometryCompressionUtils.js";
import {getDataTextureRenderers} from "./TrianglesDataTextureRenderers.js";
import {TrianglesDataTextureBuffer} from "./TrianglesDataTextureBuffer.js";
import {quantizePositions, transformAndOctEncodeNormals} from "../../compression.js";
import * as uniquifyPositions from "./calculateUniquePositions.js";
import { rebucketPositions } from "./rebucketPositions.js";
import {
    dataTextureRamStats,
    DataTextureState,
    DataTextureGenerator
} from "../DataTextureState.js"

/**
 * 12-bits allowed for object ids.
 * 
 * Limits the per-object texture height in the layer.
 */
const MAX_NUMBER_OF_OBJECTS_IN_LAYER = (1 << 12);

/**
 * 2048 is max data texture height
 * 
 * Limits the aggregated geometry texture height in the layer.
 */
const MAX_DATA_TEXTURE_HEIGHT = (1 << 11);

/**
 * Align `indices` and `edgeIndices` memory layout to 8 elements.
 * 
 * Used as an optimization for the `...portionIds...` texture, so it
 * can just be stored 1 out of 8 `portionIds` corresponding to a given
 * `triangle-index` or `edge-index`.
 */
const INDICES_EDGE_INDICES_ALIGNEMENT_SIZE = 8;

const identityMatrix = math.identityMat4();
const tempMat4 = math.mat4();
const tempMat4b = math.mat4();
const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempVec4c = math.vec4([0, 0, 0, 1]);
const tempOBB3 = math.OBB3();

const tempUint8Array4 = new Uint8Array (4);

const tempFloat32Array3 = new Float32Array (3);

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempVec3g = math.vec3();

let _numberOfLayers = 0;

/**
 * @private
 */
class TrianglesDataTextureLayer {
    /**
     * @param model
     * @param cfg
     * @param cfg.layerIndex
     * @param cfg.positionsDecodeMatrix
     * @param cfg.origin
     * @param cfg.scratchMemory
     * @param cfg.solid
     */
    constructor(model, cfg) {
        this._layerNumber = _numberOfLayers++;
        dataTextureRamStats.numberOfLayers++;

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = "TrianglesDataTextureLayer" + (cfg.solid ? "-solid" : "-surface");

        /**
         * Index of this TrianglesDataTextureLayer in {@link PerformanceModel#_layerList}.
         * @type {Number}
         */
        this.layerIndex = cfg.layerIndex;

        this._dataTextureRenderers = getDataTextureRenderers(model.scene);
        this.model = model;
        this._buffer = new TrianglesDataTextureBuffer();
        this._scratchMemory = cfg.scratchMemory;

        /**
         * @type {DataTextureState}
         */
        this._dataTextureState = new DataTextureState ();

        /**
         * @type {DataTextureGenerator}
         */
        this.dataTextureGenerator = new DataTextureGenerator();

        this._state = new RenderState({
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

        // These counts are used to avoid unnecessary render passes
        this._numPortions = 0;
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numEdgesLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._modelAABB = math.collapseAABB3(); // Model-space AABB
        this._portions = [];

        this._finalized = false;

        /**
         * Due to `index rebucketting` process in ```prepareMeshGeometry``` function, it's possible that a single
         * portion is expanded to more than 1 real sub-portion.
         * 
         * This Array tracks the mapping between:
         * 
         * - external `portionIds` as seen by consumers of this class.
         * - internal `sub-portionIds` acutally managed by this class.
         * 
         * The outer index of this array is the externally seen `portionId`.
         * The inner value of the array, are `sub-portionIds` corresponding to the `portionId`.
         * 
         * @type {Array<Array<int>>}
         * @private
         */
        this._subPortionIdMapping = [];

        this._instancedGeometrySubPortionData = {};

        /**
         * The axis-aligned World-space boundary of this TrianglesDataTextureLayer's positions.
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
     * Returns wheter the ```TrianglesDataTextureLayer``` has room for more portions.
     * 
     * @param {object} geometryCfg An object containing the geometrical data (`positions`, `indices`, `edgeIndices`) for the portion.
     * @param {object} instancingGeometryId In case an instanced portion is to be checked, this must be the `geometryId`
     * 
     * @returns {Boolean} Wheter the requested portion can be created
     */
    canCreatePortion(geometryCfg, instancingGeometryId = null) {
        if (this._finalized) {
            throw "Already finalized";
        }
        
        const state = this._state;

        const newPortions = geometryCfg.preparedBuckets.length;

        if ((this._numPortions + newPortions) > MAX_NUMBER_OF_OBJECTS_IN_LAYER)
        {
            dataTextureRamStats.cannotCreatePortion.because10BitsObjectId++;
        }

        let retVal = (this._numPortions + newPortions) <= MAX_NUMBER_OF_OBJECTS_IN_LAYER;

        const alreadyHasPortionGeometry =
            instancingGeometryId !== null &&
            (instancingGeometryId + "#0") in this._instancedGeometrySubPortionData;

        if (!alreadyHasPortionGeometry) {
            const maxIndicesOfAnyBits = Math.max (
                state.numIndices8Bits,
                state.numIndices16Bits,
                state.numIndices32Bits,
            ) ;
    
            let numVertices = 0;
            let numIndices = geometryCfg.indices.length / 3;
    
            geometryCfg.preparedBuckets.forEach(bucket => {
                numVertices += bucket.positions.length / 3;
            });
        
            if ((state.numVertices + numVertices) > MAX_DATA_TEXTURE_HEIGHT * 1024 ||
                (maxIndicesOfAnyBits + numIndices) > MAX_DATA_TEXTURE_HEIGHT * 1024)
            {
                dataTextureRamStats.cannotCreatePortion.becauseTextureSize++;
            }

            retVal &&=
                (state.numVertices + numVertices) <= MAX_DATA_TEXTURE_HEIGHT * 1024 &&
                (maxIndicesOfAnyBits + numIndices) <= MAX_DATA_TEXTURE_HEIGHT * 1024;
        }

        // if (!retVal)
        // {
        //     console.log ("Cannot create portion!");
        // }

        return retVal;
    }

    /**
     * Creates a new portion within this TrianglesDataTextureLayer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, color and matrix.
     *
     * @param cfg.positions Flat float Local-space positions array.
     * @param [cfg.normals] Flat float normals array.
     * @param [cfg.colors] Flat float colors array.
     * @param cfg.indices  Flat int indices array.
     * @param [cfg.edgeIndices] Flat int edges indices array.
     * @param cfg.color Quantized RGB color [0..255,0..255,0..255,0..255]
     * @param cfg.metallic Metalness factor [0..255]
     * @param cfg.roughness Roughness factor [0..255]
     * @param cfg.opacity Opacity [0..255]
     * @param [cfg.meshMatrix] Flat float 4x4 matrix
     * @param [cfg.worldMatrix] Flat float 4x4 matrix
     * @param cfg.worldAABB Flat float AABB World-space AABB
     * @param cfg.pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion (geometryCfg, objectCfg = null) {
        if (this._finalized) {
            throw "Already finalized";
        }

        const instancing = objectCfg !== null;

        let portionId = this._subPortionIdMapping.length;

        const portionIdFanout = [];
        this._subPortionIdMapping.push (portionIdFanout);

        const objectAABB = instancing ? objectCfg.aabb : geometryCfg.aabb;
        
        geometryCfg.preparedBuckets.forEach((bucketGeometry, bucketIndex) => {
            let geometrySubPortionData;

            if (instancing) {
                const key = geometryCfg.id + "#" + bucketIndex;

                if (!(key in this._instancedGeometrySubPortionData)) {
                    this._instancedGeometrySubPortionData[key] = this.createSubPortionGeometry (bucketGeometry);
                }

                geometrySubPortionData = this._instancedGeometrySubPortionData[key];
            } else {
                geometrySubPortionData = this.createSubPortionGeometry (bucketGeometry);
            }
            
            const aabb = math.collapseAABB3();

            const subPortionId = this.createSubPortionObject (
                instancing ? objectCfg : geometryCfg,
                geometrySubPortionData,
                bucketGeometry.positions,
                geometryCfg.positionsDecodeMatrix,
                geometryCfg.origin,
                aabb,
                instancing
            );

            math.expandAABB3(objectAABB, aabb);

            portionIdFanout.push (subPortionId);
        });

        this.model.numPortions++;

        return portionId;
    }

    createSubPortionGeometry(cfg) {
        const state = this._state;

        // Indices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the triangles of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)
        if (cfg.indices)
        {
            const alignedIndicesLen = Math.ceil ((cfg.indices.length / 3) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 3;

            // Take notice of the introduced GPU storage overhead
            dataTextureRamStats.overheadSizeAlignementIndices += 2 * (alignedIndicesLen - cfg.indices.length);

            const alignedIndices = new Uint32Array(alignedIndicesLen);
            alignedIndices.fill(0);
            alignedIndices.set (cfg.indices);

            cfg.indices = alignedIndices;
        }

        // EdgeIndices alignement
        // This will make every mesh consume a multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // array items for storing the edges of the mesh, and it supports:
        // - a memory optimization of factor INDICES_EDGE_INDICES_ALIGNEMENT_SIZE
        // - in exchange for a small RAM overhead
        //   (by adding some padding until a size that is multiple of INDICES_EDGE_INDICES_ALIGNEMENT_SIZE)
        if (cfg.edgeIndices)
        {
            const alignedEdgeIndicesLen = Math.ceil ((cfg.edgeIndices.length / 2) / INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) * INDICES_EDGE_INDICES_ALIGNEMENT_SIZE * 2;

            // Take notice of the introduced GPU storage overhead
            dataTextureRamStats.overheadSizeAlignementEdgeIndices += 2 * (alignedEdgeIndicesLen - cfg.edgeIndices.length);

            const alignedEdgeIndices = new Uint32Array(alignedEdgeIndicesLen);
            alignedEdgeIndices.fill(0);
            alignedEdgeIndices.set (cfg.edgeIndices);
            cfg.edgeIndices = alignedEdgeIndices;
        }

        const positions = cfg.positions;
        const indices = cfg.indices;
        const edgeIndices = cfg.edgeIndices;

        const buffer = this._buffer;
        const positionsVertexBase = buffer.positions.length / 3;
        const numVerts = positions.length / 3;

        // console.log (positions);

        // Load positions data into buffer
        for (let i = 0, len = positions.length; i < len; i++) {
            buffer.positions.push(positions[i]);
        }
        
        // Load triangle indices data into buffer
        let indicesBase;

        let numTriangles = 0;

        if (indices) {
            numTriangles = indices.length / 3;

            let indicesBuffer;

            // Select the appropiate bitness-based bucket for indices
            if (numVerts <= (1<< 8)) {
                indicesBuffer = buffer.indices8Bits;
            } else if (numVerts <= (1<< 16)) {
                indicesBuffer = buffer.indices16Bits;
            } else {
                indicesBuffer = buffer.indices32Bits;
            }

            indicesBase = indicesBuffer.length / 3;

            for (let i = 0, len = indices.length; i < len; i++) {
                indicesBuffer.push(indices[i]);
            }
        }
        
        // Load edge indices data into buffer
        let edgeIndicesBase;

        let numEdges = 0;

        if (edgeIndices) {
            numEdges = edgeIndices.length / 2;

            let edgeIndicesBuffer;

            // Select the appropiate bitness-based bucket for edgeIndices
            if (numVerts <= (1<< 8)) {
                edgeIndicesBuffer = buffer.edgeIndices8Bits;
            } else if (numVerts <= (1<< 16)) {
                edgeIndicesBuffer = buffer.edgeIndices16Bits;
            } else {
                edgeIndicesBuffer = buffer.edgeIndices32Bits;
            }
    
            edgeIndicesBase = edgeIndicesBuffer.length / 2;

            for (let i = 0, len = edgeIndices.length; i < len; i++) {
                edgeIndicesBuffer.push(edgeIndices[i]);
            }
        }

        state.numVertices += numVerts;

        dataTextureRamStats.numberOfGeometries++;

        return {
            vertexBase: positionsVertexBase,
            numVertices: numVerts,
            numTriangles,
            numEdges,
            indicesBase,
            edgeIndicesBase
        };
    }

    /**
     * @private
     */
    createSubPortionObject(cfg, geometrySubPortionData, positions, positionsDecodeMatrix, origin, worldAABB, instancing) {
        const color = cfg.color;
        const metallic = cfg.metallic;
        const roughness = cfg.roughness;
        const colors = cfg.colors;
        const opacity = cfg.opacity;
        const meshMatrix = cfg.meshMatrix;
        const worldMatrix = cfg.worldMatrix;
        const pickColor = cfg.pickColor;
        // const positionsDecodeMatrix = cfg.positionsDecodeMatrix;

        const scene = this.model.scene;
        const buffer = this._buffer;

        const state = this._state;

        // Positions decode Matrix
        buffer.perObjectPositionsDecodeMatrices.push (positionsDecodeMatrix);

        if (instancing) {
            // Mesh instance matrix
            buffer.perObjectInstancePositioningMatrices.push (
                meshMatrix
            );

            // Mesh instance normal matrix
            {
                // Note: order of inverse and transpose doesn't matter
                let transposedMat = math.transposeMat4(meshMatrix, math.mat4()); // TODO: Use cached matrix
                let normalMatrix = math.inverseMat4(transposedMat);

                buffer.perObjectInstanceNormalsMatrices.push (
                    normalMatrix
                );
            }
        } else {
            buffer.perObjectInstancePositioningMatrices.push (identityMatrix);
            buffer.perObjectInstanceNormalsMatrices.push (identityMatrix);
        }

        // const positions = cfg.positions;
        // const positionsIndex = buffer.positions.length;
        // const vertsIndex = positionsIndex / 3;

        // Expand the world AABB with the concrete location of the object
        if (instancing) {
            const localAABB = math.collapseAABB3();
            math.expandAABB3Points3(localAABB, positions);
            geometryCompressionUtils.decompressAABB(localAABB, positionsDecodeMatrix);
            const geometryOBB = math.AABB3ToOBB3(localAABB);
    
            for (let i = 0, len = geometryOBB.length;  i < len; i += 4) {
                tempVec4a[0] = geometryOBB[i + 0];
                tempVec4a[1] = geometryOBB[i + 1];
                tempVec4a[2] = geometryOBB[i + 2];

                math.transformPoint4(meshMatrix, tempVec4a, tempVec4b);

                if (worldMatrix) {
                    math.transformPoint4(worldMatrix, tempVec4b, tempVec4c);
                    math.expandAABB3Point3(worldAABB, tempVec4c);
                } else {
                    math.expandAABB3Point3(worldAABB, tempVec4b);
                }
            }
        } else if (positionsDecodeMatrix) {
            const bounds = geometryCompressionUtils.getPositionsBounds(positions);

            const min = geometryCompressionUtils.decompressPosition(bounds.min, positionsDecodeMatrix, []);
            const max = geometryCompressionUtils.decompressPosition(bounds.max, positionsDecodeMatrix, []);

            worldAABB[0] = min[0];
            worldAABB[1] = min[1];
            worldAABB[2] = min[2];
            worldAABB[3] = max[0];
            worldAABB[4] = max[1];
            worldAABB[5] = max[2];

            if (worldMatrix) {
                math.AABB3ToOBB3(worldAABB, tempOBB3);
                math.transformOBB3(worldMatrix, tempOBB3);
                math.OBB3ToAABB3(tempOBB3, worldAABB);
            }

        } else {
            if (meshMatrix) {
                for (let i = 0, len = positions.length; i < len; i += 3) {

                    tempVec4a[0] = positions[i + 0];
                    tempVec4a[1] = positions[i + 1];
                    tempVec4a[2] = positions[i + 2];

                    math.transformPoint4(meshMatrix, tempVec4a, tempVec4b);

                    positions[i + 0] = tempVec4b[0];
                    positions[i + 1] = tempVec4b[1];
                    positions[i + 2] = tempVec4b[2];

                    math.expandAABB3Point3(this._modelAABB, tempVec4b);

                    if (worldMatrix) {
                        math.transformPoint4(worldMatrix, tempVec4b, tempVec4c);
                        math.expandAABB3Point3(worldAABB, tempVec4c);
                    } else {
                        math.expandAABB3Point3(worldAABB, tempVec4b);
                    }
                }
            } else {
                for (let i = 0, len = positions.length; i < len; i += 3) {

                    tempVec4a[0] = positions[i + 0];
                    tempVec4a[1] = positions[i + 1];
                    tempVec4a[2] = positions[i + 2];

                    math.expandAABB3Point3(this._modelAABB, tempVec4a);

                    if (worldMatrix) {
                        math.transformPoint4(worldMatrix, tempVec4a, tempVec4b);
                        math.expandAABB3Point3(worldAABB, tempVec4b);
                    } else {
                        math.expandAABB3Point3(worldAABB, tempVec4a);
                    }
                }
            }
        }

        // Adjust the world AABB with the object `origin`
        if (origin) {
            this._state.origin = origin;
            worldAABB[0] += origin[0];
            worldAABB[1] += origin[1];
            worldAABB[2] += origin[2];
            worldAABB[3] += origin[0];
            worldAABB[4] += origin[1];
            worldAABB[5] += origin[2];
        }

        math.expandAABB3(this.aabb, worldAABB);

        if (colors) {
            buffer.perObjectColors.push ([
                colors[0] * 255,
                colors[1] * 255,
                colors[2] * 255,
                255
            ]);
        } else if (color) {
            buffer.perObjectColors.push ([
                color[0], // Color is pre-quantized by PerformanceModel
                color[1],
                color[2],
                opacity
            ]);
        }

        buffer.perObjectPickColors.push (pickColor);

        buffer.perObjectVertexBases.push (geometrySubPortionData.vertexBase);

        {
            let currentNumIndices;

            // Select the appropiate bitness-based bucket for indices
            if (geometrySubPortionData.numVertices <= (1<< 8)) {
                currentNumIndices = state.numIndices8Bits;
            } else if (geometrySubPortionData.numVertices <= (1<< 16)) {
                currentNumIndices = state.numIndices16Bits;
            } else {
                currentNumIndices = state.numIndices32Bits;
            }

            buffer.perObjectIndexBaseOffsets.push (currentNumIndices / 3 - geometrySubPortionData.indicesBase);
        }

        {
            let currentNumEdgeIndices;

            // Select the appropiate bitness-based bucket for indices
            if (geometrySubPortionData.numVertices <= (1<< 8)) {
                currentNumEdgeIndices = state.numEdgeIndices8Bits;
            } else if (geometrySubPortionData.numVertices <= (1<< 16)) {
                currentNumEdgeIndices = state.numEdgeIndices16Bits;
            } else {
                currentNumEdgeIndices = state.numEdgeIndices32Bits;
            }

            buffer.perObjectEdgeIndexBaseOffsets.push (currentNumEdgeIndices / 2 - geometrySubPortionData.edgeIndicesBase);
        }

        const subPortionId = this._portions.length;

        if (geometrySubPortionData.numTriangles > 0) {
            let numIndices = geometrySubPortionData.numTriangles * 3;

            let indicesPortionIdBuffer;
    
            if (geometrySubPortionData.numVertices <= (1<< 8)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId8Bits;
                state.numIndices8Bits += numIndices;
                dataTextureRamStats.totalPolygons8Bits += geometrySubPortionData.numTriangles;
            } else if (geometrySubPortionData.numVertices <= (1<< 16)) {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId16Bits;
                state.numIndices16Bits += numIndices;
                dataTextureRamStats.totalPolygons16Bits += geometrySubPortionData.numTriangles;
            } else {
                indicesPortionIdBuffer = buffer.perTriangleNumberPortionId32Bits;
                state.numIndices32Bits += numIndices;
                dataTextureRamStats.totalPolygons32Bits += geometrySubPortionData.numTriangles;
            }

            dataTextureRamStats.totalPolygons += geometrySubPortionData.numTriangles;

            for (let i = 0; i < geometrySubPortionData.numTriangles; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                indicesPortionIdBuffer.push (subPortionId);
            }
        }

        if (geometrySubPortionData.numEdges > 0) {
            let numEdgeIndices = geometrySubPortionData.numEdges * 2;
            let edgeIndicesPortionIdBuffer;

            if (geometrySubPortionData.numVertices <= (1<< 8)) {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId8Bits;
                state.numEdgeIndices8Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges8Bits += geometrySubPortionData.numEdges;
            } else if (geometrySubPortionData.numVertices <= (1<< 16)) {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId16Bits;
                state.numEdgeIndices16Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges16Bits += geometrySubPortionData.numEdges;
            } else {
                edgeIndicesPortionIdBuffer = buffer.perEdgeNumberPortionId32Bits;
                state.numEdgeIndices32Bits += numEdgeIndices;
                dataTextureRamStats.totalEdges32Bits += geometrySubPortionData.numEdges;
            }

            dataTextureRamStats.totalEdges += geometrySubPortionData.numEdges;

            for (let i = 0; i < geometrySubPortionData.numEdges; i += INDICES_EDGE_INDICES_ALIGNEMENT_SIZE) {
                edgeIndicesPortionIdBuffer.push (subPortionId);
            }
        }

        buffer.perObjectOffsets.push([ 0, 0, 0 ]);

        // if (scene.pickSurfacePrecisionEnabled) {
        //     // Quantized in-memory positions are initialized in finalize()
        //     if (indices) {
        //         portion.indices = indices;
        //     }
        //     if (scene.entityOffsetsEnabled) {
        //         portion.offset = new Float32Array(3);
        //     }
        // }

        this._portions.push({
            // vertsBase: vertsIndex,
            numVerts: geometrySubPortionData.numTriangles
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
            this.model.error("Already finalized");
            return;
        }

        const state = this._state;
        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;

        state.gl = gl;

        // Generate all the needed textures in the layer

        // per-object colors and flags texture
        textureState.texturePerObjectIdColorsAndFlags = this.dataTextureGenerator.generateTextureForColorsAndFlags (
            gl,
            buffer.perObjectColors,
            buffer.perObjectPickColors,
            buffer.perObjectVertexBases,
            buffer.perObjectIndexBaseOffsets,
            buffer.perObjectEdgeIndexBaseOffsets
        );

        // per-object XYZ offsets
        textureState.texturePerObjectIdOffsets = this.dataTextureGenerator.generateTextureForObjectOffsets (
            gl,
            buffer.perObjectOffsets,
        );

        // per-object positions decode matrices texture
        textureState.texturePerObjectIdPositionsDecodeMatrix = this.dataTextureGenerator.generateTextureForPositionsDecodeMatrices (
            gl,
            buffer.perObjectPositionsDecodeMatrices,
            buffer.perObjectInstancePositioningMatrices,
            buffer.perObjectInstanceNormalsMatrices
        ); 

        // position coordinates texture
        textureState.texturePerVertexIdCoordinates = this.dataTextureGenerator.generateTextureForPositions (
            gl,
            buffer.positions
        );

        // portion Id triangles texture
        textureState.texturePerPolygonIdPortionIds8Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perTriangleNumberPortionId8Bits
        );

        textureState.texturePerPolygonIdPortionIds16Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perTriangleNumberPortionId16Bits
        );

        textureState.texturePerPolygonIdPortionIds32Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perTriangleNumberPortionId32Bits
        );

        // portion Id texture for edges
        textureState.texturePerEdgeIdPortionIds8Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perEdgeNumberPortionId8Bits
        );

        textureState.texturePerEdgeIdPortionIds16Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perEdgeNumberPortionId16Bits
        );

        textureState.texturePerEdgeIdPortionIds32Bits = this.dataTextureGenerator.generateTextureForPackedPortionIds (
            gl,
            buffer.perEdgeNumberPortionId32Bits
        );

        // indices texture
        textureState.texturePerPolygonIdIndices8Bits = this.dataTextureGenerator.generateTextureFor8BitIndices (
            gl,
            buffer.indices8Bits
        );

        textureState.texturePerPolygonIdIndices16Bits = this.dataTextureGenerator.generateTextureFor16BitIndices (
            gl,
            buffer.indices16Bits
        );

        textureState.texturePerPolygonIdIndices32Bits = this.dataTextureGenerator.generateTextureFor32BitIndices (
            gl,
            buffer.indices32Bits
        );
        
        // edge indices texture
        textureState.texturePerPolygonIdEdgeIndices8Bits = this.dataTextureGenerator.generateTextureFor8BitsEdgeIndices (
            gl,
            buffer.edgeIndices8Bits
        );
        
        textureState.texturePerPolygonIdEdgeIndices16Bits = this.dataTextureGenerator.generateTextureFor16BitsEdgeIndices (
            gl,
            buffer.edgeIndices16Bits
        );
        
        textureState.texturePerPolygonIdEdgeIndices32Bits = this.dataTextureGenerator.generateTextureFor32BitsEdgeIndices (
            gl,
            buffer.edgeIndices32Bits
        );
        
        // if (buffer.metallicRoughness.length > 0) {
        //     const metallicRoughness = new Uint8Array(buffer.metallicRoughness);
        //     let normalized = false;
        //     state.metallicRoughnessBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, metallicRoughness, buffer.metallicRoughness.length, 2, gl.STATIC_DRAW, normalized);
        // }

        // Model matrices texture
        if (!this.model._modelMatricesTexture)
        {
            this.model._modelMatricesTexture = this.dataTextureGenerator.generatePeformanceModelDataTexture (
                gl, this.model
            );
        }

        textureState.textureModelMatrices = this.model._modelMatricesTexture;

        // Camera textures
        if (!this.model.cameraTexture)
        {
            this.model.cameraTexture = this.dataTextureGenerator.generateCameraDataTexture (
                this.model.scene.canvas.gl,
                this.model.scene.camera,
                this.model.scene,
                this._state.origin.slice ()
            );
        }

        textureState.textureCameraMatrices = this.model.cameraTexture;

        // Mark the data-texture-state as finalized
        textureState.finalize ();

        // Free up memory
        this._buffer = null;
        this._instancedGeometrySubPortionData = {};

        this._finalized = true;
    }
        
    isEmpty() {
        return this._numPortions == 0;
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
     * colors+flags texture.
     * 
     * After invoking this method, and when all desired setFlags/setFlags2 have
     * been called on needed portions of the layer, invoke `commitDeferredFlags`
     * to actually update the texture data.
     * 
     * In massive "set-flags" scenarios like VFC or LOD mechanisms, the combina-
     * tion of `beginDeferredFlags` + `commitDeferredFlags`brings a speed-up of
     * up to 80x when e.g. objects are massively (un)culled 🚀.
     */
    beginDeferredFlags ()
    {
        this._deferredSetFlagsActive = true;
    }

    /**
     * This will _commit_ a "set-flags transaction".
     * 
     * Invoking this method will update the colors+flags texture data with new
     * flags/flags2 set since the previous invocation of `beginDeferredFlags`.
     */
    commitDeferredFlags ()
    {
        this._deferredSetFlagsActive = false;

        if (!this._deferredSetFlagsDirty)
        {
            return;
        }

        this._deferredSetFlagsDirty = false;

        const gl = this.model.scene.canvas.gl;
        const textureState = this._dataTextureState;
        
        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);

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

        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdOffsets._texture);

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
            this._numCulledLayerPortions+=this._subPortionIdMapping[portionId].length;
            this.model.numCulledLayerPortions++;
        } else {
            this._numCulledLayerPortions-=this._subPortionIdMapping[portionId].length;
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
        const subPortionMapping = this._subPortionIdMapping[portionId];

        for (let i = 0, len = subPortionMapping.length; i < len; i++) {
            this._subPortionSetColor (subPortionMapping[i], color);
        }
    }

    /**
     * @private
     */
    _subPortionSetColor(portionId, color) {
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
        textureState.texturePerObjectIdColorsAndFlags._textureData.set (
            tempUint8Array4,
            portionId * 28
        );

        if (this._deferredSetFlagsActive)
        {
            this._deferredSetFlagsDirty = true;
            return;
        }

        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // xoffset
            portionId, // yoffset
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
        const subPortionMapping = this._subPortionIdMapping[portionId];

        for (let i = 0, len = subPortionMapping.length; i < len; i++) {
            this._subPortionSetFlags (subPortionMapping[i], flags, transparent);
        }
    }

    /**
     * @private
     */
    _subPortionSetFlags(portionId, flags, transparent, deferred = false) {
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

        let f3 = (visible && !culled && pickable) ? RENDER_PASSES.PICK : RENDER_PASSES.NOT_RENDERED;

        const textureState = this._dataTextureState;
        const gl = this.model.scene.canvas.gl;

        tempUint8Array4 [0] = f0;
        tempUint8Array4 [1] = f1;
        tempUint8Array4 [2] = f2;
        tempUint8Array4 [3] = f3;

        // object flags
        textureState.texturePerObjectIdColorsAndFlags._textureData.set (
            tempUint8Array4,
            portionId * 28 + 8
        );

        if (this._deferredSetFlagsActive)
        {
            this._deferredSetFlagsDirty = true;
            return;
        }

        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            2, // xoffset
            portionId, // yoffset
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
        const subPortionMapping = this._subPortionIdMapping[portionId];

        for (let i = 0, len = subPortionMapping.length; i < len; i++) {
            this._subPortionSetFlags2 (subPortionMapping[i], flags);
        }
    }

    _subPortionSetFlags2(portionId, flags, deferred = false) {
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
        textureState.texturePerObjectIdColorsAndFlags._textureData.set (
            tempUint8Array4,
            portionId * 28 + 12
        );
        
        if (this._deferredSetFlagsActive)
        {
            this._deferredSetFlagsDirty = true;
            return;
        }
        
        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdColorsAndFlags._texture);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            3, // xoffset
            portionId, // yoffset
            1, // width
            1, //height
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            tempUint8Array4
        );

        // gl.bindTexture (gl.TEXTURE_2D, null);
    }

    _setDeferredFlags2() {
        return;
    }

    setOffset(portionId, offset) {
        const subPortionMapping = this._subPortionIdMapping[portionId];

        for (let i = 0, len = subPortionMapping.length; i < len; i++) {
            this._subPortionSetOffset (subPortionMapping[i], offset);
        }
    }

    _subPortionSetOffset(portionId, offset) {
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
        textureState.texturePerObjectIdOffsets._textureData.set (
            tempFloat32Array3,
            portionId * 3
        );
        
        if (this._deferredSetFlagsActive)
        {
            this._deferredSetFlagsDirty = true;
            return;
        }
        
        gl.bindTexture (gl.TEXTURE_2D, textureState.texturePerObjectIdOffsets._texture);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0, // level
            0, // x offset
            portionId, // yoffset
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
            if (frameCtx.pbrEnabled && this.model.pbrEnabled) {
                if (this._dataTextureRenderers.colorQualityRendererWithSAO) {
                    this._dataTextureRenderers.colorQualityRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else {
                if (this._dataTextureRenderers.colorRendererWithSAO) {
                    this._dataTextureRenderers.colorRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            }
        } else {
            if (frameCtx.pbrEnabled && this.model.pbrEnabled) {
                if (this._dataTextureRenderers.colorQualityRenderer) {
                    this._dataTextureRenderers.colorQualityRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
                }
            } else {
                if (this._dataTextureRenderers.colorRenderer) {
                    this._dataTextureRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_OPAQUE);
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
        if (frameCtx.pbrEnabled && this.model.pbrEnabled) {
            if (this._dataTextureRenderers.colorQualityRenderer) {
                this._dataTextureRenderers.colorQualityRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
            }
        } else {
            if (this._dataTextureRenderers.colorRenderer) {
                this._dataTextureRenderers.colorRenderer.drawLayer(frameCtx, this, RENDER_PASSES.COLOR_TRANSPARENT);
            }
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

    drawPickMesh(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.pickMeshRenderer) {
            this._dataTextureRenderers.pickMeshRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._numCulledLayerPortions === this._numPortions || this._numVisibleLayerPortions === 0) {
            return;
        }
        this._updateBackfaceCull(renderFlags, frameCtx);
        if (this._dataTextureRenderers.pickDepthRenderer) {
            this._dataTextureRenderers.pickDepthRenderer.drawLayer(frameCtx, this, RENDER_PASSES.PICK);
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

    //------------------------------------------------------------------------------------------------

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {

        if (!this.model.scene.pickSurfacePrecisionEnabled) {
            return false;
        }

        const state = this._state;
        const portion = this._portions[portionId];

        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return false;
        }

        const positions = portion.quantizedPositions;
        const indices = portion.indices;
        const origin = state.origin;
        const offset = portion.offset;

        const rtcRayOrigin = tempVec3a;
        const rtcRayDir = tempVec3b;

        rtcRayOrigin.set(origin ? math.subVec3(worldRayOrigin, origin, tempVec3c) : worldRayOrigin);  // World -> RTC
        rtcRayDir.set(worldRayDir);

        if (offset) {
            math.subVec3(rtcRayOrigin, offset);
        }

        math.transformRay(this.model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir); // RTC -> local

        const a = tempVec3d;
        const b = tempVec3e;
        const c = tempVec3f;

        let gotIntersect = false;
        let closestDist = 0;
        const closestIntersectPos = tempVec3g;

        for (let i = 0, len = indices.length; i < len; i += 3) {

            const ia = indices[i] * 3;
            const ib = indices[i + 1] * 3;
            const ic = indices[i + 2] * 3;

            a[0] = positions[ia];
            a[1] = positions[ia + 1];
            a[2] = positions[ia + 2];

            b[0] = positions[ib];
            b[1] = positions[ib + 1];
            b[2] = positions[ib + 2];

            c[0] = positions[ic];
            c[1] = positions[ic + 1];
            c[2] = positions[ic + 2];

            math.decompressPosition(a, state.positionsDecodeMatrix);
            math.decompressPosition(b, state.positionsDecodeMatrix);
            math.decompressPosition(c, state.positionsDecodeMatrix);

            if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, closestIntersectPos)) {

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
            math.transformVec3(this.model.worldNormalMatrix, worldNormal, worldNormal);
            math.normalizeVec3(worldNormal);
        }

        return gotIntersect;
    }

    // ---------

    destroy() {
        const state = this._state;
        if (state.metallicRoughnessBuf) {
            state.metallicRoughnessBuf.destroy();
            state.metallicRoughnessBuf = null;
        }
        state.destroy();
    }
}

/**
 * This function applies two steps to the provided mesh geometry data:
 * 
 * - 1st, it reduces its `.positions` to unique positions, thus removing duplicate vertices. It will adjust the `.indices` and `.edgeIndices` array accordingly to the unique `.positions`.
 * 
 * - 2nd, it tries to do an optimization called `index rebucketting`
 * 
 *   _Rebucketting minimizes the amount of RAM usage for a given mesh geometry by trying do demote its needed index bitness._
 * 
 *   - _for 32 bit indices, will try to demote them to 16 bit indices_
 *   - _for 16 bit indices, will try to demote them to 8 bits indices_
 *   - _8 bits indices are kept as-is_
 * 
 *   The fact that 32/16/8 bits are needed for indices, depends on the number of maximumm indexable vertices within the mesh geometry: this is, the number of vertices in the mesh geometry.
 * 
 * The function returns the same provided input `geometryCfg`, enrichened with the additional key `.preparedBukets`.
 * 
 * @param {object} geometryCfg The mesh information containing `.positions`, `.indices`, `.edgeIndices` arrays.
 * 
 * @returns {object} The mesh information enrichened with `.preparedBuckets` key.
 */
function prepareMeshGeometry (geometryCfg) {
    let uniquePositions, uniqueIndices, uniqueEdgeIndices;

    [
        uniquePositions,
        uniqueIndices,
        uniqueEdgeIndices,
    ] = uniquifyPositions.uniquifyPositions ({
        positions: geometryCfg.positions,
        indices: geometryCfg.indices,
        edgeIndices: geometryCfg.edgeIndices
    });

    let numUniquePositions = uniquePositions.length / 3;

    let buckets = rebucketPositions (
        {
            positions: uniquePositions,
            indices: uniqueIndices,
            edgeIndices: uniqueEdgeIndices,
        },
        (numUniquePositions > (1<< 16)) ? 16 : 8,
        // true
    );

    geometryCfg.preparedBuckets = buckets;

    // chipmunk
    // geometryCfg.preparedBuckets = [{
    //     positions: uniquePositions,
    //     indices: uniqueIndices,
    //     edgeIndices: uniqueEdgeIndices,
    // }];

    return geometryCfg;
}

export {  prepareMeshGeometry, TrianglesDataTextureLayer };