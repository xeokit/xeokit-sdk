import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {RENDER_PASSES} from "../RENDER_PASSES.js";

import {math} from "../../math/math.js";
import {RenderState} from "../../webgl/RenderState.js";
import {ArrayBuf} from "../../webgl/ArrayBuf.js";
import {quantizePositions, transformAndOctEncodeNormals} from "../compression.js";
import {geometryCompressionUtils} from "../../math/geometryCompressionUtils.js";

import {VBORenderer, createLightSetup, createSAOSetup, createPickClipTransformSetup} from "./VBORenderer.js";

import { VBOTrianglesColorTextureRenderer    } from "./renderers/VBOTrianglesColorTextureRenderer.js";
import { VBOTrianglesDepthRenderer           } from "./renderers/VBOTrianglesDepthRenderer.js";
import { VBOTrianglesEdgesRenderer           } from "./renderers/VBOTrianglesEdgesRenderer.js";
import { VBOTrianglesFlatColorRenderer       } from "./renderers/VBOTrianglesFlatColorRenderer.js";
import { VBOTrianglesPBRRenderer             } from "./renderers/VBOTrianglesPBRRenderer.js";
import { VBOTrianglesPickNormalsRenderer     } from "./renderers/VBOTrianglesPickNormalsRenderer.js";

import { VBOColorRenderer           } from "./renderers/VBOColorRenderer.js";
import { VBOOcclusionRenderer       } from "./renderers/VBOOcclusionRenderer.js";
import { VBOPickDepthRenderer       } from "./renderers/VBOPickDepthRenderer.js";
import { VBOPickMeshRenderer        } from "./renderers/VBOPickMeshRenderer.js";
import { VBOShadowRenderer          } from "./renderers/VBOShadowRenderer.js";
import { VBOSilhouetteRenderer      } from "./renderers/VBOSilhouetteRenderer.js";
import { VBOSnapRenderer            } from "./renderers/VBOSnapRenderer.js";


