import {Map} from "../utils/Map.js";
const ids = new Map({});

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
    const fragDefAppenders = [ ];
    const attrSetters = [ ];
    const attrHahes = [ ];
    const unifSetters = [ ];
    const createVertexDefinition = (name, appendDefinition) => {
        let needed = false;
        vertAppenders.push((src) => needed && appendDefinition(name, src));
        return {
            toString: () => {
                needed = true;
                return name;
            }
        };
    };
    const programVariables = {
            createAttribute: function(type, name) {
                let needed = false;
                vertAppenders.push((src) => needed && src.push(`in ${type} ${name};`));
                const ret = {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
                attrSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    setValue && attrHahes.push(setValue.attributeHash);
                    ret.setInputValue = setValue;
                    return null;
                });
                return ret;
            },
            createFragmentDefinition: (name, appendDefinition) => {
                let needed = false;
                fragDefAppenders.push((src) => needed && appendDefinition(name, src));
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
                const ret = {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
                unifSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    if (valueSetter) {
                        return setValue && ((state) => valueSetter(setValue, state));
                    } else {
                        ret.setInputValue = setValue;
                        return null;
                    }
                });
                return ret;
            },
            createUniformArray: (type, name, length) => {
                let needed = false;
                const append = (src) => needed && src.push(`uniform ${type} ${name}[${length}];`);
                vertAppenders.push(append);
                fragAppenders.push(append);
                const ret = {
                    toString: () => {
                        needed = true;
                        return name;
                    }
                };
                unifSetters.push((getInputSetter) => {
                    ret.setInputValue = needed && getInputSetter(name);
                    return null;
                });
                return ret;
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
                const ret = { };
                keys.forEach(k => ret[k] = {
                    toString: () => {
                        needed = true;
                        return k;
                    }
                });
                unifSetters.push((getInputSetter) => {
                    const setValue = needed && getInputSetter(name);
                    if (valueSetter) {
                        return setValue && ((state) => valueSetter(setValue, state));
                    } else {
                        ret.setInputValue = setValue;
                        return null;
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
        createVertexDefinition: createVertexDefinition,
        commonLibrary: {
            octDecode: createVertexDefinition(
                "octDecode",
                (name, src) => {
                    src.push(`vec3 ${name}(vec2 oct) {`);
                    src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                    src.push("    if (v.z < 0.0) {");
                    src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                    src.push("    }");
                    src.push("    return normalize(v);");
                    src.push("}");
                })
        }
    };
    return {
        programVariables: programVariables,
        buildProgram: (gl, programName, cfg) => {
            const getLogDepth = cfg.getLogDepth;

            const clipPos = cfg.clipPos;
            const clipTransformSetup = cfg.usePickClipPos && (function() {
                const pickClipPos    = programVariables.createUniform("vec2", "pickClipPos");
                const pickClipPosInv = programVariables.createUniform("vec2", "pickClipPosInv");
                return {
                    setClipPosInputValue: frameCtx => {
                        pickClipPos.setInputValue(frameCtx.pickClipPos);
                        pickClipPosInv.setInputValue(frameCtx.pickClipPosInv);
                    },
                    transformedClipPos: () => `vec4((${clipPos}.xy / ${clipPos}.w - ${pickClipPos}) * ${pickClipPosInv} * ${clipPos}.w, ${clipPos}.zw)`
                };
            })();

            const vertexClipPosition = clipTransformSetup ? clipTransformSetup.transformedClipPos() : clipPos;

            const fragmentOutputs = [ ];
            const isPerspective = programVariables.createVarying("float", "isPerspective", () => `(${cfg.projMatrix}[2][3] == -1.0) ? 1.0 : 0.0`);
            const logDepthBufFC = programVariables.createUniform("float", "logDepthBufFC", (set, state) => set(2.0 / (Math.log(state.view.far + 1.0) / Math.LN2)));
            const vFragDepth    = programVariables.createVarying("float", "vFragDepth",    () => "1.0 + clipPos.w");
            if (getLogDepth) {
                fragmentOutputs.push(`gl_FragDepth = ${cfg.testPerspectiveForGl_FragDepth ? `${isPerspective} == 0.0 ? gl_FragCoord.z : ` : ""}log2(${getLogDepth(vFragDepth)}) * ${logDepthBufFC} * 0.5;`);
            } else if (cfg.cleanerEdges) {
                fragmentOutputs.push(`gl_FragDepth = gl_FragCoord.z + length(vec2(dFdx(gl_FragCoord.z), dFdy(gl_FragCoord.z)));`);
            }

            const linearToGamma = programVariables.createFragmentDefinition(
                "linearToGamma",
                (name, src) => {
                    src.push(`vec4 ${name}(in vec4 value, in float gammaFactor) {`);
                    src.push("  return vec4(pow(value.xyz, vec3(1.0 / gammaFactor)), value.w);");
                    src.push("}");
                });

            const sectionPlanesState = cfg.sectionPlanesState;
            const getClippingDistance = sectionPlanesState && (function() {
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
                        pos: sectionPlaneUniform("vec3", "Pos",    (set, active, plane, orig) => {
                            return active && set(orig
                                                 ? math.mulVec3Scalar(math.normalizeVec3(plane.dir, tempVec3a), -(math.dotVec3(plane.dir, orig) + plane.dist), tempVec3a) // getPlaneRTCPos
                                                 : plane.pos);
                        })
                    };
                });
                return (allocatedUniforms.length > 0) && ((worldPosition) => allocatedUniforms.map(a => `(${a.act} ? clamp(dot(-${a.dir}, ${worldPosition} - ${a.pos}), 0.0, 1000.0) : 0.0)`).join(" + "));
            })();

            const crossSections = cfg.crossSections;
            const sliceColorOr = (getClippingDistance
                                  ? (function() {
                                      const sliceColor = programVariables.createUniform("vec4", "sliceColor", (set) => set(crossSections.sliceColor));
                                      const sliceColorOr = color => {
                                          sliceColorOr.needed = true;
                                          return `(sliced ? ${sliceColor} : ${color})`;
                                      };
                                      return sliceColorOr;
                                  })()
                                  : (color => color));

            const getGammaFactor = cfg.getGammaFactor;
            const gammaFactor = programVariables.createUniform("float", "gammaFactor", (set) => set(getGammaFactor()));
            cfg.appendFragmentOutputs(fragmentOutputs, getGammaFactor && ((color) => `${linearToGamma}(${color}, ${gammaFactor})`), "gl_FragCoord", sliceColorOr);

            const fragmentClippingLines = (function() {
                const src = [ ];
                const sliceThickness = programVariables.createUniform("float", "sliceThickness", (set) => set(crossSections.sliceThickness));

                if (getClippingDistance) {
                    if (sliceColorOr.needed) {
                        src.push("  bool sliced = false;");
                    }
                    src.push(`  if (${cfg.clippableTest()}) {`);
                    const fragWorldPosition = programVariables.createVarying("highp vec3", "vHighpWorldPosition", () => `${cfg.worldPositionAttribute}.xyz`);
                    src.push(`    float dist = ${getClippingDistance(fragWorldPosition)};`);
                    if (cfg.clippingCaps) {
                        const vClipPositionW = programVariables.createVarying("float", "vClipPositionW", () => "gl_Position.w");
                        src.push(`    if (dist > (0.002 * ${vClipPositionW})) { discard; }`);
                        src.push("    if (dist > 0.0) { ");
                        src.push(`      ${cfg.clippingCaps} = vec4(1.0, 0.0, 0.0, 1.0);`);
                        getLogDepth && src.push(`      gl_FragDepth = log2(${getLogDepth(vFragDepth)}) * ${logDepthBufFC} * 0.5;`);
                        src.push("      return;");
                        src.push("    }");
                    } else {
                        src.push(`    if (dist > ${sliceColorOr.needed ? sliceThickness : "0.0"}) { discard; }`);
                    }
                    if (sliceColorOr.needed) {
                        src.push("    sliced = dist > 0.0;");
                    }
                    src.push("  }");
                }

                return src;
            })();

            const fragDefinitions = (function() { const src = [ ]; fragDefAppenders.forEach(a => a(src)); return src; })();
            const fragmentShader = [
                ...(function() { const src = [ ]; fragAppenders.forEach(a => a(src)); return src; })(),
                ...fragDefinitions,
                "void main(void) {",
                ...(cfg.discardPoints
                    ? [
                        "  vec2 cxy = 2.0 * gl_PointCoord - 1.0;",
                        "  if (dot(cxy, cxy) > 1.0) { discard; }"
                    ]
                    : [ ]),
                ...fragmentClippingLines,
                ...fragmentOutputs,
                "}"
            ];

            const vertexOutputs = [
                `gl_Position = ${vertexClipPosition};`,
                ...(cfg.getPointSize ? [ `gl_PointSize = ${cfg.getPointSize()};` ] : [ ]),
                ...(function() { const src = [ ]; vOutAppenders.forEach(a => a(src)); return src; })()
            ];

            const vertexData = cfg.getVertexData ? cfg.getVertexData() : [ ];

            const vertexShader = [
                ...(function() { const src = [ ]; vertAppenders.forEach(a => a(src)); return src; })(),
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

            const vertSrc = preamble("vertex"  ).concat(vertexShader);
            const fragSrc = preamble("fragment").concat([
                // Not the best place to define here, TODO: Move somewhere more appropriate after refactors
                "vec4 sRGBToLinear(in vec4 value) {",
                "  return vec4(mix(pow(value.rgb * 0.9478672986 + 0.0521327014, vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);",
                "}"
            ]).concat(fragmentShader);

            const makeShader = (type, srcLines) => {
                const src = srcLines.join("\n");
                const shader = gl.createShader(type);
                gl.shaderSource(shader, src);
                gl.compileShader(shader);
                if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    return [ shader ];
                } else {
                    return [ null,
                             [
                                 "Failed to compile",
                                 gl.getShaderInfoLog(shader),
                                 src.split("\n").map((line, i) => (i + 1) + ": " + line + "\n").join("")
                             ]
                           ];
                }
            };

            const [vertShader, vertErrors] = makeShader(gl.VERTEX_SHADER,   vertSrc);
            const [fragShader, fragErrors] = makeShader(gl.FRAGMENT_SHADER, fragSrc);

            const errorObj = errors => {
                console.error(errors.join("\n"));
                return [ null, errors ];
            };

            if (vertErrors) {
                return errorObj(["Vertex shader error"].concat(vertErrors));
            } else if (fragErrors) {
                return errorObj(["Fragment shader error"].concat(fragErrors));
            } else {
                const program = gl.createProgram();
                if (! program) {
                    return errorObj(["Failed to allocate program"]);
                } else {
                    gl.attachShader(program, vertShader);
                    gl.attachShader(program, fragShader);
                    gl.linkProgram(program);
                    // HACK: Disable validation temporarily
                    // Perhaps we should defer validation until render-time, when the program has values set for all inputs?
                    if (! gl.getProgramParameter(program, gl.LINK_STATUS)) {
                        return errorObj([
                            "",
                            gl.getProgramInfoLog(this.program),
                            "",
                            "Vertex shader:",
                            "",
                            ...vertSrc,
                            "",
                            "Fragment shader:",
                            "",
                            ...fragSrc
                        ]);
                    } else {
                        const getInputSetter = makeInputSetters(gl, program);
                        attrSetters.forEach(i => i(getInputSetter));
                        const uSetters = unifSetters.map(i => i(getInputSetter)).filter(s => s);
                        const id = ids.addItem({});
                        return [ {
                            id: id,
                            bind: () => gl.useProgram(program),
                            inputSetters: {
                                attributesHash: attrHahes.sort().join(", "),
                                setUniforms:   (frameCtx, state) => {
                                    clipTransformSetup && clipTransformSetup.setClipPosInputValue(frameCtx);
                                    uSetters.forEach(s => s(state));
                                }
                            },
                            destroy: () => {
                                ids.removeItem(id);
                                gl.deleteProgram(program);
                                gl.deleteShader(vertShader);
                                gl.deleteShader(fragShader);
                            }
                        } ];
                    }
                }
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
            shadowMap:        programVariables.createUniform("sampler2D", `shadowMap${i}`, (set) => set(lights[i].getShadowRenderBuf().colorTextures[0]))
        };

        const withViewLightDir = getDirection => {
            return {
                glslLight: {
                    isViewSpace: light.space === "view",
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

export const setupTexture = (programVariables, type, name, encoding, getTexture) => {
    const map = programVariables.createUniform(type, name + "Map", getTexture);
    return (texturePos, bias) => {
        const texel = (bias
                       ? `texture(${map}, ${texturePos}, ${bias})`
                       : `texture(${map}, ${texturePos})`);
        return (encoding !== LinearEncoding) ? `${TEXTURE_DECODE_FUNCS[encoding]}(${texel})` : texel;
    };
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
        if (uName.endsWith("[0]")) {
            uName = uName.substr(0, uName.length - 3);
        }
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
                } else if (u.size > 1) {
                    switch (u.type) {
                    case gl.FLOAT:      return value => gl.uniform1fv(location, value);
                    case gl.FLOAT_VEC2: return value => gl.uniform2fv(location, value);
                    case gl.FLOAT_VEC3: return value => gl.uniform3fv(location, value);
                    case gl.FLOAT_VEC4: return value => gl.uniform4fv(location, value);
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
