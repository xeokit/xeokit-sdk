import {math} from "../../math/index.js";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {WEBGL_INFO} from "../../webglInfo.js";

import {LayerRenderer, lazyShaderUniform, setupTexture} from "./LayerRenderer.js";

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

const createLightSetup = function(lightsState, setupCubes) {
    const lightsStateUniform = (name, type, getUniformValue) => {
        const uniform = lazyShaderUniform(name, type);
        return {
            appendDefinitions: uniform.appendDefinitions,
            toString: uniform.toString,
            setupLightsInputs: (getUniformSetter) => {
                const setUniform = uniform.setupInputs(getUniformSetter);
                return setUniform && (() => setUniform(getUniformValue()));
            }
        };
    };

    const lightAmbient = lightsStateUniform("lightAmbient", "vec4", () => lightsState.getAmbientColorAndIntensity());

    const lights = lightsState.lights;
    const directionals = lights.map((light, i) => {
        const lightUniforms = {
            color: lightsStateUniform(`lightColor${i}`, "vec4", () => {
                const light = lights[i]; // in case it changed
                tempVec4[0] = light.color[0];
                tempVec4[1] = light.color[1];
                tempVec4[2] = light.color[2];
                tempVec4[3] = light.intensity;
                return tempVec4;
            }),
            position:  lightsStateUniform(`lightPos${i}`, "vec3", () => lights[i].pos),
            direction: lightsStateUniform(`lightDir${i}`, "vec3", () => lights[i].dir),
        };

        const withViewLightDir = getDirection => {
            return {
                appendDefinitions: (src) => Object.values(lightUniforms).forEach(u => u.appendDefinitions(src)),
                glslLight: {
                    getColor: () => `${lightUniforms.color}.rgb * ${lightUniforms.color}.a`,
                    getDirection: (viewMatrix, viewPosition) => `normalize(${getDirection(viewMatrix, viewPosition)})`
                },
                setupLightsInputs: (getUniformSetter) => {
                    const setters = Object.values(lightUniforms).map(u => u.setupLightsInputs(getUniformSetter)).filter(v => v);
                    return () => setters.forEach(setState => setState());
                }
            };
        };

        if ((light.type === "dir") || (light.type === "spot")) {
            if (light.space === "view") {
                return withViewLightDir((viewMatrix, viewPosition) => lightUniforms.direction);
            } else {
                return withViewLightDir((viewMatrix, viewPosition) => `(${viewMatrix} * vec4(${lightUniforms.direction}, 0.0)).xyz`);
            }
        } else if (light.type === "point") {
            if (light.space === "view") {
                return withViewLightDir((viewMatrix, viewPosition) => `${viewPosition}.xyz - ${lightUniforms.position}`);
            } else {
                return withViewLightDir((viewMatrix, viewPosition) => `(${viewMatrix} * vec4(-${lightUniforms.position}, 0.0)).xyz`);
            }
        } else {
            return null;
        }
    }).filter(v => v);

    const setupCubeTexture = (name, getMaps) => {
        const getValue = () => { const m = getMaps(); return (m.length > 0) && m[0]; };
        const initMap = getValue();
        const tex = initMap && setupTexture(name, "samplerCube", initMap.encoding, false);
        return tex && {
            appendDefinitions:     tex.appendDefinitions,
            getTexCoordExpression: tex.getTexCoordExpression,
            getValueExpression:    tex.getValueExpression,
            setupInputs:           (getInputSetter) => {
                const setInputsState = tex.setupInputs(getInputSetter);
                return setInputsState && ((frameCtx) => setInputsState(getValue().texture, null, frameCtx));
            }
        };
    };

    const lightMap      = setupCubes && setupCubeTexture("light",      () => lightsState.lightMaps);
    const reflectionMap = setupCubes && setupCubeTexture("reflection", () => lightsState.reflectionMaps);

    return {
        getHash: () => lightsState.getHash(),
        appendDefinitions: (src) => {
            lightAmbient.appendDefinitions(src);
            directionals.forEach(light => light.appendDefinitions(src));
            lightMap && lightMap.appendDefinitions(src);
            reflectionMap && reflectionMap.appendDefinitions(src);
        },
        getAmbientColor: () => `${lightAmbient}.rgb * ${lightAmbient}.a`,
        directionalLights: directionals.map(light => light.glslLight),
        getIrradiance: lightMap && ((worldNormal) => `${lightMap.getValueExpression(worldNormal)}.rgb`),
        getReflectionRadiance: reflectionMap && ((reflectVec, mipLevel) => `${reflectionMap.getValueExpression(reflectVec, mipLevel)}.rgb`),
        setupInputs: (getUniformSetter) => {
            const setAmbientInputState = lightAmbient.setupLightsInputs(getUniformSetter);
            const setDirectionalsInputStates = directionals.map(light => light.setupLightsInputs(getUniformSetter));
            const uLightMap      = lightMap && lightMap.setupInputs(getUniformSetter);
            const uReflectionMap = reflectionMap && reflectionMap.setupInputs(getUniformSetter);
            return function(frameCtx) {
                setAmbientInputState && setAmbientInputState();
                setDirectionalsInputStates.forEach(setState => setState());
                uLightMap && uLightMap(frameCtx);
                uReflectionMap && uReflectionMap(frameCtx);
            };
        }
    };
};

