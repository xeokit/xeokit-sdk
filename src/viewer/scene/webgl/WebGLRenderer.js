import {getPlaneRTCPos} from "../math/rtcCoords.js";
import {Program} from "./Program.js";
import {math} from "../math/math.js";
const tempVec3a = math.vec3();
const tempVec4 = math.vec4();

import {LinearEncoding, sRGBEncoding} from "../constants/constants.js";
const TEXTURE_DECODE_FUNCS = { [sRGBEncoding]: "sRGBToLinear" };

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

export const createProgramVariablesState = function() {
    const vertAppenders = [ ];
    const vOutAppenders = [ ];
    const fragAppenders = [ ];
    const attrSetters = [ ];
    const unifSetters = [ ];
    return {
        programVariables: {
            createAttribute: function(type, name, valueSetter) {
                let needed = false;
                vertAppenders.push((src) => needed && src.push(`in ${type} ${name};`));
                attrSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    if (setValue) {
                        const setter = (state) => valueSetter(setValue, state);
                        setter.attributeHash = setValue.attributeHash;
                        return setter;
                    } else {
                        return null;
                    }
                });
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            },
            createFragmentDefinition: (name, appendDefinition) => {
                let needed = false;
                fragAppenders.push((src) => needed && appendDefinition(name, src));
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            },
            createOutput: (type, name, location) => {
                let needed = false;
                fragAppenders.push((src) => needed && src.push(`layout(location = ${location || 0}) out ${type} ${name};`));
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            },
            createUniform: (type, name, valueSetter) => {
                let needed = false;
                const append = (src) => needed && src.push(`uniform ${type} ${name};`);
                vertAppenders.push(append);
                fragAppenders.push(append);
                unifSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    return setValue && ((state) => valueSetter(setValue, state));
                });
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            },
            createUniformBlock: (name, types, valueSetter) => {
                let needed = false;
                const keys = Object.keys(types);
                const append = (src) => {
                    if (needed) {
                        src.push(`uniform ${name} {`);
                        keys.forEach(k => src.push(`    ${types[k]} ${k};`));
                        src.push(`};`);
                    }
                };
                vertAppenders.push(append);
                fragAppenders.push(append);
                unifSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    return setValue && ((state) => valueSetter(setValue, state));
                });
                const ret = { };
                keys.forEach(k => ret[k] = {
                    toString: () => {
                        needed = true;
                        return k;
                    }
                });
                return ret;
            },
            createVarying: (type, name, genValueCode, interpolationQualifier) => {
                let needed = false;
                const intp = interpolationQualifier ? (interpolationQualifier + " ") : "";
                vertAppenders.push((src) => needed && src.push(`${intp}out ${type} ${name};`));
                vOutAppenders.push((src) => needed && src.push(`${name} = ${genValueCode()};`));
                fragAppenders.push((src) => needed && src.push(`${intp}in  ${type} ${name};`));
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            },
            createVertexDefinition: (name, appendDefinition) => {
                let needed = false;
                vertAppenders.push((src) => needed && appendDefinition(name, src));
                return {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
            }
        },
        getFragmentDefinitions: () => { const src = [ ]; fragAppenders.forEach(a => a(src)); return src; },
        buildProgram: (gl, programName, cfg) => {
            const vertexOutputs = [
                `vec4 clipPos = ${cfg.projMatrix} * viewPosition;`,
                `gl_Position = ${cfg.transformClipPos ? cfg.transformClipPos("clipPos") : "clipPos"};`,
                ...(cfg.getPointSize ? [ `gl_PointSize = ${cfg.getPointSize()};` ] : [ ])
            ];
            vOutAppenders.forEach(a => a(vertexOutputs));

            const vertexData = cfg.getVertexData();

            const vertexDefs = [ ];
            vertAppenders.forEach(a => a(vertexDefs));
            const vertexShader = [
                ...vertexDefs,
                "void main(void) {",
                ...vertexData,
                ...vertexOutputs,
                "}"
            ];

            const preamble = (type) => [
                "#version 300 es",
                "// " + programName + " " + type + " shader",
                "#ifdef GL_FRAGMENT_PRECISION_HIGH",
                "precision highp float;",
                "precision highp int;",
                "precision highp usampler2D;",
                "precision highp isampler2D;",
                "precision highp sampler2D;",
                "#else",
                "precision mediump float;",
                "precision mediump int;",
                "precision mediump usampler2D;",
                "precision mediump isampler2D;",
                "precision mediump sampler2D;",
                "#endif",
            ];

            const program = new Program(gl, {
                vertex:   preamble("vertex"  ).concat(vertexShader),
                fragment: preamble("fragment").concat([
                    // Not the best place to define here, TODO: Move somewhere more appropriate after refactors
                    "vec4 sRGBToLinear(in vec4 value) {",
                    "  return vec4(mix(pow(value.rgb * 0.9478672986 + 0.0521327014, vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);",
                    "}"
                ]).concat(cfg.fragmentShader)
            });

            if (program.errors) {
                return [ null, program.errors ];
            } else {
                const getInputSetter = makeInputSetters(gl, program.handle);
                const aSetters = attrSetters.map(i => i(getInputSetter)).filter(s => s);
                const uSetters = unifSetters.map(i => i(getInputSetter)).filter(s => s);
                return [ {
                    bind: () => program.bind(),
                    destroy: () => program.destroy(),
                    id: program.id,
                    inputSetters: {
                        attributesHash: aSetters.map(a => a.attributeHash).filter(h => h).sort().join(", "),
                        setAttributes: (state) => aSetters.forEach(s => s(state)),
                        setUniforms:   (state) => uSetters.forEach(s => s(state))
                    }
                } ];
            }
        }
    };
};

