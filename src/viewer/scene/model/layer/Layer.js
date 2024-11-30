import {getPlaneRTCPos, math} from "../../math/index.js";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {LinearEncoding, sRGBEncoding} from "../../constants/constants.js";
import {RENDER_PASSES} from "../RENDER_PASSES.js";
import {WEBGL_INFO} from "../../webglInfo.js";

const tempVec3 = math.vec3();
const tempVec4 = math.vec4();

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

export const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

export const createClippingSetup = function(gl, sectionPlanesState) {
    const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();

    return (numAllocatedSectionPlanes > 0) && {
        getHash: () => sectionPlanesState.getHash(),
        appendDefinitions: (src) => {
            for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        },
        getDistance: (worldPosition) => {
            return iota(numAllocatedSectionPlanes).map(i => `(sectionPlaneActive${i} ? clamp(dot(-sectionPlaneDir${i}.xyz, ${worldPosition} - sectionPlanePos${i}.xyz), 0.0, 1000.0) : 0.0)`).join(" + ");
        },
        setupInputs: (program) => {
            const uSectionPlanes = iota(numAllocatedSectionPlanes).map(i => ({
                active: program.getLocation("sectionPlaneActive" + i),
                pos:    program.getLocation("sectionPlanePos" + i),
                dir:    program.getLocation("sectionPlaneDir" + i)
            }));
            return (layer) => {
                const origin = layer._state.origin;
                const model = layer.model;
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                const numSectionPlanes = sectionPlanes.length;
                const baseIndex = layer.layerIndex * numSectionPlanes;
                const renderFlags = model.renderFlags;
                for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                    const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
                    if (sectionPlaneUniforms) {
                        const active = (sectionPlaneIndex < numSectionPlanes) && renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                        gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                            gl.uniform3fv(sectionPlaneUniforms.pos,
                                          (origin
                                           ? getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3, model.matrix)
                                           : sectionPlane.pos));
                        }
                    }
                }
            };
        }
    };
};