const createPickClipTransformSetup = function(gl, renderBufferSize) {
    return {
        appendDefinitions: (src) => {
            src.push("uniform vec2 pickClipPos;");
            src.push("uniform vec2 drawingBufferSize;");
        },
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / ${renderBufferSize.toFixed(1)} * ${clipPos}.w, ${clipPos}.zw)`,
        setupInputs: (getUniformSetter) => {
            const uPickClipPos = getUniformSetter("pickClipPos");
            const uDrawingBufferSize = getUniformSetter("drawingBufferSize");
            return function(frameCtx) {
                uPickClipPos(frameCtx.pickClipPos);
                tempVec2[0] = gl.drawingBufferWidth;
                tempVec2[1] = gl.drawingBufferHeight;
                uDrawingBufferSize(tempVec2);
            };
        }
    };
};

const createSAOSetup = (gl, sceneSAO, textureUnit = undefined) => {
    return {
        appendDefinitions: (src) => {
            src.push("uniform sampler2D uOcclusionTexture;");
            src.push("uniform vec4      uSAOParams;");
            src.push("const float       unpackDownScale = 255. / 256.;");
            src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
            src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");
            src.push("float unpackRGBToFloat(const in vec4 v) {");
            src.push("    return dot(v, unPackFactors);");
            src.push("}");
        },
        getAmbient: (gl_FragCoord) => {
            // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
            // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
            const viewportWH  = "uSAOParams.xy";
            const uv          = `${gl_FragCoord}.xy / ${viewportWH}`;
            const blendCutoff = "uSAOParams.z";
            const blendFactor = "uSAOParams.w";
            return `(smoothstep(${blendCutoff}, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, ${uv}))) * ${blendFactor})`;
        },
        setupInputs: (getUniformSetter) => {
            const uOcclusionTexture = getUniformSetter("uOcclusionTexture");
            const uSAOParams        = getUniformSetter("uSAOParams");

            return function(frameCtx) {
                const sao = sceneSAO;
                if (sao.possible) {
                    tempVec4[0] = gl.drawingBufferWidth;  // viewportWidth
                    tempVec4[1] = gl.drawingBufferHeight; // viewportHeight
                    tempVec4[2] = sao.blendCutoff;
                    tempVec4[3] = sao.blendFactor;
                    uSAOParams(tempVec4);
                    uOcclusionTexture(frameCtx.occlusionTexture, textureUnit ?? frameCtx.textureUnit);
                    if (textureUnit === undefined) {
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
                        frameCtx.bindTexture++;
                    }
                }
            };
        }
    };
};

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

    return function(scene, cacheKey, primitive, isVBO, makeRenderingAttributes) {
        if (! (cacheKey in cachedRenderers)) {
            cachedRenderers[cacheKey] = { };
        }
        const primKey = ((primitive === "points") || (primitive === "lines")) ? primitive : "triangles";
        if (! (primKey in cachedRenderers[cacheKey])) {
            cachedRenderers[cacheKey][primKey] = { };
        }
        const cache = cachedRenderers[cacheKey][primKey];
        const sceneId = scene.id;
        if (! (sceneId in cache)) {

            const wrapRenderer = function(createProgramSetup, subGeometry, isEager) {
                const instantiate = function() {
                    const renderingAttributes = makeRenderingAttributes(subGeometry);
                    return createProgramSetup(
                        renderingAttributes.geometryParameters,
                        function(programSetup) {
                            return new LayerRenderer(
                                scene,
                                primitive,
                                programSetup,
                                subGeometry,
                                renderingAttributes);
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

            const gl = scene.canvas.gl;

            const makeColorProgram = (geo, lights, sao) => ColorProgram(geo, scene.logarithmicDepthBufferEnabled, lights, sao, primitive);

            const makePickDepthProgram   = (geo, isPoints) => PickDepthProgram(geo, scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickMeshProgram    = (geo, isPoints) => PickMeshProgram(geo, scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickNormalsProgram = (geo, isFlat)   => PickNormalsProgram(geo, scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 3), isFlat);

            const makeSnapProgram = (geo, isSnapInit, isPoints) => SnapProgram(geo, isSnapInit, isPoints);

            if (primitive === "points") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": { "flat-": lazy((geo, c) => c(makeColorProgram(geo, null, null))) } } },
                    occlusionRenderer:  lazy((geo, c) => c(OcclusionProgram(scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:  lazy((geo, c) => c(makePickDepthProgram(geo, true))),
                    pickMeshRenderer:   lazy((geo, c) => c(makePickMeshProgram(geo, true))),
                    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
                    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
                    // drawShadow has been nop in VBO point layers
                    // shadowRenderer:     instancing && lazy((geo, c) => c(ShadowProgram(scene.logarithmicDepthBufferEnabled))),
                    silhouetteRenderer: lazy((geo, c) => c(SilhouetteProgram(geo, scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((geo, c) => c(makeSnapProgram(geo, true,  true))),
                    snapVertexRenderer: lazy((geo, c) => c(makeSnapProgram(geo, false, true)), { vertices: true })
                };
            } else if (primitive === "lines") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": { "flat-": lazy((geo, c) => c(makeColorProgram(geo, null, null))) } } },
                    silhouetteRenderer: lazy((geo, c) => c(SilhouetteProgram(geo, scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((geo, c) => c(makeSnapProgram(geo, true,  false))),
                    snapEdgeRenderer:   lazy((geo, c) => c(makeSnapProgram(geo, false, false)), { vertices: false }),
                    snapVertexRenderer: lazy((geo, c) => c(makeSnapProgram(geo, false, false)), { vertices: true })
                };
            } else {
                cache[sceneId] = {
                    colorRenderers: (function() {
                        // WARNING: Changing `useMaps' to `true' for DTX might have unexpected consequences while binding textures, as the DTX texture binding mechanism doesn't rely on `frameCtx.textureUnit` the way VBO does (see setSAORenderState);
                        const lights = createLightSetup(scene._lightsState, false);
                        const saoRenderers = function(sao) {
                            const makeColorTextureProgram = (geo, useAlphaCutoff) => ColorTextureProgram(geo, scene, lights, sao, useAlphaCutoff, scene.gammaOutput); // If gammaOutput set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
                            return (isVBO
                                    ? {
                                        "PBR": lazy((geo, c) => c(PBRProgram(geo, scene, createLightSetup(scene._lightsState, true), sao))),
                                        "texture": {
                                            "alphaCutoff-": lazy((geo, c) => c(makeColorTextureProgram(geo, false))),
                                            "alphaCutoff+": lazy((geo, c) => c(makeColorTextureProgram(geo, true)))
                                        },
                                        "vertex": {
                                            "flat-": lazy((geo, c) => c(makeColorProgram(geo, lights, sao))),
                                            "flat+": lazy((geo, c) => c(FlatColorProgram(geo, scene.logarithmicDepthBufferEnabled, lights, sao)))
                                        }
                                    }
                                    : { "vertex": { "flat-": lazy((geo, c) => c(makeColorProgram(geo, lights, sao))) } });
                        };
                        return {
                            "sao-": saoRenderers(null),
                            "sao+": saoRenderers(createSAOSetup(gl, scene.sao, isVBO ? undefined : 10))
                        };
                    })(),
                    depthRenderer:           lazy((geo, c) => c(DepthProgram(scene.logarithmicDepthBufferEnabled))),
                    edgesRenderers: {
                        uniform: lazy((geo, c) => c(EdgesProgram(geo, scene.logarithmicDepthBufferEnabled, true)),  { vertices: false }),
                        vertex:  lazy((geo, c) => c(EdgesProgram(geo, scene.logarithmicDepthBufferEnabled, false)), { vertices: false })
                    },
                    occlusionRenderer:       lazy((geo, c) => c(OcclusionProgram(scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:       eager((geo, c) => c(makePickDepthProgram(geo, false))),
                    pickMeshRenderer:        eager((geo, c) => c(makePickMeshProgram(geo, false))),
                    pickNormalsFlatRenderer: eager((geo, c) => c(makePickNormalsProgram(geo, true))),
                    pickNormalsRenderer:     isVBO && eager((geo, c) => c(makePickNormalsProgram(geo, false))),
                    shadowRenderer:          isVBO && lazy((geo, c) => c(ShadowProgram(scene))),
                    silhouetteRenderer:      eager((geo, c) => c(SilhouetteProgram(geo, scene.logarithmicDepthBufferEnabled, false))),
                    snapInitRenderer:        eager((geo, c) => c(makeSnapProgram(geo, true,  false))),
                    snapEdgeRenderer:        eager((geo, c) => c(makeSnapProgram(geo, false, false)), { vertices: false }),
                    snapVertexRenderer:      eager((geo, c) => c(makeSnapProgram(geo, false, false)), { vertices: true })
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
                revalidateAll(true);
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
            this.layerDrawState = this._compiledPortions.layerDrawState;
            this._renderers = this._compiledPortions.renderers;
            this._setFlags = this._compiledPortions.setFlags;

            this.setColor  = this._compiledPortions.setColor;
            this.setMatrix = this._compiledPortions.setMatrix;
            this.setOffset = this._compiledPortions.setOffset;

            this.getEachIndex = this._compiledPortions.getEachIndex;
            this.getEachVertex = this._compiledPortions.getEachVertex;
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
                    const gl = frameCtx.gl;
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

            const saoRenderer = (renderOpaque && frameCtx.withSAO && this.model.saoEnabled && this._renderers.colorRenderers["sao+"]) || this._renderers.colorRenderers["sao-"];
            const renderer = ((saoRenderer["PBR"] && frameCtx.pbrEnabled && this.model.pbrEnabled && this.layerDrawState.pbrSupported)
                              ? saoRenderer["PBR"]
                              : ((saoRenderer["texture"] && frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this.layerDrawState.colorTextureSupported)
                                 ? saoRenderer["texture"][(this.layerDrawState.textureSet && (typeof(this.layerDrawState.textureSet.alphaCutoff) === "number")) ? "alphaCutoff+" : "alphaCutoff-"]
                                 : saoRenderer["vertex"][((this.primitive === "points") || (this.primitive === "lines") || this._compiledPortions.surfaceHasNormals) ? "flat-" : "flat+"]));
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
        frameCtx.snapPickLayerNumber++;

        const renderer = isSnapInit ? this._renderers.snapInitRenderer : ((frameCtx.snapMode === "edge") ? this._renderers.snapEdgeRenderer : this._renderers.snapVertexRenderer);
        this.__drawPick(renderFlags, frameCtx, renderer);

        frameCtx.snapPickLayerParams[frameCtx.snapPickLayerNumber] = {
            origin: frameCtx.snapPickOrigin.slice(),
            coordinateScale: safeInvVec3(frameCtx.snapPickCoordinateScale)
        };
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