export const createLightSetup = function(programVariables, lightsState) {
    const lightAmbient = programVariables.createUniform("vec4", "lightAmbient", (set) => set(lightsState.getAmbientColorAndIntensity()));

    const lights = lightsState.lights;
    const directionals = lights.map((light, i) => {
        const lightUniforms = {
            color: programVariables.createUniform("vec4", `lightColor${i}`, (set) => {
                const light = lights[i]; // in case it changed
                tempVec4[0] = light.color[0];
                tempVec4[1] = light.color[1];
                tempVec4[2] = light.color[2];
                tempVec4[3] = light.intensity;
                set(tempVec4);
            }),
            position:  programVariables.createUniform("vec3", `lightPos${i}`, (set) => set(lights[i].pos)),
            direction: programVariables.createUniform("vec3", `lightDir${i}`, (set) => set(lights[i].dir)),

            shadowProjMatrix: programVariables.createUniform("mat4", `shadowProjMatrix${i}`, (set) => set(lights[i].getShadowViewMatrix())),
            shadowViewMatrix: programVariables.createUniform("mat4", `shadowViewMatrix${i}`, (set) => set(lights[i].getShadowViewMatrix())),
            shadowMap:        programVariables.createUniform("sampler2D", `shadowMap${i}`, (set) => {
                const shadowRenderBuf = lights[i].getShadowRenderBuf();
                set(shadowRenderBuf && shadowRenderBuf.getTexture());
            })
        };

        const withViewLightDir = getDirection => {
            return {
                glslLight: {
                    isWorldSpace: light.space === "world",
                    getColor: () => `${lightUniforms.color}.rgb * ${lightUniforms.color}.a`,
                    getDirection: (viewMatrix, viewPosition) => `normalize(${getDirection(viewMatrix, viewPosition)})`,
                    shadowParameters: light.castsShadow && {
                        getShadowProjMatrix: () => lightUniforms.shadowProjMatrix,
                        getShadowViewMatrix: () => lightUniforms.shadowViewMatrix,
                        getShadowMap:        () => lightUniforms.shadowMap
                    }
                },
                setupLightsInputs: () => {
                    const setters = Object.values(lightUniforms).map(u => u.setupLightsInputs()).filter(v => v);
                    return () => setters.forEach(setState => setState());
                }
            };
        };

        if (light.type === "dir") {
            if (light.space === "view") {
                return withViewLightDir((viewMatrix, viewPosition) => `-${lightUniforms.direction}`);
            } else {
                // If normal mapping, the fragment->light vector will be in tangent space
                return withViewLightDir((viewMatrix, viewPosition) => `-(${viewMatrix} * vec4(${lightUniforms.direction}, 0.0)).xyz`);
            }
        } else if (light.type === "point") {
            if (light.space === "view") {
                return withViewLightDir((viewMatrix, viewPosition) => `${lightUniforms.position} - ${viewPosition}`);
            } else {
                // If normal mapping, the fragment->light vector will be in tangent space
                return withViewLightDir((viewMatrix, viewPosition) => `(${viewMatrix} * vec4(${lightUniforms.position}, 1.0)).xyz - ${viewPosition}`);
            }
        } else {
            return null;
        }
    }).filter(v => v);

    const setupCubeTexture = (name, getMaps) => {
        const getValue = () => { const m = getMaps(); return (m.length > 0) && m[0]; };
        const initMap = getValue();
        return initMap && setupTexture(programVariables, "samplerCube", name, initMap.encoding, (set) => { const v = getValue(); v && set(v.texture); });
    };

    const lightMap      = setupCubeTexture("light",      () => lightsState.lightMaps);
    const reflectionMap = setupCubeTexture("reflection", () => lightsState.reflectionMaps);

    return {
        getHash: () => lightsState.getHash(),
        getAmbientColor: () => `${lightAmbient}.rgb * ${lightAmbient}.a`,
        directionalLights: directionals.map(light => light.glslLight),
        getIrradiance: lightMap      && ((worldNormal) => `${lightMap(worldNormal)}.rgb`),
        getReflection: reflectionMap && ((reflectVec, mipLevel) => `${reflectionMap(reflectVec, mipLevel)}.rgb`)
    };
};

