import {createRTCViewMat, math} from "../../math/index.js";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {createLightSetup, createProgramVariablesState, setupTexture} from '../../webgl/WebGLRenderer.js';
import {LinearEncoding} from "../../constants/constants.js";

import { ColorProgram        } from "./programs/ColorProgram.js";
import { ColorTextureProgram } from "./programs/ColorTextureProgram.js";
import { DepthProgram        } from "./programs/DepthProgram.js";
import { EdgesProgram        } from "./programs/EdgesProgram.js";
import { FlatColorProgram    } from "./programs/FlatColorProgram.js";
import { OcclusionProgram    } from "./programs/OcclusionProgram.js";
import { PBRProgram          } from "./programs/PBRProgram.js";
import { PickDepthProgram    } from "./programs/PickDepthProgram.js";
import { PickMeshProgram     } from "./programs/PickMeshProgram.js";
import { PickNormalsProgram  } from "./programs/PickNormalsProgram.js";
import { ShadowProgram       } from "./programs/ShadowProgram.js";
import { SilhouetteProgram   } from "./programs/SilhouetteProgram.js";
import { SnapProgram         } from "./programs/SnapProgram.js";

const tempVec2 = math.vec2();
const tempVec3 = math.vec3();
const tempVec4 = math.vec4();
const tempMat4 = math.mat4();
const vec3zero = math.vec3([0,0,0]);

const RENDER_PASSES = {
    // Skipped - suppress rendering
    NOT_RENDERED: 0,

    // Normal rendering - mutually exclusive modes
    COLOR_OPAQUE: 1,
    COLOR_TRANSPARENT: 2,

    // Emphasis silhouette rendering - mutually exclusive modes
    SILHOUETTE_HIGHLIGHTED: 3,
    SILHOUETTE_SELECTED: 4,
    SILHOUETTE_XRAYED: 5,

    // Edges rendering - mutually exclusive modes
    EDGES_COLOR_OPAQUE: 6,
    EDGES_COLOR_TRANSPARENT: 7,
    EDGES_HIGHLIGHTED: 8,
    EDGES_SELECTED: 9,
    EDGES_XRAYED: 10,

    // Picking
    PICK: 11
};

const safeInvVec3 = v => [ math.safeInv(v[0]), math.safeInv(v[1]), math.safeInv(v[2]) ];

export const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

