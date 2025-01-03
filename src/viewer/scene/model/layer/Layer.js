import {math} from "../../math/index.js";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {LinearEncoding, sRGBEncoding} from "../../constants/constants.js";
import {WEBGL_INFO} from "../../webglInfo.js";

import {LayerRenderer} from "./LayerRenderer.js";

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

export const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

const createLightSetup = function(lightsState, useMaps) {
    const TEXTURE_DECODE_FUNCS = {
        [LinearEncoding]: value => value,
        [sRGBEncoding]:   value => `sRGBToLinear(${value})`
    };

    const lights = lightsState.lights;
    const lightMap      = useMaps && (lightsState.lightMaps.length      > 0) && lightsState.lightMaps[0];
    const reflectionMap = useMaps && (lightsState.reflectionMaps.length > 0) && lightsState.reflectionMaps[0];

    return {
        getHash: () => lightsState.getHash(),
        appendDefinitions: (src) => {
            src.push("uniform vec4 lightAmbient;");
            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                if (light.type === "ambient") {
                    continue;
                }
                src.push("uniform vec4 lightColor" + i + ";");
                if (light.type === "dir") {
                    src.push("uniform vec3 lightDir" + i + ";");
                }
                if (light.type === "point") {
                    src.push("uniform vec3 lightPos" + i + ";");
                }
                if (light.type === "spot") {
                    src.push("uniform vec3 lightPos" + i + ";"); // not referenced
                    src.push("uniform vec3 lightDir" + i + ";");
                }
            }

            if (lightMap) {
                src.push("uniform samplerCube lightMap;");
            }
            if (reflectionMap) {
                src.push("uniform samplerCube reflectionMap;");
            }
            if (lightMap || reflectionMap) {
                src.push("vec4 sRGBToLinear(in vec4 value) {");
                src.push("  return vec4(mix(pow(value.rgb * 0.9478672986 + 0.0521327014, vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);");
                src.push("}");
            }
        },
        getAmbientColor: () => "lightAmbient.rgb * lightAmbient.a",
        getDirectionalLights: (viewMatrix, viewPosition) => {
            return lights.map((light, i) => {
                const withViewLightDir = direction => ({
                    color: `lightColor${i}.rgb * lightColor${i}.a`,
                    direction: `normalize(${direction})`
                });
                if ((light.type === "dir") || (light.type === "spot")) {
                    if (light.space === "view") {
                        return withViewLightDir(`lightDir${i}`);
                    } else {
                        return withViewLightDir(`(${viewMatrix} * vec4(lightDir${i}, 0.0)).xyz`);
                    }
                } else if (light.type === "point") {
                    if (light.space === "view") {
                        return withViewLightDir(`${viewPosition}.xyz - lightPos${i}`);
                    } else {
                        return withViewLightDir(`(${viewMatrix} * vec4(-lightPos${i}, 0.0)).xyz`);
                    }
                } else {        // "ambient"
                    return null;
                }
            }).filter(v => v);
        },
        getIrradiance: useMaps && lightMap && ((worldNormal) => {
            const decode = TEXTURE_DECODE_FUNCS[lightMap.encoding];
            return `${decode(`texture(lightMap, ${worldNormal})`)}.rgb`;
        }),
        getReflectionRadiance: useMaps && reflectionMap && ((specularRoughness, reflectVec) => {
            const maxMIPLevel = "8.0";
            const blinnExpFromRoughness = `(2.0 / pow(${specularRoughness} + 0.0001, 2.0) - 2.0)`;
            const desiredMIPLevel = `${maxMIPLevel} - 0.79248 - 0.5 * log2(pow(${blinnExpFromRoughness}, 2.0) + 1.0)`;
            const specularMIPLevel = `clamp(${desiredMIPLevel}, 0.0, ${maxMIPLevel})`;
            const decode = TEXTURE_DECODE_FUNCS[reflectionMap.encoding];
            return `${decode(`texture(reflectionMap, ${reflectVec}, 0.5 * ${specularMIPLevel})`)}.rgb`; //TODO: a random factor - fix this
        }),
        setupInputs: (getUniformSetter) => {
            const uLightAmbient = getUniformSetter("lightAmbient");
            const uLightColor = [];
            const uLightDir = [];
            const uLightPos = [];

            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                switch (light.type) {
                case "dir":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = null;
                    uLightDir[i] = getUniformSetter("lightDir" + i);
                    break;
                case "point":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = getUniformSetter("lightPos" + i);
                    uLightDir[i] = null;
                    break;
                case "spot":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = getUniformSetter("lightPos" + i);
                    uLightDir[i] = getUniformSetter("lightDir" + i);
                    break;
                }
            }

            const uLightMap      = useMaps && lightMap      && getUniformSetter("lightMap");
            const uReflectionMap = useMaps && reflectionMap && getUniformSetter("reflectionMap");

            return function(frameCtx) {
                uLightAmbient(lightsState.getAmbientColorAndIntensity());

                for (let i = 0, len = lights.length; i < len; i++) {
                    const light = lights[i];
                    if (uLightColor[i]) {
                        tempVec4[0] = light.color[0];
                        tempVec4[1] = light.color[1];
                        tempVec4[2] = light.color[2];
                        tempVec4[3] = light.intensity;
                        uLightColor[i](tempVec4);
                    }
                    if (uLightPos[i]) {
                        uLightPos[i](light.pos);
                    }
                    if (uLightDir[i]) {
                        uLightDir[i](light.dir);
                    }
                }

                const setSampler = (sampler, texture) => {
                    if (sampler && texture.texture) {
                        sampler(texture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
                        frameCtx.bindTexture++;
                    }
                };

                setSampler(uLightMap,      lightMap);
                setSampler(uReflectionMap, reflectionMap);
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

            const createRenderer = (programSetup, subGeometry) => {
                return new LayerRenderer(
                    scene,
                    primitive,
                    programSetup,
                    subGeometry,
                    makeRenderingAttributes(subGeometry));
            };

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

            const makeColorProgram = (lights, sao) => ColorProgram(scene.logarithmicDepthBufferEnabled, lights, sao, primitive);

            const makePickDepthProgram   = (isPoints) => PickDepthProgram(scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickMeshProgram    = (isPoints) => PickMeshProgram(scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 1), isPoints);
            const makePickNormalsProgram = (isFlat)   => PickNormalsProgram(scene.logarithmicDepthBufferEnabled, createPickClipTransformSetup(gl, 3), isFlat);

            const makeSnapProgram = (isSnapInit, isPoints) => SnapProgram(isSnapInit, isPoints);

            if (primitive === "points") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": { "flat-": lazy((c) => c(makeColorProgram(null, null))) } } },
                    occlusionRenderer:  lazy((c) => c(OcclusionProgram(scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:  lazy((c) => c(makePickDepthProgram(true))),
                    pickMeshRenderer:   lazy((c) => c(makePickMeshProgram(true))),
                    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
                    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
                    // drawShadow has been nop in VBO point layers
                    // shadowRenderer:     instancing && lazy((c) => c(ShadowProgram(scene.logarithmicDepthBufferEnabled))),
                    silhouetteRenderer: lazy((c) => c(SilhouetteProgram(scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((c) => c(makeSnapProgram(true,  true))),
                    snapVertexRenderer: lazy((c) => c(makeSnapProgram(false, true), { vertices: true }))
                };
            } else if (primitive === "lines") {
                cache[sceneId] = {
                    colorRenderers:     { "sao-": { "vertex": { "flat-": lazy((c) => c(makeColorProgram(null, null))) } } },
                    silhouetteRenderer: lazy((c) => c(SilhouetteProgram(scene.logarithmicDepthBufferEnabled, true))),
                    snapInitRenderer:   lazy((c) => c(makeSnapProgram(true,  false))),
                    snapEdgeRenderer:   lazy((c) => c(makeSnapProgram(false, false), { vertices: false })),
                    snapVertexRenderer: lazy((c) => c(makeSnapProgram(false, false), { vertices: true }))
                };
            } else {
                cache[sceneId] = {
                    colorRenderers: (function() {
                        // WARNING: Changing `useMaps' to `true' for DTX might have unexpected consequences while binding textures, as the DTX texture binding mechanism doesn't rely on `frameCtx.textureUnit` the way VBO does (see setSAORenderState);
                        const lights = createLightSetup(scene._lightsState, false);
                        const saoRenderers = function(sao) {
                            const makeColorTextureProgram = (useAlphaCutoff) => ColorTextureProgram(scene, lights, sao, useAlphaCutoff, scene.gammaOutput); // If gammaOutput set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
                            return (isVBO
                                    ? {
                                        "PBR": lazy((c) => c(PBRProgram(scene, createLightSetup(scene._lightsState, true), sao))),
                                        "texture": {
                                            "alphaCutoff-": lazy((c) => c(makeColorTextureProgram(false))),
                                            "alphaCutoff+": lazy((c) => c(makeColorTextureProgram(true)))
                                        },
                                        "vertex": {
                                            "flat-": lazy((c) => c(makeColorProgram(lights, sao))),
                                            "flat+": lazy((c) => c(FlatColorProgram(scene.logarithmicDepthBufferEnabled, lights, sao)))
                                        }
                                    }
                                    : { "vertex": { "flat-": lazy((c) => c(makeColorProgram(lights, sao))) } });
                        };
                        return {
                            "sao-": saoRenderers(null),
                            "sao+": saoRenderers(createSAOSetup(gl, scene.sao, isVBO ? undefined : 10))
                        };
                    })(),
                    depthRenderer:           lazy((c) => c(DepthProgram(scene.logarithmicDepthBufferEnabled))),
                    edgesRenderers: {
                        uniform: lazy((c) => c(EdgesProgram(scene.logarithmicDepthBufferEnabled, true),  { vertices: false })),
                        vertex:  lazy((c) => c(EdgesProgram(scene.logarithmicDepthBufferEnabled, false), { vertices: false }))
                    },
                    occlusionRenderer:       lazy((c) => c(OcclusionProgram(scene.logarithmicDepthBufferEnabled))),
                    pickDepthRenderer:       eager((c) => c(makePickDepthProgram(false))),
                    pickMeshRenderer:        eager((c) => c(makePickMeshProgram(false))),
                    pickNormalsFlatRenderer: eager((c) => c(makePickNormalsProgram(true))),
                    pickNormalsRenderer:     isVBO && eager((c) => c(makePickNormalsProgram(false))),
                    shadowRenderer:          isVBO && lazy((c) => c(ShadowProgram(scene))),
                    silhouetteRenderer:      eager((c) => c(SilhouetteProgram(scene.logarithmicDepthBufferEnabled, false))),
                    snapInitRenderer:        eager((c) => c(makeSnapProgram(true,  false))),
                    snapEdgeRenderer:        eager((c) => c(makeSnapProgram(false, false), { vertices: false })),
                    snapVertexRenderer:      eager((c) => c(makeSnapProgram(false, false), { vertices: true }))
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

        // These counts are used to avoid unnecessary render passes
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numClippableLayerPortions = 0;
        this._numEdgesLayerPortions = 0;
        this._numPickableLayerPortions = 0;
        this._numCulledLayerPortions = 0;
    }

    finalize() {
        if (! this._compiledPortions) {
            this._compiledPortions = this.compilePortions();
            this.solid = this._compiledPortions.solid;
            this.sortId = this._compiledPortions.sortId;
            this.layerDrawState = this._compiledPortions.layerDrawState;
            this._renderers = this._compiledPortions.renderers;
            this._hasEdges = this._renderers.edgesRenderers;
            this._setFlags = this._compiledPortions.setFlags;

            this.setColor  = this._compiledPortions.setColor;
            this.setMatrix = this._compiledPortions.setMatrix;
            this.setOffset = this._compiledPortions.setOffset;

            this.getEachIndex = this._compiledPortions.getEachIndex;
            this.getEachVertex = this._compiledPortions.getEachVertex;
            this.precisionRayPickSurface = this._compiledPortions.precisionRayPickSurface;
        }
    }

    aabbChanged() { this._aabbDirty = true; }

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
            (this._numXRayedLayerPortions < this._portions.length)) {

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
        if (renderer && (this._numTransparentLayerPortions < this._portions.length) && (this._numXRayedLayerPortions < this._portions.length)) {
            this.__drawLayer(renderFlags, frameCtx, renderer, RENDER_PASSES.COLOR_OPAQUE);
        }
    }

    // ---------------------- SILHOUETTE RENDERING -----------------------------------

    __drawSilhouette(renderFlags, frameCtx, material, renderPass) {
        frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(material.fillColor, material.fillAlpha, tempVec4);
        this.__drawLayer(renderFlags, frameCtx, this._renderers.silhouetteRenderer, renderPass);
    }

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numXRayedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.xrayMaterial, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numHighlightedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.highlightMaterial, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numSelectedLayerPortions > 0) {
            this.__drawSilhouette(renderFlags, frameCtx, this.model.scene.selectedMaterial, RENDER_PASSES.SILHOUETTE_SELECTED);
        }
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    __drawVertexEdges(renderFlags, frameCtx, renderPass) {
        const renderer = this._renderers.edgesRenderers && this._renderers.edgesRenderers.vertex;
        if (renderer && (this._numEdgesLayerPortions > 0)) {
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
        if (this._numHighlightedLayerPortions > 0) {
            this.__drawUniformEdges(renderFlags, frameCtx, this.model.scene.highlightMaterial, RENDER_PASSES.EDGES_HIGHLIGHTED);
        }
    }

    drawEdgesSelected(renderFlags, frameCtx) {
        if (this._numSelectedLayerPortions > 0) {
            this.__drawUniformEdges(renderFlags, frameCtx, this.model.scene.selectedMaterial, RENDER_PASSES.EDGES_SELECTED);
        }
    }

    drawEdgesXRayed(renderFlags, frameCtx) {
        if (this._numXRayedLayerPortions > 0) {
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
        frameCtx.snapPickCoordinateScale = [
            math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT,
            math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT,
            math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT
        ];
        frameCtx.snapPickLayerNumber++;

        const renderer = isSnapInit ? this._renderers.snapInitRenderer : ((frameCtx.snapMode === "edge") ? this._renderers.snapEdgeRenderer : this._renderers.snapVertexRenderer);
        this.__drawPick(renderFlags, frameCtx, renderer);

        frameCtx.snapPickLayerParams[frameCtx.snapPickLayerNumber] = {
            origin: frameCtx.snapPickOrigin.slice(),
            coordinateScale: [
                math.safeInv(frameCtx.snapPickCoordinateScale[0]),
                math.safeInv(frameCtx.snapPickCoordinateScale[1]),
                math.safeInv(frameCtx.snapPickCoordinateScale[2])
            ]
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
        const deferred = (this.primitive !== "points");
        this._setFlags(portionId, flags, transparent, deferred);
        this._compiledPortions.setFlags2(portionId, flags, deferred);
    }

    flushInitFlags() {
        this._compiledPortions.setDeferredFlags();
    }

    setVisible(portionId, flags, transparent) {
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
        if (flags & ENTITY_FLAGS.CLIPPABLE) {
            this._numClippableLayerPortions++;
            this.model.numClippableLayerPortions++;
        } else {
            this._numClippableLayerPortions--;
            this.model.numClippableLayerPortions--;
        }
        this._compiledPortions.setClippableFlags(portionId, flags);
    }

    setCulled(portionId, flags, transparent) {
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
    }

    setPickable(portionId, flags, transparent) {
        if (flags & ENTITY_FLAGS.PICKABLE) {
            this._numPickableLayerPortions++;
            this.model.numPickableLayerPortions++;
        } else {
            this._numPickableLayerPortions--;
            this.model.numPickableLayerPortions--;
        }
        this._setFlags(portionId, flags, transparent);
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