export const createSectionPlanesSetup = function(programVariables, sectionPlanesState) {
    const allocatedUniforms = iota(sectionPlanesState.getNumAllocatedSectionPlanes()).map(i => {
        const sectionPlaneUniform = (type, postfix, getValue) => {
            return programVariables.createUniform(type, `sectionPlane${postfix}${i}`, (set, state) => {
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                const numSectionPlanes = sectionPlanes.length;
                const baseIndex = (state.mesh.layerIndex || 0) * numSectionPlanes;
                const active = (i < numSectionPlanes) && state.mesh.renderFlags.sectionPlanesActivePerLayer[baseIndex + i];
                return getValue(set, active, sectionPlanes[i], state.mesh.origin);
            });
        };
        return {
            act: sectionPlaneUniform("bool", "Active", (set, active) => set(active ? 1 : 0)),
            dir: sectionPlaneUniform("vec3", "Dir",    (set, active, plane) => active && set(plane.dir)),
            pos: sectionPlaneUniform("vec3", "Pos",    (set, active, plane, orig) => active && set(orig
                                                                                                   ? getPlaneRTCPos(plane.dist, plane.dir, orig, tempVec3a)
                                                                                                   : plane.pos))
        };
    });
    return (allocatedUniforms.length > 0) && {
        getDistance: (worldPosition) => allocatedUniforms.map(a => `(${a.act} ? clamp(dot(-${a.dir}, ${worldPosition} - ${a.pos}), 0.0, 1000.0) : 0.0)`).join(" + ")
    };
};

export const setupTexture = (programVariables, type, name, encoding, getTexture, getMatrix) => {
    const map    = programVariables.createUniform(type, name + "Map", getTexture);
    const matrix = getMatrix && programVariables.createUniform("mat4", name + "MapMatrix", getMatrix);
    const swizzle = (type === "samplerCube") ? "xyz" : "xy";
    const getTexCoordExpression = texPos => (matrix ? `(${matrix} * ${texPos}).${swizzle}` : `${texPos}.${swizzle}`);

    const sample = (texturePos, bias) => {
        const texel = (bias
                       ? `texture(${map}, ${getTexCoordExpression(texturePos)}, ${bias})`
                       : `texture(${map}, ${getTexCoordExpression(texturePos)})`);
        return (encoding !== LinearEncoding) ? `${TEXTURE_DECODE_FUNCS[encoding]}(${texel})` : texel;
    };
    sample.getTexCoordExpression = getTexCoordExpression;
    sample.texelFetch = (P, lod) => `texelFetch(${map}, ${P}, ${lod})`;
    return sample;
};