export const getColSilhEdgePickFlags = (flags, transparent, hasEdges, scene, dst) => {
    const visible     = !!(flags & ENTITY_FLAGS.VISIBLE);
    const xrayed      = !!(flags & ENTITY_FLAGS.XRAYED);
    const highlighted = !!(flags & ENTITY_FLAGS.HIGHLIGHTED);
    const selected    = !!(flags & ENTITY_FLAGS.SELECTED);
    const edges       = !!(flags & ENTITY_FLAGS.EDGES);
    const pickable    = !!(flags & ENTITY_FLAGS.PICKABLE);
    const culled      = !!(flags & ENTITY_FLAGS.CULLED);

    let colorFlag;
    if (!visible || culled || xrayed
        || (highlighted && !scene.highlightMaterial.glowThrough)
        || (selected && !scene.selectedMaterial.glowThrough)) {
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
    if ((!hasEdges) || (!visible) || culled) {
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

    dst[0] = colorFlag;
    dst[1] = silhouetteFlag;
    dst[2] = edgeFlag;
    dst[3] = pickFlag;
};

export const getRenderers = (function() {
    const cachedRenderers = { };

    return function(scene, layerType, primitive, saoEnabled, pbrSupported, colorTextureSupported, surfaceHasNormals, makeRenderingAttributes) {
        const primKey = ((primitive === "points") || (primitive === "lines")) ? primitive : "triangles";
        const cacheKey = [ layerType, primKey, !!saoEnabled, !!pbrSupported, !!colorTextureSupported, !!surfaceHasNormals ].join(":");
        if (! (cacheKey in cachedRenderers)) {
            cachedRenderers[cacheKey] = { };
        }
        const cache = cachedRenderers[cacheKey];
        const sceneId = scene.id;
        if (! (sceneId in cache)) {
            const gl = scene.canvas.gl;
            const wrapRenderer = function(createProgramSetup, subGeometry, isEager) {
                const instantiate = function() {
                    const programVariablesState = createProgramVariablesState();
                    const programVariables = programVariablesState.programVariables;
                    const renderingAttributes = makeRenderingAttributes(programVariables, subGeometry);
                    return createProgramSetup(
                        programVariables,
                        renderingAttributes.geometryParameters,
                        function(programSetup, usePickClipPos) {
                            const pointsMaterial     = scene.pointsMaterial;
                            const setupPoints        = (primitive === "points") && (! subGeometry);

                            const getHash = () => [ scene._sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(programSetup.getHash ? programSetup.getHash() : [ ]).join(";");
                            const hash = getHash();
                            const getValid = () => hash === getHash();

                            const geometryParameters     = renderingAttributes.geometryParameters;
                            const incrementDrawState     = programSetup.incrementDrawState;
                            const isShadowProgram        = programSetup.isShadowProgram;
                            const attributes             = geometryParameters.attributes;
                            const worldPositionAttribute = attributes.position.world;
                            const clipPos                = "clipPos";

                            const [ program, errors ] = programVariablesState.buildProgram(
                                gl,
                                layerType + " " + primitive + " " + programSetup.programName,
                                {
                                    appendFragmentOutputs:          programSetup.appendFragmentOutputs,
                                    cleanerEdges:                   programSetup.cleanerEdges,
                                    clipPos:                        clipPos,
                                    clippableTest:                  renderingAttributes.clippableTest,
                                    clippingCaps:                   programSetup.clippingCaps,
                                    crossSections:                  scene.crossSections,
                                    discardPoints:                  setupPoints && pointsMaterial.roundPoints,
                                    getGammaFactor:                 scene.gammaOutput && (() => scene.gammaFactor),
                                    getLogDepth:                    programSetup.getLogDepth,
                                    getPointSize:                   (function() {
                                        const addends = [ ];
                                        if (setupPoints) {
                                            const pointSize = programVariables.createUniform("float", "pointSize", (set) => set(pointsMaterial.pointSize));
                                            if (pointsMaterial.perspectivePoints) {
                                                const nearPlaneHeight = programVariables.createUniform("float", "nearPlaneHeight", (set, state) => set(state.legacyFrameCtx.nearPlaneHeight));
                                                const minVal = `${Math.floor(pointsMaterial.minPerspectivePointSize)}.0`;
                                                const maxVal = `${Math.floor(pointsMaterial.maxPerspectivePointSize)}.0`;
                                                addends.push(`clamp((${nearPlaneHeight} * ${pointSize}) / gl_Position.w, ${minVal}, ${maxVal})`);
                                            } else {
                                                addends.push(pointSize);
                                            }
                                        } else if (subGeometry && subGeometry.vertices) {
                                            addends.push("1.0");
                                        }
                                        programSetup.incPointSizeBy10 && (primitive === "points") && addends.push("10.0");
                                        return (addends.length > 0) && (() => addends.join(" + "));
                                    })(),
                                    getVertexData:                  () => {
                                        const colorA = attributes.color;
                                        const flag = attributes.flags[programSetup.renderPassFlag];
                                        const renderPass = programVariables.createUniform("int", "renderPass", (set, state) => set(state.renderPass));
                                        const flagTest = (isShadowProgram
                                                          ? `(${flag} <= 0) || (${colorA}.a < 1.0)`
                                                          : `${flag} != ${renderPass}`);

                                        const afterFlagsColorLines = [
                                            `if (${flagTest}) {`,
                                            `   gl_Position = vec4(${programSetup.vertexCullX || 0.0}, 0.0, 0.0, 0.0);`, // Cull vertex
                                            "   return;",
                                            "}"
                                        ].concat(
                                            ((! renderingAttributes.dontCullOnAlphaZero) && (! programSetup.dontCullOnAlphaZero))
                                                ? [
                                                    `if (${colorA}.a == 0.0) {`,
                                                    "   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);", // Cull vertex
                                                    "   return;",
                                                    "}"
                                                ]
                                                : [ ]
                                        ).concat(
                                            (programSetup.filterIntensityRange && (primitive === "points") && pointsMaterial.filterIntensity)
                                                ? (function () {
                                                    const intensityRange  = programVariables.createUniform("vec2", "intensityRange", (set) => {
                                                        tempVec2[0] = pointsMaterial.minIntensity;
                                                        tempVec2[1] = pointsMaterial.maxIntensity;
                                                        set(tempVec2);
                                                    });
                                                    return [
                                                        `if ((${colorA}.a < ${intensityRange}[0]) || (${colorA}.a > ${intensityRange}[1])) {`,
                                                        "   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);", // Cull vertex
                                                        "   return;",
                                                        "}"
                                                    ];
                                                })()
                                            : [ ]);

                                        const vertexData = [ ];
                                        renderingAttributes.ensureColorAndFlagAvailable && renderingAttributes.ensureColorAndFlagAvailable(vertexData);
                                        afterFlagsColorLines.forEach(line => vertexData.push(line));
                                        renderingAttributes.appendVertexData(vertexData);
                                        const viewPosition = geometryParameters.attributes.position.view;
                                        vertexData.push(`vec4 ${viewPosition} = ${geometryParameters.viewMatrix} * ${worldPositionAttribute};`);
                                        vertexData.push(`vec4 ${clipPos} = ${geometryParameters.projMatrix} * ${viewPosition};`);
                                        return vertexData;
                                    },
                                    projMatrix:                     geometryParameters.projMatrix,
                                    sectionPlanesState:             scene._sectionPlanesState,
                                    testPerspectiveForGl_FragDepth: ((primitive !== "points") && (primitive !== "lines")) || subGeometry,
                                    usePickClipPos:                 usePickClipPos,
                                    worldPositionAttribute:         worldPositionAttribute
                                });

                            if (errors) {
                                console.error(errors);
                                return {
                                    getValid:  getValid,
                                    destroy:   () => { },
                                    drawLayer: (frameCtx, layer, renderPass) => { }
                                };
                            } else {
                                return {
                                    getValid:  getValid,
                                    destroy:   () => program.destroy(),
                                    drawLayer: (frameCtx, layer, renderPass) => {
                                        if (frameCtx.lastProgramId !== program.id) {
                                            frameCtx.lastProgramId = program.id;
                                            program.bind();
                                        }

                                        const origin = layer.origin;
                                        const model = layer.model;
                                        const viewParams = frameCtx.viewParams;
                                        const rtcOrigin = tempVec3;
                                        math.transformPoint3(model.matrix, origin, rtcOrigin);

                                        const viewMatrix = viewParams.viewMatrix;
                                        const projMatrix = viewParams.projMatrix;

                                        if (frameCtx.snapPickOrigin) {
                                            frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                                            frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                                            frameCtx.snapPickOrigin[2] = rtcOrigin[2];
                                        }

                                        const state = {
                                            legacyFrameCtx: frameCtx,
                                            layerTextureSet: layer.layerTextureSet,
                                            mesh: {
                                                layerIndex:  layer.layerIndex,
                                                origin:      rtcOrigin,
                                                renderFlags: { sectionPlanesActivePerLayer: model.renderFlags.sectionPlanesActivePerLayer },
                                            },
                                            renderPass:     renderPass,
                                            view: {
                                                eye:              viewParams.eye,
                                                far:              viewParams.far,
                                                projMatrix:       projMatrix,
                                                viewMatrix:       math.compareVec3(rtcOrigin, vec3zero) ? viewMatrix : createRTCViewMat(viewMatrix, rtcOrigin, tempMat4),
                                                viewNormalMatrix: viewParams.viewNormalMatrix
                                            }
                                        };

                                        program.inputSetters.setUniforms(frameCtx, state);

                                        layer.drawCalls[subGeometry ? (subGeometry.vertices ? "drawVertices" : "drawEdges") : "drawSurface"](
                                            program.inputSetters.attributesHash,
                                            renderingAttributes.layerTypeInputs,
                                            {
                                                projMatrix:       projMatrix,
                                                viewMatrix:       math.compareVec3(rtcOrigin, vec3zero) ? viewMatrix : createRTCViewMat(viewMatrix, rtcOrigin, tempMat4),
                                                viewNormalMatrix: viewParams.viewNormalMatrix,
                                                eye:              viewParams.eye
                                            });

                                        if (incrementDrawState) {
                                            frameCtx.drawElements++;
                                        }
                                    }
                                };
                            }
                        });
                };
                let renderer = isEager && instantiate();
                return {
                    drawLayer: (frameCtx, layer, renderPass) => {
                        if (! renderer) {
                            renderer = instantiate();
                        }
                        renderer.drawLayer(frameCtx, layer, renderPass);
                    },
                    revalidate: force => {
                        if (renderer && (force || (! renderer.getValid()))) {
                            renderer.destroy();
                            renderer = isEager && instantiate();
                        }
                    }
                };
            };

            // Pre-initialize certain renderers that would otherwise be lazy-initialised on user interaction,
            // such as picking or emphasis, so that there is no delay when user first begins interacting with the viewer.
            const eager = (createProgramSetup, subGeometry) => wrapRenderer(createProgramSetup, subGeometry, true);
            const lazy  = (createProgramSetup, subGeometry) => wrapRenderer(createProgramSetup, subGeometry, false);

            const makeColorProgram = (vars, geo, lights, sao) => ColorProgram(vars, geo, scene.logarithmicDepthBufferEnabled, lights, sao, primitive);

            const makePickDepthProgram   = (vars, geo, c) => c(PickDepthProgram(vars, geo, scene.logarithmicDepthBufferEnabled), true);
            const makePickMeshProgram    = (vars, geo, c) => c(PickMeshProgram(vars, geo, scene.logarithmicDepthBufferEnabled), true);
            const makePickNormalsProgram = (vars, geo, c, isFlat) => c(PickNormalsProgram(vars, geo, scene.logarithmicDepthBufferEnabled, isFlat), true);

            const makeSnapProgram = (vars, geo, c, isSnapInit, isPoints) => c(SnapProgram(vars, geo, isSnapInit, isPoints), true);

            if (primitive === "points") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": lazy((vars, geo, c) => c(makeColorProgram(vars, geo, null, null))) } },
                    occlusionRenderer:  lazy((vars, geo, c) => c(OcclusionProgram(vars, scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:  lazy(makePickDepthProgram),
                    pickMeshRenderer:   lazy(makePickMeshProgram),
                    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
                    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
                    // drawShadow has been nop in VBO point layers
                    // shadowRenderer:     instancing && lazy((vars, geo, c) => c(ShadowProgram(scene.logarithmicDepthBufferEnabled))),
                    silhouetteRenderer: lazy((vars, geo, c) => c(SilhouetteProgram(vars, geo, scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((vars, geo, c) => makeSnapProgram(vars, geo, c, true,  true)),
                    snapVertexRenderer: lazy((vars, geo, c) => makeSnapProgram(vars, geo, c, false, true), { vertices: true })
                };
            } else if (primitive === "lines") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": lazy((vars, geo, c) => c(makeColorProgram(vars, geo, null, null))) } },
                    silhouetteRenderer: lazy((vars, geo, c) => c(SilhouetteProgram(vars, geo, scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((vars, geo, c) => makeSnapProgram(vars, geo, c, true,  false)),
                    snapEdgeRenderer:   lazy((vars, geo, c) => makeSnapProgram(vars, geo, c, false, false), { vertices: false }),
                    snapVertexRenderer: lazy((vars, geo, c) => makeSnapProgram(vars, geo, c, false, false), { vertices: true })
                };
            } else {
                cache[sceneId] = {
                    colorRenderers: (function() {
                        // WARNING: Changing `useMaps' to `true' for DTX might have unexpected consequences while binding textures, as the DTX texture binding mechanism doesn't rely on `frameCtx.textureUnit` the way VBO does (see setSAORenderState);
                        const createLights = vars => createLightSetup(vars, scene._lightsState);
                        const createSAO = vars => {
                            const uSAOParams = vars.createUniform("vec4", "uSAOParams", (set, state) => set(state.legacyFrameCtx.saoParams));
                            const uOcclusionTexture = setupTexture(vars, "sampler2D", "uOcclusionTexture", LinearEncoding, (set, state) => set(state.legacyFrameCtx.occlusionTexture));
                            return {
                                getAmbient: (gl_FragCoord) => {
                                    // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                                    // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                                    const uv          = `${gl_FragCoord}.xy / ${uSAOParams}.xy`; // / viewportWH
                                    const blendCutoff = `${uSAOParams}.z`;
                                    const blendFactor = `${uSAOParams}.w`;
                                    const unPackFactors = "(255. / 256.) / vec4(256. * 256. * 256., 256. * 256., 256., 1.)";
                                    return `(smoothstep(${blendCutoff}, 1.0, dot(${uOcclusionTexture(uv)}, ${unPackFactors})) * ${blendFactor})`;
                                }
                            };
                        };
                        const saoRenderers = function(useSao) {
                            const makeColorTextureProgram = (vars, geo, useAlphaCutoff) => ColorTextureProgram(vars, geo, scene, createLights(vars), useSao && createSAO(vars), useAlphaCutoff, scene.gammaOutput); // If gammaOutput set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
                            return {
                                "PBR": pbrSupported && lazy((vars, geo, c) => c(PBRProgram(vars, geo, scene, createLights(vars), useSao && createSAO(vars)))),
                                "texture": colorTextureSupported && {
                                    "alphaCutoff-": lazy((vars, geo, c) => c(makeColorTextureProgram(vars, geo, false))),
                                    "alphaCutoff+": lazy((vars, geo, c) => c(makeColorTextureProgram(vars, geo, true)))
                                },
                                "vertex": (surfaceHasNormals
                                           ? lazy((vars, geo, c) => c(makeColorProgram(vars, geo, createLights(vars), useSao && createSAO(vars))))
                                           : lazy((vars, geo, c) => c(FlatColorProgram(vars, geo, scene.logarithmicDepthBufferEnabled, createLights(vars), useSao && createSAO(vars)))))
                            };
                        };
                        return {
                            "sao-": saoRenderers(false),
                            "sao+": saoEnabled && saoRenderers(true)
                        };
                    })(),
                    depthRenderer:           lazy((vars, geo, c) => c(DepthProgram(vars, geo, scene.logarithmicDepthBufferEnabled))),
                    edgesRenderers: {
                        uniform: lazy((vars, geo, c) => c(EdgesProgram(vars, geo, scene.logarithmicDepthBufferEnabled, true)),  { vertices: false }),
                        vertex:  lazy((vars, geo, c) => c(EdgesProgram(vars, geo, scene.logarithmicDepthBufferEnabled, false)), { vertices: false })
                    },
                    occlusionRenderer:       lazy((vars, geo, c) => c(OcclusionProgram(vars, scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:       eager(makePickDepthProgram),
                    pickMeshRenderer:        eager(makePickMeshProgram),
                    pickNormalsFlatRenderer: eager((vars, geo, c) => makePickNormalsProgram(vars, geo, c, true)),
                    pickNormalsRenderer:     eager((vars, geo, c) => makePickNormalsProgram(vars, geo, c, false)),
                    shadowRenderer:          lazy((vars, geo, c) => c(ShadowProgram(vars, scene))),
                    silhouetteRenderer:      eager((vars, geo, c) => c(SilhouetteProgram(vars, geo, scene.logarithmicDepthBufferEnabled, false))),
                    snapInitRenderer:        eager((vars, geo, c) => makeSnapProgram(vars, geo, c, true,  false)),
                    snapEdgeRenderer:        eager((vars, geo, c) => makeSnapProgram(vars, geo, c, false, false), { vertices: false }),
                    snapVertexRenderer:      eager((vars, geo, c) => makeSnapProgram(vars, geo, c, false, false), { vertices: true })
                };
            }

            const revalidateAll = force => {
                (function rec(obj) {
                    if (obj.revalidate) {
                        obj.revalidate(force);
                    } else {
                        Object.values(obj).forEach(v => v && rec(v));
                    }
                })(cache[sceneId]);
            };
            const compile = () => revalidateAll(false);
            compile();
            scene.on("compile", compile);
            scene.on("destroyed", () => {
                delete cache[sceneId];
            });
        }
        return cache[sceneId];
    };
})();

export class Layer {

    constructor(model, primitive, origin) {

        this.model     = model;
        this.primitive = primitive;
        this.origin    = origin;

        this._meshes = [];
        // The axis-aligned World-space boundary of this Layer's positions.
        this._aabb = math.collapseAABB3();
        this._aabbDirty = true;
    }

    finalize() {
        if (! this._compiledPortions) {
            this._compiledPortions = this.compilePortions();
            this.solid = this._compiledPortions.solid;
            this.sortId = this._compiledPortions.sortId;
            this.layerTextureSet = this._compiledPortions.layerTextureSet;
            this.drawCalls = this._compiledPortions.drawCalls;
            this._renderers = this._compiledPortions.renderers;
            this._setFlags = this._compiledPortions.setFlags;

            this.setColor  = this._compiledPortions.setColor;
            this.setMatrix = this._compiledPortions.setMatrix;
            this.setOffset = this._compiledPortions.setOffset;

            this.getEachIndex = this._compiledPortions.getEachIndex;
            this.getEachVertex = this._compiledPortions.getEachVertex;
            this.readGeometryData = this._compiledPortions.readGeometryData;
            this.precisionRayPickSurface = this._compiledPortions.precisionRayPickSurface;

            // These counts are used to avoid unnecessary render passes
            this._countsByFlag = { };
            const setupFlagCount = (entityFlag, modelCountProperty) => {
                const cnt = {
                    count: 0,
                    fromFlags: (flags, onlyIncrement) => {
                        if (flags & entityFlag) {
                            cnt.count++;
                            this.model[modelCountProperty]++;
                        } else if (! onlyIncrement) {
                            cnt.count--;
                            this.model[modelCountProperty]--;
                        }
                    }
                };
                this._countsByFlag[entityFlag] = cnt;
            };
            setupFlagCount(ENTITY_FLAGS.VISIBLE,     "numVisibleLayerPortions");
            setupFlagCount(ENTITY_FLAGS.CULLED,      "numCulledLayerPortions");
            setupFlagCount(ENTITY_FLAGS.PICKABLE,    "numPickableLayerPortions");
            setupFlagCount(ENTITY_FLAGS.CLIPPABLE,   "numClippableLayerPortions");
            setupFlagCount(ENTITY_FLAGS.XRAYED,      "numXRayedLayerPortions");
            setupFlagCount(ENTITY_FLAGS.HIGHLIGHTED, "numHighlightedLayerPortions");
            setupFlagCount(ENTITY_FLAGS.SELECTED,    "numSelectedLayerPortions");
            if (this._renderers.edgesRenderers) {
                setupFlagCount(ENTITY_FLAGS.EDGES, "numEdgesLayerPortions");
            }

            // Optimize initFlags to not require Object.values call each time (adds up a lot)
            this._countsByFlagArr = Object.values(this._countsByFlag);
            this._numTransparentLayerPortions = 0;
        }
    }

    aabbChanged() { this._aabbDirty = true; }

    __drawLayer(renderFlags, frameCtx, renderer, pass) {
        if ((this._countsByFlag[ENTITY_FLAGS.CULLED].count < this._portions.length) && (this._countsByFlag[ENTITY_FLAGS.VISIBLE].count > 0)) {
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
                    const gl = this.model.scene.canvas.gl;
                    if (backfaces) {
                        gl.disable(gl.CULL_FACE);
                    } else {
                        gl.enable(gl.CULL_FACE);
                    }
                    frameCtx.backfaces = backfaces;
                }
            }
            frameCtx.textureUnit = 0; // WIP Maybe only for (! snap)?
            renderer.drawLayer(frameCtx, this, pass);
        }
    }

    __setVec4FromMaterialColorAlpha(color, alpha, dst) {
        dst[0] = color[0];
        dst[1] = color[1];
        dst[2] = color[2];
        dst[3] = alpha;
        return dst;
    }

    // ---------------------- COLOR RENDERING -----------------------------------

    __drawColor(renderFlags, frameCtx, renderOpaque) {
        if ((renderOpaque ? (this._numTransparentLayerPortions < this._portions.length) : (this._numTransparentLayerPortions > 0))
            &&
            (this._countsByFlag[ENTITY_FLAGS.XRAYED].count < this._portions.length)) {
            const saoRenderer = (renderOpaque && frameCtx.withSAO && this._renderers.colorRenderers["sao+"]) || this._renderers.colorRenderers["sao-"];
            const renderer = ((frameCtx.pbrEnabled && saoRenderer["PBR"])
                              ? saoRenderer["PBR"]
                              : ((frameCtx.colorTextureEnabled && saoRenderer["texture"])
                                 ? saoRenderer["texture"][(this.layerTextureSet && (typeof(this.layerTextureSet.alphaCutoff) === "number")) ? "alphaCutoff+" : "alphaCutoff-"]
                                 : saoRenderer["vertex"]));
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
        // Assume whatever post-effect uses depth (eg SAO) does not apply to transparent objects
        const renderer = this._renderers.depthRenderer;
        if (renderer && (this._numTransparentLayerPortions < this._portions.length) && (this._countsByFlag[ENTITY_FLAGS.XRAYED].count < this._portions.length)) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    __drawSilhouette(renderFlags, frameCtx, material, renderPass) {
        frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(material.fillColor, material.fillAlpha, tempVec4);
        this.__drawLayer(renderFlags, frameCtx, this._renderers.silhouetteRenderer, renderPass);
    }

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.XRAYED].count > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.xrayMaterial, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.HIGHLIGHTED].count > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.highlightMaterial, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.SELECTED].count > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.selectedMaterial, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    __drawVertexEdges(renderFlags, frameCtx, renderPass) {
        const renderer = this._renderers.edgesRenderers && this._renderers.edgesRenderers.vertex;
        if (renderer && (this._countsByFlag[ENTITY_FLAGS.EDGES].count > 0)) {
            this.__drawLayer(renderFlags, frameCtx, renderer, renderPass);
        }
    }

    drawEdgesColorOpaque(renderFlags, frameCtx) {
        if (this._compiledPortions.edgesColorOpaqueAllowed()) {
            this.__drawVertexEdges(renderFlags, frameCtx, RENDER_PASSES.EDGES_COLOR_OPAQUE);
        }
    }

    drawEdgesColorTransparent(renderFlags, frameCtx) {
        if (this._numTransparentLayerPortions > 0) {
            this.__drawVertexEdges(renderFlags, frameCtx, RENDER_PASSES.EDGES_COLOR_TRANSPARENT);
        }
    }

    __drawUniformEdges(renderFlags, frameCtx, material, renderPass) {
        const renderer = this._renderers.edgesRenderers && this._renderers.edgesRenderers.uniform;
        if (renderer) {
            frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(material.edgeColor, material.edgeAlpha, tempVec4);
            this.__drawLayer(renderFlags, frameCtx, renderer, renderPass);
        }
    }

    drawEdgesHighlighted(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.HIGHLIGHTED].count > 0) {
            this.__drawUniformEdges(renderFlags, frameCtx, this.model.scene.highlightMaterial, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.SELECTED].count > 0) {
            this.__drawUniformEdges(renderFlags, frameCtx, this.model.scene.selectedMaterial, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._countsByFlag[ENTITY_FLAGS.XRAYED].count > 0) {
            this.__drawUniformEdges(renderFlags, frameCtx, this.model.scene.xrayMaterial, RENDER_PASSES.EDGES_XRAYED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    __drawPick(renderFlags, frameCtx, renderer) {
        if (renderer) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.PICK);
        }
    }

    drawPickMesh(renderFlags, frameCtx) {
        this.__drawPick(renderFlags, frameCtx, this._renderers.pickMeshRenderer);
    }

    drawPickDepths(renderFlags, frameCtx) {
        this.__drawPick(renderFlags, frameCtx, this._renderers.pickDepthRenderer);
    }

    drawPickNormals(renderFlags, frameCtx) {
        const renderer = (false // TODO for VBO: this._state.normalsBuf
                          ? this._renderers.pickNormalsRenderer
                          : this._renderers.pickNormalsFlatRenderer);
        this.__drawPick(renderFlags, frameCtx, renderer);
    }

    drawSnap(renderFlags, frameCtx, isSnapInit) {
        frameCtx.snapPickOrigin = [0, 0, 0];

        if (this._aabbDirty) { // Per-layer AABB for best RTC accuracy
            math.collapseAABB3(this._aabb);
            this._meshes.forEach(m => math.expandAABB3(this._aabb, m.aabb));
            this._aabbDirty = false;
        }

        const aabb = this._aabb;
        frameCtx.snapPickCoordinateScale = math.mulVec3Scalar(
            safeInvVec3([ aabb[3] - aabb[0], aabb[4] - aabb[1], aabb[5] - aabb[2] ]),
            math.MAX_INT);

        const renderer = isSnapInit ? this._renderers.snapInitRenderer : ((frameCtx.snapMode === "edge") ? this._renderers.snapEdgeRenderer : this._renderers.snapVertexRenderer);
        this.__drawPick(renderFlags, frameCtx, renderer);

        frameCtx.snapPickLayerParams.push({
            origin: frameCtx.snapPickOrigin.slice(),
            coordinateScale: safeInvVec3(frameCtx.snapPickCoordinateScale)
        });
    }


    drawOcclusion(renderFlags, frameCtx) {
        const renderer = this._renderers.occlusionRenderer;
        if (renderer) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    drawShadow(renderFlags, frameCtx) {
        const renderer = this._renderers.shadowRenderer;
        if (renderer) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }


    initFlags(portionId, flags, transparent) {
        this._countsByFlagArr.forEach(cnt => cnt.fromFlags(flags, true));

        if (transparent) {
            this._numTransparentLayerPortions++;
            this.model.numTransparentLayerPortions++;
        }
        const deferred = (this.primitive !== "points");
        this._setFlags(portionId, flags, transparent, deferred);
        this._compiledPortions.setFlags2(portionId, flags, deferred);
    }

    flushInitFlags() {
        this._compiledPortions.setDeferredFlags();
    }

    setVisible(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.VISIBLE].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setCulled(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.CULLED].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setPickable(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.PICKABLE].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setClippable(portionId, flags) {
        this._countsByFlag[ENTITY_FLAGS.CLIPPABLE].fromFlags(flags);
        this._compiledPortions.setClippableFlags(portionId, flags);
    }

    setCollidable(portionId, flags) {
    }

    setXRayed(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.XRAYED].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setHighlighted(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.HIGHLIGHTED].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setSelected(portionId, flags, transparent) {
        this._countsByFlag[ENTITY_FLAGS.SELECTED].fromFlags(flags);
        this._setFlags(portionId, flags, transparent);
    }

    setEdges(portionId, flags, transparent) {
        if (this._countsByFlag[ENTITY_FLAGS.EDGES]) {
            this._countsByFlag[ENTITY_FLAGS.EDGES].fromFlags(flags);
            this._setFlags(portionId, flags, transparent);
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

    destroy() {
        this._compiledPortions && this._compiledPortions.destroy();
    }
}