export const createLightSetup = function(gl, lightsState, useMaps) {
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
        setupInputs: (program) => {
            const uLightAmbient = program.getLocation("lightAmbient");
            const uLightColor = [];
            const uLightDir = [];
            const uLightPos = [];
            const uLightAttenuation = [];

            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                switch (light.type) {
                case "dir":
                    uLightColor[i] = program.getLocation("lightColor" + i);
                    uLightPos[i] = null;
                    uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    uLightColor[i] = program.getLocation("lightColor" + i);
                    uLightPos[i] = program.getLocation("lightPos" + i);
                    uLightDir[i] = null;
                    uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    uLightColor[i] = program.getLocation("lightColor" + i);
                    uLightPos[i] = program.getLocation("lightPos" + i);
                    uLightDir[i] = program.getLocation("lightDir" + i);
                    uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                }
            }

            const uLightMap      = useMaps && lightMap      && program.getSampler("lightMap");
            const uReflectionMap = useMaps && reflectionMap && program.getSampler("reflectionMap");

            return function(frameCtx) {
                gl.uniform4fv(uLightAmbient, lightsState.getAmbientColorAndIntensity());

                for (let i = 0, len = lights.length; i < len; i++) {
                    const light = lights[i];
                    if (uLightColor[i]) {
                        gl.uniform4f(uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
                    }
                    if (uLightPos[i]) {
                        gl.uniform3fv(uLightPos[i], light.pos);
                        if (uLightAttenuation[i]) {
                            gl.uniform1f(uLightAttenuation[i], light.attenuation);
                        }
                    }
                    if (uLightDir[i]) {
                        gl.uniform3fv(uLightDir[i], light.dir);
                    }
                }

                const setSampler = (sampler, texture) => {
                    if (sampler && texture.texture) {
                        sampler.bindTexture(texture.texture, frameCtx.textureUnit);
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

export const createPickClipTransformSetup = function(gl, renderBufferSize) {
    return {
        appendDefinitions: (src) => {
            src.push("uniform vec2 pickClipPos;");
            src.push("uniform vec2 drawingBufferSize;");
        },
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / ${renderBufferSize.toFixed(1)} * ${clipPos}.w, ${clipPos}.zw)`,
        setupInputs: (program) => {
            const uPickClipPos = program.getLocation("pickClipPos");
            const uDrawingBufferSize = program.getLocation("drawingBufferSize");
            return function(frameCtx) {
                gl.uniform2fv(uPickClipPos, frameCtx.pickClipPos);
                gl.uniform2f(uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
            };
        }
    };
};

export const createSAOSetup = (gl, scene, textureUnit = undefined) => {
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
        setupInputs: (program) => {
            const uOcclusionTexture = program.getSampler("uOcclusionTexture");
            const uSAOParams        = program.getLocation("uSAOParams");

            return function(frameCtx) {
                const sao = scene.sao;
                if (sao.possible) {
                    const viewportWidth = gl.drawingBufferWidth;
                    const viewportHeight = gl.drawingBufferHeight;
                    tempVec4[0] = viewportWidth;
                    tempVec4[1] = viewportHeight;
                    tempVec4[2] = sao.blendCutoff;
                    tempVec4[3] = sao.blendFactor;
                    gl.uniform4fv(uSAOParams, tempVec4);
                    uOcclusionTexture.bindTexture(frameCtx.occlusionTexture, textureUnit ?? frameCtx.textureUnit);
                    if (textureUnit === undefined) {
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
                        frameCtx.bindTexture++;
                    }
                }
            };
        }
    };
};

export class Layer {

    constructor() {
        this._meshes = [];
        // The axis-aligned World-space boundary of this Layer's positions.
        this._aabb = math.collapseAABB3();
        this._aabbDirty = true;
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
            const renderer = ((saoRenderer["PBR"] && frameCtx.pbrEnabled && this.model.pbrEnabled && this._state.pbrSupported)
                              ? saoRenderer["PBR"]
                              : ((saoRenderer["texture"] && frameCtx.colorTextureEnabled && this.model.colorTextureEnabled && this._state.colorTextureSupported)
                                 ? saoRenderer["texture"][(this._state.textureSet && (typeof(this._state.textureSet.alphaCutoff) === "number")) ? "alphaCutoff+" : "alphaCutoff-"]
                                 : saoRenderer["vertex"][((this.primitive === "points") || (this.primitive === "lines") || this._surfaceHasNormals) ? "flat-" : "flat+"]));
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

    __drawSilhouette(renderFlags, frameCtx, renderPass) {
        this.__drawLayer(renderFlags, frameCtx, this._renderers.silhouetteRenderer, renderPass);
    }

    drawSilhouetteXRayed(renderFlags, frameCtx) {
        if (this._numXRayedLayerPortions > 0) {
            const mat = this.model.scene.xrayMaterial;
            frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(mat.fillColor, mat.fillAlpha, tempVec4);
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_XRAYED);
        }
    }

    drawSilhouetteHighlighted(renderFlags, frameCtx) {
        if (this._numHighlightedLayerPortions > 0) {
            const mat = this.model.scene.highlightMaterial;
            frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(mat.fillColor, mat.fillAlpha, tempVec4);
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_HIGHLIGHTED);
        }
    }

    drawSilhouetteSelected(renderFlags, frameCtx) {
        if (this._numSelectedLayerPortions > 0) {
            const mat = this.model.scene.selectedMaterial;
            frameCtx.programColor = this.__setVec4FromMaterialColorAlpha(mat.fillColor, mat.fillAlpha, tempVec4);
            this.__drawSilhouette(renderFlags, frameCtx, RENDER_PASSES.SILHOUETTE_SELECTED);
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
        if (this._edgesColorOpaqueAllowed()) {
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
        const deferred = (this.primitive !== "points") && (! this._instancing);
        this._setFlags(portionId, flags, transparent, deferred);
        this._setFlags2(portionId, flags, deferred);
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
        this._setClippableFlags(portionId, flags);
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

    _getColSilhEdgePickFlags(flags, transparent, dst) {

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

        dst[0] = colorFlag;
        dst[1] = silhouetteFlag;
        dst[2] = edgeFlag;
        dst[3] = pickFlag;
    }

}