const makeInputSetters = function(gl, handle) {
    const activeInputs = { };

    const numAttributes = gl.getProgramParameter(handle, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < numAttributes; ++i) {
        const attribute = gl.getActiveAttrib(handle, i);
        const location = gl.getAttribLocation(handle, attribute.name);
        activeInputs[attribute.name] = function(arrayBuf) {
            arrayBuf.bindAtLocation(location);
            gl.enableVertexAttribArray(location);
            const divisor = arrayBuf.attributeDivisor;
            if (divisor) {
                gl.vertexAttribDivisor(location, divisor);
            }
        };
        activeInputs[attribute.name].attributeHash = `${location.toString().padStart(1+Math.floor(Math.log10(numAttributes)), "0")}:${attribute.name}`;
    }

    const numBlocks = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORM_BLOCKS);
    for (let i = 0; i < numBlocks; ++i) {
        const blockName = gl.getActiveUniformBlockName(handle, i);
        const uniformBlockIndex = gl.getUniformBlockIndex(handle, blockName);
        const uniformBlockBinding = i;
        gl.uniformBlockBinding(handle, uniformBlockIndex, uniformBlockBinding);
        const buffer = gl.createBuffer();
        activeInputs[blockName] = function(data) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
            gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
            gl.bindBufferBase(gl.UNIFORM_BUFFER, uniformBlockBinding, buffer);
        };
    }

    const numUniforms = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS);
    let nextUnit = 0;
    for (let i = 0; i < numUniforms; ++i) {
        const u = gl.getActiveUniform(handle, i);
        let uName = u.name;
        if (uName[uName.length - 1] === "\u0000") {
            uName = uName.substr(0, uName.length - 1);
        }
        const location = gl.getUniformLocation(handle, uName);
        const type = (function() {
            for (let k in gl) {
                if (u.type === gl[k])
                    return k;
            }
            return null;
        })();

        if ((u.type === gl.SAMPLER_2D)
            ||
            (u.type === gl.SAMPLER_CUBE)
            ||
            (u.type === gl.SAMPLER_2D_SHADOW)
            ||
            ((gl instanceof window.WebGL2RenderingContext)
             &&
             ((u.type === gl.UNSIGNED_INT_SAMPLER_2D)
              ||
              (u.type === gl.INT_SAMPLER_2D)))) {
            const unit = nextUnit++;
            activeInputs[uName] = function(texture) {
                const bound = texture.bind(unit);
                if (bound) {
                    gl.uniform1i(location, unit);
                }
                return bound;
            };
        } else {
            activeInputs[uName] = (function() {
                if (u.size === 1) {
                    switch (u.type) {
                    case gl.BOOL:       return value => gl.uniform1i(location, value);
                    case gl.INT:        return value => gl.uniform1i(location, value);
                    case gl.FLOAT:      return value => gl.uniform1f(location, value);
                    case gl.FLOAT_VEC2: return value => gl.uniform2fv(location, value);
                    case gl.FLOAT_VEC3: return value => gl.uniform3fv(location, value);
                    case gl.FLOAT_VEC4: return value => gl.uniform4fv(location, value);
                    case gl.FLOAT_MAT3: return value => gl.uniformMatrix3fv(location, false, value);
                    case gl.FLOAT_MAT4: return value => gl.uniformMatrix4fv(location, false, value);
                    }
                }
                throw `Unhandled uniform ${uName}`;
            })();
        }
    }

    return function(name) {
        const u = activeInputs[name];
        if (! u) {
            throw `Missing input "${name}"`;
        }
        return u;
    };
};
