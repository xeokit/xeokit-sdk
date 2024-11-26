import {getPlaneRTCPos, math} from "../../math/index.js";
import {LinearEncoding, sRGBEncoding} from "../../constants/constants.js";
import {WEBGL_INFO} from "../../webglInfo.js";

const tempVec3 = math.vec3();
const tempVec4 = math.vec4();

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

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

export const createSAOSetup = (gl, scene) => {
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

            return function(frameCtx, textureUnit = undefined) {
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
