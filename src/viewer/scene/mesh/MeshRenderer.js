import {math} from "../math/math.js";
import {getPlaneRTCPos} from "../math/rtcCoords.js";
import {Program} from "../webgl/Program.js";
import {makeInputSetters} from "../webgl/WebGLRenderer.js";
import {LinearEncoding, sRGBEncoding} from "../constants/constants.js";

const TEXTURE_DECODE_FUNCS = {};
TEXTURE_DECODE_FUNCS[sRGBEncoding] = "sRGBToLinear";

const tempVec3a = math.vec3();
const tempVec4 = math.vec4();

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

export const instantiateMeshRenderer = (mesh, attributes, auxVariables, programSetup, programVariablesState) => {
    const programVariables = programVariablesState.programVariables;
    const decodedUv   = auxVariables.decodedUv;
    const worldNormal = auxVariables.worldNormal;
    const viewNormal  = auxVariables.viewNormal;
    const scene = mesh.scene;
    const meshStateBackground = mesh._state.background;
    const clipping = (function() {
        const sectionPlanesState = scene._sectionPlanesState;
        const allocatedUniforms = iota(sectionPlanesState.getNumAllocatedSectionPlanes()).map(i => {
            const sectionPlaneUniform = (type, postfix, getValue) => {
                return programVariables.createUniform(type, `sectionPlane${postfix}${i}`, (set, state) => {
                    const sectionPlanes = sectionPlanesState.sectionPlanes;
                    const active = (i < sectionPlanes.length) && state.mesh.renderFlags.sectionPlanesActivePerLayer[i];
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
    })();
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const geometryState = mesh._geometry._state;
    const quantizedGeometry = geometryState.compressGeometry;
    const isPoints = geometryState.primitiveName === "points";

    const gammaFactor           = programVariables.createUniform("float", "gammaFactor",           (set) => set(scene.gammaFactor));
    const pointSize             = programVariables.createUniform("float", "pointSize",             (set, state) => set(state.material.pointSize));
    const modelMatrix           = programVariables.createUniform("mat4",  "modelMatrix",           (set, state) => set(state.mesh.worldMatrix));
    const modelNormalMatrix     = programVariables.createUniform("mat4",  "modelNormalMatrix",     (set, state) => set(state.mesh.worldNormalMatrix));
    const offset                = programVariables.createUniform("vec3",  "offset",                (set, state) => set(state.mesh.offset));
    const scale                 = programVariables.createUniform("vec3",  "scale",                 (set, state) => set(state.mesh.scale));
    const clippable             = programVariables.createUniform("bool",  "clippable",             (set, state) => set(state.mesh.clippable));
    const positionsDecodeMatrix = programVariables.createUniform("mat4",  "positionsDecodeMatrix", (set, state) => set(state.mesh._geometry._state.positionsDecodeMatrix));
    const uvDecodeMatrix        = programVariables.createUniform("mat3",  "uvDecodeMatrix",        (set, state) => set(state.mesh._geometry._state.uvDecodeMatrix));
    const viewMatrix            = programVariables.createUniform("mat4",  "viewMatrix",            (set, state) => set(state.view.viewMatrix));
    const viewNormalMatrix      = programVariables.createUniform("mat4",  "viewNormalMatrix",      (set, state) => set(state.view.viewNormalMatrix));
    const projMatrix            = programVariables.createUniform("mat4",  "projMatrix",            (set, state) => set(state.view.projMatrix));
    const logDepthBufFC         = programVariables.createUniform("float", "logDepthBufFC",         (set, state) => set(2.0 / (Math.log(state.view.far + 1.0) / Math.LN2)));
    const pickClipPos           = programVariables.createUniform("vec2",  "pickClipPos",           (set, state) => set(state.view.pickClipPos));

    const vWorldPosition = programVariables.createVarying("vec3",  "vWorldPosition", () => "worldPosition.xyz");
    const isPerspective  = programVariables.createVarying("float", "isPerspective",  () => `(${projMatrix}[2][3] == -1.0) ? 1.0 : 0.0`);
    const vFragDepth     = programVariables.createVarying("float", "vFragDepth",     () => "1.0 + clipPos.w");

    const billboard = mesh.billboard;
    const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
    const stationary = mesh.stationary;
    const billboardIfApplicable = v => isBillboard ? `billboard(${v})` : v;

    const programFragmentOutputs = [ ];
    if (clipping) {
        programFragmentOutputs.push(`if (${clippable}) {`);
        programFragmentOutputs.push(`  float dist = ${clipping.getDistance(vWorldPosition)};`);
        programFragmentOutputs.push("  if (dist > 0.0) { discard; }");
        programFragmentOutputs.push("}");
    }
    if (isPoints && programSetup.discardPoints) {
        programFragmentOutputs.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
        programFragmentOutputs.push("float r = dot(cxy, cxy);");
        programFragmentOutputs.push("if (r > 1.0) {");
        programFragmentOutputs.push("   discard;");
        programFragmentOutputs.push("}");
    }
    if (programSetup.dontBillboardAnything) {
        programFragmentOutputs.push(`mat4 viewMatrix2 = ${viewMatrix};`);
    } else {
        programFragmentOutputs.push(`mat4 viewMatrix1 = ${viewMatrix};`);
        if (stationary) {
            programFragmentOutputs.push("viewMatrix1[3].xyz = vec3(0.0, 0.0, 0.0);");
        } else if (meshStateBackground) {
            programFragmentOutputs.push("viewMatrix1[3]     = vec4(0.0, 0.0, 0.0, 1.0);");
        }
        programFragmentOutputs.push(`mat4 viewMatrix2 = ${billboardIfApplicable("viewMatrix1")};`);
    }
    if (getLogDepth) {
        programFragmentOutputs.push(`gl_FragDepth = ${isPerspective} == 0.0 ? gl_FragCoord.z : log2(${vFragDepth}) * ${logDepthBufFC} * 0.5;`);
    }

    const linearToGamma = programVariables.createFragmentDefinition(
        "linearToGamma",
        (name, src) => {
            src.push(`vec4 ${name}(in vec4 value, in float gammaFactor) {`);
            src.push("  return vec4(pow(value.xyz, vec3(1.0 / gammaFactor)), value.w);");
            src.push("}");
        });
    programSetup.appendFragmentOutputs(programFragmentOutputs, scene.gammaOutput && ((color) => `${linearToGamma}(${color}, ${gammaFactor})`), "gl_FragCoord");

    const programVertexOutputs = [ ];
    programVariablesState.appendVertexOutputs(programVertexOutputs);

    const buildVertexShader = () => {
        const viewNormalDefinition = viewNormal && viewNormal.needed && `vec3 ${viewNormal} = normalize((${billboardIfApplicable(viewNormalMatrix)} * vec4(${worldNormal}, 0.0)).xyz);`;

        const mainVertexOutputs = (function() {
            const src = [ ];
            src.push(`vec4 localPosition = vec4(${attributes.position}, 1.0);`);
            if (quantizedGeometry) {
                src.push(`localPosition = ${positionsDecodeMatrix} * localPosition;`);
            }
            src.push(`vec4 worldPosition = ${billboardIfApplicable(modelMatrix)} * localPosition;`);
            src.push(`worldPosition.xyz = worldPosition.xyz + ${offset};`);
            if (programSetup.dontBillboardAnything) {
                src.push(`vec4 viewPosition = ${viewMatrix} * worldPosition;`);
            } else {
                src.push(`mat4 viewMatrix1 = ${viewMatrix};`);
                if (stationary) {
                    src.push("viewMatrix1[3].xyz = vec3(0.0, 0.0, 0.0);");
                } else if (meshStateBackground) {
                    src.push("viewMatrix1[3]     = vec4(0.0, 0.0, 0.0, 1.0);");
                }
                src.push(`mat4 viewMatrix2 = ${billboardIfApplicable("viewMatrix1")};`);
                src.push(`vec4 viewPosition = ${(isBillboard
                                                 ? `${billboardIfApplicable(`viewMatrix1 * ${modelMatrix}`)} * localPosition`
                                                 : "viewMatrix2 * worldPosition")};`);
            }
            decodedUv && decodedUv.needed && src.push(`vec2 ${decodedUv} = ${quantizedGeometry ? `(${uvDecodeMatrix} * vec3(${attributes.uv}, 1.0)).xy` : attributes.uv};`);
            if (worldNormal && worldNormal.needed) {
                const octDecode = programVariables.createVertexDefinition(
                    "octDecode",
                    (name, src) => {
                        src.push(`vec3 ${name}(vec2 oct) {`);
                        src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                        src.push("    if (v.z < 0.0) {");
                        src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                        src.push("    }");
                        src.push("    return normalize(v);");
                        src.push("}");
                    });
                const localNormal = quantizedGeometry ? `${octDecode}(${attributes.normal}.xy)` : attributes.normal;
                src.push(`vec3 ${worldNormal} = (${billboardIfApplicable(modelNormalMatrix)} * vec4(${localNormal}, 0.0)).xyz;`);
            }
            viewNormalDefinition && src.push(viewNormalDefinition);
            programSetup.setupPointSize && isPoints && src.push(`gl_PointSize = ${pointSize};`);
            return src;
        })();

        programVertexOutputs.unshift(`vec4 clipPos = ${projMatrix} * viewPosition;`);

        const gl_Position = (meshStateBackground
                             ? "clipPos.xyww"
                             : (programSetup.isPick
                                ? `vec4((clipPos.xy / clipPos.w - ${pickClipPos}) * clipPos.w, clipPos.zw)`
                                : "clipPos"));
        programVertexOutputs.push(`gl_Position = ${gl_Position};`);

        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " vertex shader");

        if (isBillboard) {
            src.push("mat4 billboard(in mat4 matIn) {");
            src.push("   mat4 mat = matIn;");
            src.push(`   mat[0].xyz = vec3(${scale}[0], 0.0, 0.0);`);
            if (billboard === "spherical") {
                src.push(`   mat[1].xyz = vec3(0.0, ${scale}[1], 0.0);`);
            }
            src.push("   mat[2].xyz = vec3(0.0, 0.0, 1.0);");
            src.push("   return mat;");
            src.push("}");
        }
        programVariablesState.appendVertexDefinitions(src);
        src.push("void main(void) {");
        mainVertexOutputs.forEach(line => src.push(line));
        programVertexOutputs.forEach(line => src.push(line));
        src.push("}");
        return src;
    };

    const buildFragmentShader = () => {
        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");

        // CONSTANT DEFINITIONS
        src.push("#define PI 3.14159265359");
        src.push("#define RECIPROCAL_PI 0.31830988618");
        src.push("#define RECIPROCAL_PI2 0.15915494");
        src.push("#define EPSILON 1e-6");
        src.push("#define saturate(a) clamp( a, 0.0, 1.0 )");

        if (isBillboard) {
            src.push("mat4 billboard(in mat4 matIn) {");
            src.push("   mat4 mat = matIn;");
            src.push(`   mat[0].xyz = vec3(${scale}[0], 0.0, 0.0);`);
            if (billboard === "spherical") {
                src.push(`   mat[1].xyz = vec3(0.0, ${scale}[1], 0.0);`);
            }
            src.push("   mat[2].xyz = vec3(0.0, 0.0, 1.0);");
            src.push("   return mat;");
            src.push("}");
        }

        programVariablesState.appendFragmentDefinitions(src);

        src.push("vec4 sRGBToLinear(in vec4 value) {");
        src.push("  return vec4(mix(pow(value.rgb * 0.9478672986 + 0.0521327014, vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);");
        src.push("}");

        src.push("void main(void) {");
        programFragmentOutputs.forEach(line => src.push(line));
        src.push("}");
        return src;
    };

    const gl = scene.canvas.gl;
    const program = new Program(gl, { vertex: buildVertexShader(), fragment: buildFragmentShader() });
    if (program.errors) {
        return { errors: program.errors };
    } else {
        const inputSetters = programVariablesState.setupInputs(makeInputSetters(gl, program.handle, true));

        let lastMaterialId = null;
        let lastGeometryId = null;

        return {
            destroy: () => program.destroy(),
            drawMesh: (frameCtx, mesh, material) => {
                if (programSetup.skipIfTransparent && (material.alpha < 1.0)) {
                    return;
                }

                const materialState = material._state;
                const meshState = mesh._state;
                const geometry = mesh._geometry;
                const geometryState = geometry._state;
                const camera = scene.camera;
                const project = camera.project;
                const actsAsBackground = programSetup.canActAsBackground && meshStateBackground;

                if (frameCtx.lastProgramId !== program.id) {
                    frameCtx.lastProgramId = program.id;
                    program.bind();
                    frameCtx.useProgram++;
                    lastMaterialId = null;
                    lastGeometryId = null;
                    if (actsAsBackground) {
                        gl.depthFunc(gl.LEQUAL);
                    }
                }

                if (materialState.id !== lastMaterialId) {
                    if (frameCtx.backfaces !== materialState.backfaces) {
                        if (materialState.backfaces) {
                            gl.disable(gl.CULL_FACE);
                        } else {
                            gl.enable(gl.CULL_FACE);
                        }
                        frameCtx.backfaces = materialState.backfaces;
                    }

                    if ((! programSetup.dontSetFrontFace) && (frameCtx.frontface !== materialState.frontface)) {
                        gl.frontFace(materialState.frontface ? gl.CCW : gl.CW);
                        frameCtx.frontface = materialState.frontface;
                    }

                    if (programSetup.drawEdges && (frameCtx.lineWidth !== materialState.edgeWidth)) {
                        gl.lineWidth(materialState.edgeWidth);
                        frameCtx.lineWidth = materialState.edgeWidth;
                    }

                    if (programSetup.setsLineWidth && (frameCtx.lineWidth !== materialState.lineWidth)) {
                        gl.lineWidth(materialState.lineWidth);
                        frameCtx.lineWidth = materialState.lineWidth;
                    }

                    lastMaterialId = materialState.id;
                }

                const withViewProjMatrices = (projMatrix, viewMatrix) => {
                    inputSetters.setUniforms({
                        material: material,
                        mesh:     mesh,
                        view:     {
                            projMatrix:       projMatrix,
                            viewMatrix:       viewMatrix,
                            viewNormalMatrix: camera.viewNormalMatrix,
                            far:              project.far,
                            pickClipPos:      frameCtx.pickClipPos
                        }
                    });
                };

                const origin = mesh.origin;
                if (programSetup.isPick) {
                    withViewProjMatrices(frameCtx.pickProjMatrix,   origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix);
                } else if (programSetup.useShadowView) {
                    withViewProjMatrices(frameCtx.shadowProjMatrix, frameCtx.shadowViewMatrix);
                } else {
                    withViewProjMatrices(project.matrix,            origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
                }

                const withTriangleGeometry = (triangleGeometry) => {
                    inputSetters.setAttributes({
                        geometryState:    geometryState,
                        onBindAttribute:  () => frameCtx.bindArray++,
                        triangleGeometry: triangleGeometry
                    });
                };

                if (programSetup.trianglePick) {
                    const positionsBuf = geometry._getPickTrianglePositions();
                    if (geometryState.id !== lastGeometryId) {
                        withTriangleGeometry({ positionsBuf: positionsBuf, pickColorsBuf: geometry._getPickTriangleColors() });
                        lastGeometryId = geometryState.id;
                    }

                    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                } else if (programSetup.drawEdges) {
                    const indicesBuf = ((geometryState.primitive === gl.TRIANGLES)
                                        ? geometry._getEdgeIndices()
                                        : ((geometryState.primitive === gl.LINES) && geometryState.indicesBuf));

                    if (indicesBuf) {
                        if (geometryState.id !== lastGeometryId) {
                            withTriangleGeometry();

                            indicesBuf.bind();
                            frameCtx.bindArray++;
                            lastGeometryId = geometryState.id;
                        }

                        gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);

                        frameCtx.drawElements++;
                    }
                } else {
                    if (geometryState.id !== lastGeometryId) {
                        withTriangleGeometry();

                        if (geometryState.indicesBuf) {
                            geometryState.indicesBuf.bind();
                            frameCtx.bindArray++;
                        }
                        lastGeometryId = geometryState.id;
                    }

                    if (geometryState.indicesBuf) {
                        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                        frameCtx.drawElements++;
                    } else if (geometryState.positionsBuf) {
                        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                        frameCtx.drawArrays++;
                    }
                }

                if (actsAsBackground) {
                    gl.depthFunc(gl.LESS);
                }
            }
        };
    }
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
    return sample;
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