const getRenderers = (function() {
    const cachedRenderers = { };

    return function(scene, instancing, primitive) {
        const batchInstKey = instancing ? "instancing" : "batching";
        if (! (batchInstKey in cachedRenderers)) {
            cachedRenderers[batchInstKey] = { };
        }
        const primKey = ((primitive === "points") || (primitive === "lines")) ? primitive : "triangles";
        if (! (primKey in cachedRenderers[batchInstKey])) {
            cachedRenderers[batchInstKey][primKey] = { };
        }
        const cache = cachedRenderers[batchInstKey][primKey];
        const sceneId = scene.id;
        if (! (sceneId in cache)) {

            const createRenderer = (programSetup, subGeometry) => new VBORenderer(scene, instancing, primitive, programSetup, subGeometry);

            // Pre-initialize certain renderers that would otherwise be lazy-initialised on user interaction,
            // such as picking or emphasis, so that there is no delay when user first begins interacting with the viewer.
            const eager = function(createProgramSetup) {
                let renderer = createProgramSetup(createRenderer);
                return {
                    drawLayer: (frameCtx, layer, renderPass) => renderer.drawLayer(frameCtx, layer, renderPass),
                    revalidate: force => {
                        if (force || (! renderer.getValid())) {
                            renderer.destroy();
                            renderer = createProgramSetup(createRenderer);
                        }
                    }
                };
            };

            const lazy = function(createProgramSetup) {
                let renderer = null;
                return {
                    drawLayer: (frameCtx, layer, renderPass) => {
                        if (! renderer) {
                            renderer = createProgramSetup(createRenderer);
                        }
                        renderer.drawLayer(frameCtx, layer, renderPass);
                    },
                    revalidate: force => {
                        if (renderer && (force || (! renderer.getValid()))) {
                            renderer.destroy();
                            renderer = null;
                        }
                    }
                };
            };

            const gl = scene.canvas.gl;

            const makeColorProgram = (withLights, withSAO) => VBOColorRenderer(scene, primitive, withLights && createLightSetup(gl, scene._lightsState, false), withSAO && createSAOSetup(gl, scene));
            const makeColorTextureProgram = (withSAO, useAlphaCutoff) => VBOTrianglesColorTextureRenderer(scene, createLightSetup(gl, scene._lightsState), withSAO && createSAOSetup(gl, scene), useAlphaCutoff, scene.gammaOutput); // If gammaOutput set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
            const makeFlatColorProgram = (withSAO) => VBOTrianglesFlatColorRenderer(scene.logarithmicDepthBufferEnabled, createLightSetup(gl, scene._lightsState, false), withSAO && createSAOSetup(gl, scene));
            const makePBRProgram = (withSAO) => VBOTrianglesPBRRenderer(scene, createLightSetup(gl, scene._lightsState, true), withSAO && createSAOSetup(gl, scene));

            const makePickDepthProgram   = (isPoints) => VBOPickDepthRenderer(scene, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickMeshProgram    = (isPoints) => VBOPickMeshRenderer(scene, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickNormalsProgram = (isFlat)   => VBOTrianglesPickNormalsRenderer(scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 3), isFlat);

            const makeSnapProgram = (isSnapInit, isPoints) => VBOSnapRenderer(gl, isSnapInit, isPoints);

            if (primitive === "points") {
                cache[sceneId] = {
                    colorRenderer:      lazy((c) => c(makeColorProgram(false, false))),
                    occlusionRenderer:  lazy((c) => c(VBOOcclusionRenderer(scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:  lazy((c) => c(makePickDepthProgram(true))),
                    pickMeshRenderer:   lazy((c) => c(makePickMeshProgram(true))),
                    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
                    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
                    shadowRenderer:     instancing && lazy((c) => c(VBOShadowRenderer(scene))),
                    silhouetteRenderer: lazy((c) => c(VBOSilhouetteRenderer(scene, instancing, true))),
                    snapInitRenderer:   lazy((c) => c(makeSnapProgram(true,  true))),
                    snapVertexRenderer: lazy((c) => c(makeSnapProgram(false, true), { vertices: true }))
                };
            } else if (primitive === "lines") {
                cache[sceneId] = {
                    colorRenderer:      lazy((c) => c(makeColorProgram(false, false))),
                    silhouetteRenderer: lazy((c) => c(VBOSilhouetteRenderer(scene, instancing, true))),
                    snapInitRenderer:   lazy((c) => c(makeSnapProgram(true,  false))),
                    snapEdgeRenderer:   lazy((c) => c(makeSnapProgram(false, false), { vertices: false })),
                    snapVertexRenderer: lazy((c) => c(makeSnapProgram(false, false), { vertices: true }))
                };
            } else {
                cache[sceneId] = {
                    colorRenderer:                          lazy((c) => c(makeColorProgram(true, false))),
                    colorRendererWithSAO:                   lazy((c) => c(makeColorProgram(true, true))),
                    colorTextureRenderer:                   lazy((c) => c(makeColorTextureProgram(false, false))),
                    colorTextureRendererAlphaCutoff:        lazy((c) => c(makeColorTextureProgram(false, true))),
                    colorTextureRendererWithSAO:            lazy((c) => c(makeColorTextureProgram(true,  false))),
                    colorTextureRendererWithSAOAlphaCutoff: lazy((c) => c(makeColorTextureProgram(true,  true))),
                    depthRenderer:                          lazy((c) => c(VBOTrianglesDepthRenderer(scene.logarithmicDepthBufferEnabled))),
                    edgesColorRenderer:                     lazy((c) => c(VBOTrianglesEdgesRenderer(scene, false), { vertices: false })),
                    edgesRenderer:                          lazy((c) => c(VBOTrianglesEdgesRenderer(scene, true),  { vertices: false })),
                    flatColorRenderer:                      lazy((c) => c(makeFlatColorProgram(false))),
                    flatColorRendererWithSAO:               lazy((c) => c(makeFlatColorProgram(true))),
                    occlusionRenderer:                      lazy((c) => c(VBOOcclusionRenderer(scene.logarithmicDepthBufferEnabled))),
                    pbrRenderer:                            lazy((c) => c(makePBRProgram(false))),
                    pbrRendererWithSAO:                     lazy((c) => c(makePBRProgram(true))),
                    pickDepthRenderer:                      eager((c) => c(makePickDepthProgram(false))),
                    pickMeshRenderer:                       eager((c) => c(makePickMeshProgram(false))),
                    pickNormalsFlatRenderer:                lazy((c) => c(makePickNormalsProgram(true))),
                    pickNormalsRenderer:                    lazy((c) => c(makePickNormalsProgram(false))),
                    shadowRenderer:                         lazy((c) => c(VBOShadowRenderer(scene))),
                    silhouetteRenderer:                     eager((c) => c(VBOSilhouetteRenderer(scene, instancing, false))),
                    snapInitRenderer:                       eager((c) => c(makeSnapProgram(true,  false))),
                    snapEdgeRenderer:                       eager((c) => c(makeSnapProgram(false, false), { vertices: false })),
                    snapVertexRenderer:                     eager((c) => c(makeSnapProgram(false, false), { vertices: true }))
                };
            }

            const compile = () => Object.values(cache[sceneId]).forEach(r => r && r.revalidate(false));
            compile();
            scene.on("compile", compile);
            scene.on("destroyed", () => {
                Object.values(cache[sceneId]).forEach(r => r && r.revalidate(true));
                delete cache[sceneId];
            });
        }
        return cache[sceneId];
    };
})();

const tempFloat32 = new Float32Array(1);
const tempFloat32Vec4 = new Float32Array(4);
const tempVec3fa = new Float32Array(3);
const tempMat4 = math.mat4();
const tempVec4a = math.vec4([0, 0, 0, 1]);

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempVec3e = math.vec3();
const tempVec3f = math.vec3();
const tempVec3g = math.vec3();

// fills the whole dst array with src copies
const fillArray = function(dst, src) {
    dst.set(src);
    let soFar = src.length;
    const allDataLen = dst.length;
    while (soFar < allDataLen) {
        const toCopy = Math.min(soFar, allDataLen - soFar);
        dst.set(dst.subarray(0, toCopy), soFar);
        soFar += toCopy;
    }
};

/**
 * @private
 */
export class VBOLayer {

    /**
     * @param cfg
     * @param cfg.model
     * @param cfg.origin
     * @param cfg.layerIndex
     * @param cfg.scratchMemory
     * @param cfg.textureSet
     * @param cfg.primitive
     *
     * batching:
     * @param cfg.positionsDecodeMatrix
     * @param cfg.uvDecodeMatrix
     * @param cfg.maxGeometryBatchSize
     *
     * instancing:
     * @param cfg.geometry
     */
    constructor(instancing, cfg) {

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
         * When true, this layer contains solid triangle meshes, otherwise this layer contains surface triangle meshes
         * @type {boolean}
         */
        this.solid = (this.primitive === "solid");

        /**
         * State sorting key.
         * @type {string}
         */
        this.sortId = (((this.primitive === "points") ? "Points" : ((this.primitive === "lines") ? "Lines" : "Triangles"))
                       + (instancing ? "Instancing" : "Batching") + "Layer" +
                       (((this.primitive !== "points") && (this.primitive !== "lines"))
                        ? ((this.solid ? "-solid" : "-surface")
                           + "-autoNormals"
                           + (instancing
                              ? ""
                              // TODO: These two parts need to be IDs (ie. unique):
                              : ((cfg.textureSet && cfg.textureSet.colorTexture ? "-colorTexture" : "")
                                 +
                                 (cfg.textureSet && cfg.textureSet.metallicRoughnessTexture ? "-metallicRoughnessTexture" : ""))))
                        : ""));

        this._renderers = getRenderers(cfg.model.scene, instancing, this.primitive);

        this._hasEdges = (this.primitive !== "points") && (this.primitive !== "lines");

        this._instancing = instancing;

        this._maxVerts = cfg.maxGeometryBatchSize;

        const attribute = function() {
            let length = 0;
            const portions = [ ];

            return {
                length: () => length,
                append: function(data, times = 1, denormalizeScale = 1.0, increment = 0.0) {
                    length += times * data.length;
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
            colors:            attribute(), // in instancing used only for non-points
            metallicRoughness: attribute(), // used for triangulated
            pickColors:        attribute(), // used for non-lines
            ...(instancing
                ? {
                    // Modeling matrix per instance, array for each column
                    modelMatrixCol0:       attribute(),
                    modelMatrixCol1:       attribute(),
                    modelMatrixCol2:       attribute(),
                    modelNormalMatrixCol0: attribute(), // used for triangulated
                    modelNormalMatrixCol1: attribute(), // used for triangulated
                    modelNormalMatrixCol2: attribute(), // used for triangulated
                }
                : {
                    positions:             attribute(),
                    indices:               attribute(), // used for non-points
                    uv:                    attribute(), // used for triangulated
                    normals:               attribute(), // used for triangulated
                    edgeIndices:           attribute(), // used for triangulated
                })
        };
        this._scratchMemory = cfg.scratchMemory;

        const positionsDecodeMatrix = instancing ? cfg.geometry.positionsDecodeMatrix : cfg.positionsDecodeMatrix;

        this._state = new RenderState({
            origin: cfg.origin && math.vec3(cfg.origin),
            positionsBuf: null,
            colorsBuf: null,
            offsetsBuf: null,
            flagsBuf: null,
            positionsDecodeMatrix: positionsDecodeMatrix && math.mat4(positionsDecodeMatrix),
            metallicRoughnessBuf: null,
            pickColorsBuf: null,
            textureSet: cfg.textureSet,
            pbrSupported: false, // Set in #finalize if we have enough to support quality rendering
            ...(instancing
                ? {
                    obb: math.OBB3(),
                    numInstances: 0,
                    geometry: cfg.geometry,
                    modelMatrixCol0Buf: null,
                    modelMatrixCol1Buf: null,
                    modelMatrixCol2Buf: null,
                    modelNormalMatrixCol0Buf: null,
                    modelNormalMatrixCol1Buf: null,
                    modelNormalMatrixCol2Buf: null,
                }
                : {
                    indicesBuf: null,
                    uvBuf: null,
                    normalsBuf: null,
                    edgeIndicesBuf: null,
                    uvDecodeMatrix: cfg.uvDecodeMatrix && math.mat3(cfg.uvDecodeMatrix),
                })
        });

        // These counts are used to avoid unnecessary render passes
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        if (this._hasEdges) {
            this._numEdgesLayerPortions = 0;
        }
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;

        this._modelAABB = (! instancing) && math.collapseAABB3(); // Model-space AABB
        this._portions = [];
        this._meshes = [];
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
     * @param lenIndices Number of indices we'd like to create in this portion.
     * @returns {Boolean} True if OK to create another portion.
     */
    canCreatePortion(lenPositions, lenIndices) {
        if (this._finalized) {
            throw "Already finalized";
        }
        return this._instancing || (((this._buffer.positions.length() + lenPositions) <= (this._maxVerts * 3)) && ((this._buffer.indices.length() + lenIndices) <= (this._maxVerts * 3)));
    }

    /**
     * Creates a new portion within this Layer, returns the new portion ID.
     *
     * @param mesh The SceneModelMesh that owns the portion
     * @param cfg Portion params
     * @param cfg.metallic Metalness factor [0..255] (triangulated)
     * @param cfg.roughness Roughness factor [0..255] (triangulated)
     * @param cfg.pickColor Quantized pick color (non-lines)
     * @param cfg.meshMatrix Flat float 4x4 matrix (optional in batching)
     * batching:
     * @param cfg.positionsCompressed Flat quantized positions array - decompressed with positionsDecodeMatrix
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.indices  Flat int indices array.
     * @param [cfg.normalsCompressed]
     * @param [cfg.normals] Flat float normals array (triangulated)
     * @param [cfg.colors] Flat float colors array (non-lines)
     * @param [cfg.colorsCompressed] Quantized RGB colors [0..255,0..255,0..255,0..255] (non-lines)
     * @param cfg.color Float RGB color [0..1,0..1,0..1] (points) or Quantized RGB color [0..255,0..255,0..255,0..255] (non-points)
     * @param cfg.opacity Opacity [0..255] (non-points)
     * @param [cfg.uv] Flat UVs array (triangulated)
     * @param [cfg.uvCompressed] (triangulated)
     * @param [cfg.edgeIndices] Flat int edges indices array (triangulated)
     * @param cfg.aabb Flat float AABB World-space AABB
     * instancing:
     * @param cfg.color Color [0..255,0..255,0..255]
     * @param cfg.opacity Opacity [0..255].
     * @returns {number} Portion ID
     */
    createPortion(mesh, cfg) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;
        const meshMatrix = cfg.meshMatrix;
        const portionId = this._portions.length;

        const appendPortion = (portionBase, portionSize, indices, quantizedPositions, meshMatrix) => {
            const portion = {
                portionBase: portionBase,
                portionSize: portionSize,
                retainedGeometry: this.model.scene.readableGeometryEnabled && (this.primitive !== "points") && (this.primitive !== "lines") && {
                    indices:            indices,
                    quantizedPositions: quantizedPositions,
                    offset:             this.model.scene.entityOffsetsEnabled && math.vec3(),
                    matrix:             meshMatrix && meshMatrix.slice(),
                    inverseMatrix:      null, // Lazy-computed for instancing in precisionRayPickSurface
                    normalMatrix:       null, // Lazy-computed for instancing in precisionRayPickSurface
                }
            };

            if ((this.primitive !== "points") && (this.primitive !== "lines")) {
                buffer.metallicRoughness.append([ cfg.metallic ?? 0, cfg.roughness ?? 255 ], portionSize);
            }

            if (this.primitive !== "lines") {
                buffer.pickColors.append(cfg.pickColor.slice(0, 4), portionSize);
            }

            this._portions.push(portion);
            this.model.numPortions++;
            this._meshes.push(mesh);
            return portionId;
        };

        if (this._instancing) {
            const geometry = this._state.geometry;

            buffer.modelMatrixCol0.append([ meshMatrix[0], meshMatrix[4], meshMatrix[8], meshMatrix[12] ]);
            buffer.modelMatrixCol1.append([ meshMatrix[1], meshMatrix[5], meshMatrix[9], meshMatrix[13] ]);
            buffer.modelMatrixCol2.append([ meshMatrix[2], meshMatrix[6], meshMatrix[10], meshMatrix[14] ]);

            if (this.primitive !== "points") {
                const color = cfg.color; // Color is pre-quantized by SceneModel
                buffer.colors.append([ color[0], color[1], color[2], cfg.opacity ?? 255 ]);
            }

            if ((this.primitive !== "points") && (this.primitive !== "lines")) {
                if (geometry.normals) {
                    // Note: order of inverse and transpose doesn't matter
                    const normalMatrix = math.inverseMat4(math.transposeMat4(meshMatrix, math.mat4()));
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[0], normalMatrix[4], normalMatrix[8], normalMatrix[12] ]);
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[1], normalMatrix[5], normalMatrix[9], normalMatrix[13] ]);
                    buffer.modelNormalMatrixCol0.append([ normalMatrix[2], normalMatrix[6], normalMatrix[10], normalMatrix[14] ]);
                }
            }

            this._state.numInstances++;

            return appendPortion(portionId, 1, geometry.indices, geometry.positionsCompressed, meshMatrix);
        } else {
            const vertsBaseIndex = this._buffer.positions.length() / 3;

            const useCompressed = this._state.positionsDecodeMatrix;
            const positions = useCompressed ? cfg.positionsCompressed : cfg.positions;
            if (! positions) {
                throw ((useCompressed ? "positionsCompressed" : "positions") + " expected");
            }

            buffer.positions.append(positions);

            const numVerts = positions.length / 3;

            const indices = cfg.indices;
            if (indices) {
                buffer.indices.append(indices, 1, 1.0, vertsBaseIndex);
            }

            const normalsCompressed = cfg.normalsCompressed;
            const normals = cfg.normals;
            if (normalsCompressed && normalsCompressed.length > 0) {
                buffer.normals.append(normalsCompressed);
            } else if (normals && normals.length > 0) {
                const worldNormalMatrix = tempMat4;
                if (meshMatrix) {
                    math.transposeMat4(meshMatrix, worldNormalMatrix);
                    math.inverseMat4(worldNormalMatrix, worldNormalMatrix); // Note: order of inverse and transpose doesn't matter
                } else {
                    math.identityMat4(worldNormalMatrix);
                }
                const normalsData = [ ];
                transformAndOctEncodeNormals(worldNormalMatrix, normals, normals.length, normalsData, 0);
                buffer.normals.append(normalsData);
            }

            const colors = cfg.colors;
            const colorsCompressed = cfg.colorsCompressed;
            const color = cfg.color;
            if (colors) {
                if (this.primitive === "points") {
                    buffer.colors.append(colors, 1, 255.0);
                } else {            // triangulated
                    const colorsData = [ ];
                    for (let i = 0, len = colors.length; i < len; i += 3) {
                        colorsData.push(colors[i] * 255);
                        colorsData.push(colors[i + 1] * 255);
                        colorsData.push(colors[i + 2] * 255);
                        colorsData.push(255);
                    }
                    buffer.colors.append(colorsData);
                }
            } else if (colorsCompressed) {
                if (this.primitive === "points") {
                    buffer.colors.append(colorsCompressed);
                } else {            // triangulated
                    const colorsData = [ ];
                    for (let i = 0, len = colorsCompressed.length; i < len; i += 3) {
                        colorsData.push(colorsCompressed[i]);
                        colorsData.push(colorsCompressed[i + 1]);
                        colorsData.push(colorsCompressed[i + 2]);
                        colorsData.push(255);
                    }
                    buffer.colors.append(colorsData);
                }
            } else if (color) {
                // Color is pre-quantized by VBOSceneModel
                buffer.colors.append([ color[0], color[1], color[2], (this.primitive === "points") ? 1.0 : cfg.opacity ], numVerts);
            }

            const nonEmpty = v => v && (v.length > 0) && v;
            const uv = nonEmpty(cfg.uv) || nonEmpty(cfg.uvCompressed);
            if (uv) {
                buffer.uv.append(uv);
            }

            const edgeIndices = cfg.edgeIndices;
            if (edgeIndices) {
                buffer.edgeIndices.append(edgeIndices, 1, 1.0, vertsBaseIndex);
            }

            math.expandAABB3(this._modelAABB, cfg.aabb);

            // quantizedPositions are initialized in finalize()
            return appendPortion(vertsBaseIndex, numVerts, indices);
        }
    }

    finalize() {

        if (this._finalized) {
            throw "Already finalized";
        }

        const state = this._state;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;
        const maybeCreateGlBuffer = (target, srcData, size, usage, normalized = false) => (srcData.length > 0) ? new ArrayBuf(gl, target, srcData, srcData.length, size, usage, normalized) : null;

        this._attributesCnt = this._portions.reduce((acc,p) => acc + p.portionSize, 0);

        state.flagsBuf       = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._attributesCnt), 1, gl.DYNAMIC_DRAW);

        state.colorsBuf      = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.colors.compileBuffer(Uint8Array), 4, gl.DYNAMIC_DRAW);

        state.offsetsBuf     = this.model.scene.entityOffsetsEnabled ? maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Float32Array(this._attributesCnt * 3), 3, gl.DYNAMIC_DRAW) : null;

        state.metallicRoughnessBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.metallicRoughness.compileBuffer(Uint8Array), 2, gl.STATIC_DRAW);

        state.pickColorsBuf  = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.pickColors.compileBuffer(Uint8Array), 4, gl.STATIC_DRAW);

        if (this._instancing) {
            const geometry = state.geometry;
            state.edgeIndicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.edgeIndices), 1, gl.STATIC_DRAW);

            state.modelMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            state.modelMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);

            if (geometry.positionsCompressed) {
                state.positionsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, geometry.positionsCompressed, 3, gl.STATIC_DRAW);
            }
            if ((this.primitive !== "points") && geometry.indices) {
                state.indicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), 1, gl.STATIC_DRAW);
            }
            // if ((this.primitive !== "points") && (this.primitive !== "lines") && geometry.normalsCompressed && geometry.normalsCompressed.length > 0) {
            //     const normalized = true; // For oct-encoded UInt8
            //     state.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, geometry.normalsCompressed, geometry.normalsCompressed.length, 3, gl.STATIC_DRAW, normalized);
            // }
            if (geometry.colorsCompressed) {
                // WARNING: colorsBuf might be already assigned above
                state.colorsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, new Uint8Array(geometry.colorsCompressed), 4, gl.STATIC_DRAW);
                state.colorsForPointsNotInstancing = (this.primitive === "points");
            }
            if ((this.primitive !== "points") && (this.primitive !== "lines") && geometry.uvCompressed) {
                state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, geometry.uvCompressed, 2, gl.STATIC_DRAW);
                state.uvDecodeMatrix = geometry.uvDecodeMatrix;
            }

            if (state.modelMatrixCol0Buf && state.normalsBuf) { // WARNING: normalsBuf is never defined at the moment
                state.modelNormalMatrixCol0Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol0.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
                state.modelNormalMatrixCol1Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol1.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
                state.modelNormalMatrixCol2Buf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.modelNormalMatrixCol2.compileBuffer(Float32Array), 4, gl.STATIC_DRAW);
            }
        } else {
            state.edgeIndicesBuf = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.edgeIndices.compileBuffer(Uint32Array), 1, gl.STATIC_DRAW);

            const positions = (state.positionsDecodeMatrix
                               ? buffer.positions.compileBuffer(Uint16Array)
                               : (quantizePositions(buffer.positions.compileBuffer(Float64Array), this._modelAABB, state.positionsDecodeMatrix = math.mat4())));
            state.positionsBuf  = maybeCreateGlBuffer(gl.ARRAY_BUFFER, positions, 3, gl.STATIC_DRAW);

            for (let i = 0, numPortions = this._portions.length; i < numPortions; i++) {
                const portion = this._portions[i];
                if (portion.retainedGeometry) {
                    const start = portion.portionBase * 3;
                    const end = start + (portion.portionSize * 3);
                    portion.retainedGeometry.quantizedPositions = positions.subarray(start, end);
                }
            }

            state.indicesBuf    = maybeCreateGlBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices.compileBuffer(Uint32Array), 1, gl.STATIC_DRAW);

            // Normals are already oct-encoded, so `normalized = true` for oct encoded UInts
            state.normalsBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, buffer.normals.compileBuffer(Int8Array), 3, gl.STATIC_DRAW, true);

            const uvs = buffer.uv.compileBuffer(Float32Array);
            if (uvs.length > 0) {
                if (state.uvDecodeMatrix) {
                    state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, uvs, 2, gl.STATIC_DRAW);
                } else {
                    const bounds = geometryCompressionUtils.getUVBounds(uvs);
                    const result = geometryCompressionUtils.compressUVs(uvs, bounds.min, bounds.max);
                    const uv = result.quantized;
                    state.uvDecodeMatrix = math.mat3(result.decodeMatrix);
                    state.uvBuf = maybeCreateGlBuffer(gl.ARRAY_BUFFER, result.quantized, 2, gl.STATIC_DRAW);
                }
            }
        }

        const textureSet = state.textureSet;
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

        state.geometry = null;
        this._buffer = null;
        this._finalized = true;
    }

    initFlags(portionId, flags, transparent) {
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
        if (this._hasEdges && flags & ENTITY_FLAGS.EDGES) {
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
        if (transparent) {
            this._numTransparentLayerPortions++;
            this.model.numTransparentLayerPortions++;
        }
        const deferred = (this.primitive !== "points") && (! this._instancing);
        this._setFlags(portionId, flags, transparent, deferred);
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
        if (this._hasEdges) {
            if (flags & ENTITY_FLAGS.EDGES) {
                this._numEdgesLayerPortions++;
                this.model.numEdgesLayerPortions++;
            } else {
                this._numEdgesLayerPortions--;
                this.model.numEdgesLayerPortions--;
            }
            this._setFlags(portionId, flags, transparent);
        }
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

    setColor(portionId, color) { // RGBA color is normalized as ints
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (this._state.colorsBuf) {
            const portion = this._portions[portionId];
            const tempArray = this._scratchMemory.getUInt8Array(portion.portionSize * 4);
            // alpha used to be unset for points, so effectively random (from last use)
            fillArray(tempArray, color.slice(0, 4));
            this._state.colorsBuf.setData(tempArray, portion.portionBase * 4);
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

        const visible = !!(flags & ENTITY_FLAGS.VISIBLE);
        const xrayed = !!(flags & ENTITY_FLAGS.XRAYED);
        const highlighted = !!(flags & ENTITY_FLAGS.HIGHLIGHTED);
        const selected = !!(flags & ENTITY_FLAGS.SELECTED);
        const edges = !!(this._hasEdges && flags & ENTITY_FLAGS.EDGES);
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

        let edgeFlag = 0;
        if ((!this._hasEdges) || (!visible) || culled) {
            edgeFlag = RENDER_PASSES.NOT_RENDERED;
        } else if (selected) {
            edgeFlag = RENDER_PASSES.EDGES_SELECTED;
        } else if (highlighted) {
            edgeFlag = RENDER_PASSES.EDGES_HIGHLIGHTED;
        } else if (xrayed) {
            edgeFlag = RENDER_PASSES.EDGES_XRAYED;
        } else if (edges) {
            if (transparent) {
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

        const portion   = this._portions[portionId];
        const firstFlag = portion.portionBase;
        const lenFlags  = portion.portionSize;

        if (deferred) {
            // Avoid zillions of individual WebGL bufferSubData calls - buffer them to apply in one shot
            if (!this._deferredFlagValues) {
                this._deferredFlagValues = new Float32Array(this._attributesCnt);
            }
            fillArray(this._deferredFlagValues.subarray(firstFlag, firstFlag + lenFlags), tempFloat32);
        } else if (this._state.flagsBuf) {
            const tempArray = this._scratchMemory.getFloat32Array(lenFlags);
            fillArray(tempArray, tempFloat32);
            this._state.flagsBuf.setData(tempArray, firstFlag);
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
        const portion = this._portions[portionId];
        if (this._state.offsetsBuf) {
            tempVec3fa.set(offset);
            const tempArray = this._scratchMemory.getFloat32Array(portion.portionSize * 3);
            fillArray(tempArray, tempVec3fa);
            this._state.offsetsBuf.setData(tempArray, portion.portionBase * 3);
        }
        if (portion.retainedGeometry) {
            portion.retainedGeometry.offset.set(offset);
        }
    }

    getEachVertex(portionId, callback) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return;
        }

        const retainedGeometry = portion.retainedGeometry;
        if (!retainedGeometry) {
            return;
        }
        const state = this._state;
        const positions = retainedGeometry.quantizedPositions;
        const sceneModelMatrix = this.model.matrix;
        const origin = math.vec4();
        if (state.origin) {
            origin.set(state.origin, 0);
        }
        origin[3] = 1;
        math.mulMat4v4(sceneModelMatrix, origin, origin);
        const offsetX = origin[0];
        const offsetY = origin[1];
        const offsetZ = origin[2];
        const worldPos = tempVec4a;
        const positionsDecodeMatrix = state.positionsDecodeMatrix;
        for (let i = 0, len = positions.length; i < len; i += 3) {
            worldPos[0] = positions[i];
            worldPos[1] = positions[i + 1];
            worldPos[2] = positions[i + 2];
            math.decompressPosition(worldPos, positionsDecodeMatrix);
            if (retainedGeometry.matrix) {
                math.transformPoint3(retainedGeometry.matrix, worldPos, worldPos);
            }
            worldPos[3] = 1;
            math.mulMat4v4(sceneModelMatrix, worldPos, worldPos);
            worldPos[0] += offsetX;
            worldPos[1] += offsetY;
            worldPos[2] += offsetZ;
            callback(worldPos);
        }
    }

    getEachIndex(portionId, callback) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
        } else if (portion.retainedGeometry) {
            portion.retainedGeometry.indices.forEach(i => callback(i));
        }
    }

    setMatrix(portionId, matrix) {
        if (! this._state.modelMatrixCol0Buf) {
            return;
        }

        ////////////////////////////////////////
        // TODO: Update portion matrix
        ////////////////////////////////////////

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


    __drawLayer(renderFlags, frameCtx, renderer, pass) {
        if ((this._numCulledLayerPortions < this._portions.length) && (this._numVisibleLayerPortions > 0)) {
            const backfacePasses = (this.primitive !== "points") && (this.primitive !== "lines") && [
                RENDER_PASSES.COLOR_OPAQUE,
                RENDER_PASSES.COLOR_TRANSPARENT,
                RENDER_PASSES.PICK,
                RENDER_PASSES.SILHOUETTE_HIGHLIGHTED,
                RENDER_PASSES.SILHOUETTE_SELECTED,
                RENDER_PASSES.SILHOUETTE_XRAYED,
            ];
            if (backfacePasses && backfacePasses.includes(pass)) {
                // _updateBackfaceCull
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
            renderer.drawLayer(frameCtx, this, pass);
        }
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    __drawColor(renderFlags, frameCtx, renderOpaque) {
        if ((renderOpaque ? (this._numTransparentLayerPortions < this._portions.length) : (this._numTransparentLayerPortions > 0))
            &&
            (this._numXRayedLayerPortions < this._portions.length)) {
            const usePBR = frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported;
            const useColorTexture = frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported;
            const useAlphaCutoff = this._state.textureSet && (typeof(this._state.textureSet.alphaCutoff) === "number");
            const renderer = (((this.primitive === "points") || (this.primitive === "lines"))
                              ? this._renderers.colorRenderer
                              : ((renderOpaque && frameCtx.withSAO && this.model.saoEnabled)
                                 ? (usePBR
                                    ? this._renderers.pbrRendererWithSAO
                                    : (useColorTexture
                                       ? (useAlphaCutoff
                                          ? this._renderers.colorTextureRendererWithSAOAlphaCutoff
                                          : this._renderers.colorTextureRendererWithSAO)
                                       : (this._state.normalsBuf
                                          ? this._renderers.colorRendererWithSAO
                                          : this._renderers.flatColorRendererWithSAO)))
                                 : (usePBR
                                    ? this._renderers.pbrRenderer
                                    : (useColorTexture
                                       ? (useAlphaCutoff
                                          ? this._renderers.colorTextureRendererAlphaCutoff
                                          : this._renderers.colorTextureRenderer)
                                       : (this._state.normalsBuf
                                          ? this._renderers.colorRenderer
                                          : this._renderers.flatColorRenderer)))));
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

    __drawPost(renderFlags, frameCtx, renderer) {
        // Assume whatever post-effect uses depth or normals (eg SAO) does not apply to transparent objects
        if ((this.primitive !== "points") && (this.primitive !== "lines")
            &&
            (this._numTransparentLayerPortions < this._portions.length) && (this._numXRayedLayerPortions < this._portions.length)) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawDepth(renderFlags, frameCtx) {
        this.__drawPost(renderFlags, frameCtx, this._renderers.depthRenderer);
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
        if (this._hasEdges && (this._numEdgesLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesColorRenderer, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numEdgesLayerPortions > 0) && (this._numTransparentLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesColorRenderer, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numHighlightedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numSelectedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._hasEdges && (this._numXRayedLayerPortions > 0)) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.edgesRenderer, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.pickMeshRenderer, RENDER_PASSES.PICK);
        }
    }

    drawPickDepths(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.pickDepthRenderer, RENDER_PASSES.PICK);
        }
    }

    drawPickNormals(renderFlags, frameCtx) {
        if (this._state.pickColorsBuf && (this.primitive !== "points") && (this.primitive !== "lines")) {
            const renderer = (false // TODO: this._state.normalsBuf
                              ? this._renderers.pickNormalsRenderer
                              : this._renderers.pickNormalsFlatRenderer);
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.PICK);
        }
    }

    drawSnapInit(renderFlags, frameCtx) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.snapInitRenderer, RENDER_PASSES.PICK);
    }

    drawSnap(renderFlags, frameCtx) {
        const snapRenderer = (frameCtx.snapMode === "edge") ? this._renderers.snapEdgeRenderer : this._renderers.snapVertexRenderer;
        if (snapRenderer) {
            this.__drawLayer(renderFlags, frameCtx, snapRenderer, RENDER_PASSES.PICK);
        }
    }


    drawOcclusion(renderFlags, frameCtx) {
        if (this.primitive !== "lines") {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.occlusionRenderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawShadow(renderFlags, frameCtx) {
        if ((this.primitive !== "points") && (this.primitive !== "lines")) {
            this.__drawLayer(renderFlags, frameCtx, this._renderers.shadowRenderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    //------------------------------------------------------------------------------------------------

    precisionRayPickSurface(portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldNormal) {
        const portion = this._portions[portionId];
        if (!portion) {
            this.model.error("portion not found: " + portionId);
            return false;
        }

        const retainedGeometry = portion.retainedGeometry;
        if (!retainedGeometry) {
            return false;
        }

        const state = this._state;

        if (retainedGeometry.matrix && (! retainedGeometry.inverseMatrix)) {
            retainedGeometry.inverseMatrix = math.inverseMat4(retainedGeometry.matrix, math.mat4());
        }

        if (worldNormal && retainedGeometry.inverseMatrix && (! retainedGeometry.normalMatrix)) {
            retainedGeometry.normalMatrix = math.transposeMat4(retainedGeometry.inverseMatrix, math.mat4());
        }

        const origin    = state.origin;
        const positions = retainedGeometry.quantizedPositions;
        const indices   = retainedGeometry.indices;
        const offset    = retainedGeometry.offset;

        const rtcRayOrigin = tempVec3a;
        const rtcRayDir = tempVec3b;

        rtcRayOrigin.set(origin ? math.subVec3(worldRayOrigin, origin, tempVec3c) : worldRayOrigin);  // World -> RTC
        rtcRayDir.set(worldRayDir);

        if (offset) {
            math.subVec3(rtcRayOrigin, offset);
        }

        math.transformRay(this.model.worldNormalMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir); // RTC -> local

        if (retainedGeometry.inverseMatrix) {
            math.transformRay(retainedGeometry.inverseMatrix, rtcRayOrigin, rtcRayDir, rtcRayOrigin, rtcRayDir);
        }

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

            const positionsDecodeMatrix = state.positionsDecodeMatrix;

            math.decompressPosition(a, positionsDecodeMatrix);
            math.decompressPosition(b, positionsDecodeMatrix);
            math.decompressPosition(c, positionsDecodeMatrix);

            if (math.rayTriangleIntersect(rtcRayOrigin, rtcRayDir, a, b, c, closestIntersectPos)) {

                if (retainedGeometry.matrix) {
                    math.transformPoint3(retainedGeometry.matrix, closestIntersectPos, closestIntersectPos);
                }

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
            if (retainedGeometry.normalMatrix) {
                math.transformVec3(retainedGeometry.normalMatrix, worldNormal, worldNormal);
            }
            math.transformVec3(this.model.worldNormalMatrix, worldNormal, worldNormal);
            math.normalizeVec3(worldNormal);
        }

        return gotIntersect;
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
        if (state.metallicRoughnessBuf) {
            state.metallicRoughnessBuf.destroy();
            state.metallicRoughnessBuf = null;
        }
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        if (state.indicesBuf) {
            state.indicesBuf.destroy();
            state.indicesBuf = null;
        }
        if (state.normalsBuf) {
            state.normalsBuf.destroy();
            state.normalsBuf = null;
        }
        if (state.edgeIndicesBuf) {
            state.edgeIndicesBuf.destroy();
            state.edgeIndicessBuf = null;
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
        state.destroy();
        this._state = null;
    }
}
