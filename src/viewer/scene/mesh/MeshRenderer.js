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

export const lazyShaderVariable = function(name) {
    const variable = {
        toString: () => {
            variable.needed = true;
            return name;
        }
    };
    return variable;
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
        const allocatedUniforms = iota(sectionPlanesState.getNumAllocatedSectionPlanes()).map(i => ({
            sectionPlaneActive: programVariables.createUniform("bool", `sectionPlaneActive${i}`),
            sectionPlanePos:    programVariables.createUniform("vec3", `sectionPlanePos${i}`),
            sectionPlaneDir:    programVariables.createUniform("vec3", `sectionPlaneDir${i}`)
        }));
        return (allocatedUniforms.length > 0) && {
            getDistance: (worldPosition) => allocatedUniforms.map(a => `(${a.sectionPlaneActive} ? clamp(dot(-${a.sectionPlaneDir}, ${worldPosition} - ${a.sectionPlanePos}), 0.0, 1000.0) : 0.0)`).join(" + "),
            setupInputs: () => {
                const setSectionPlanes = allocatedUniforms.map(a => ({
                    active: a.sectionPlaneActive.setupInputs(),
                    pos:    a.sectionPlanePos.setupInputs(),
                    dir:    a.sectionPlaneDir.setupInputs()
                }));
                return (rtcOrigin, sectionPlanesActivePerLayer) => {
                    const sectionPlanes = sectionPlanesState.sectionPlanes;
                    const numSectionPlanes = sectionPlanes.length;
                    for (let sectionPlaneIndex = 0; sectionPlaneIndex < allocatedUniforms.length; sectionPlaneIndex++) {
                        const sectionPlaneUniforms = setSectionPlanes[sectionPlaneIndex];
                        const active = (sectionPlaneIndex < numSectionPlanes) && sectionPlanesActivePerLayer[sectionPlaneIndex];
                        sectionPlaneUniforms.active(active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            if (rtcOrigin) {
                                const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcOrigin, tempVec3a);
                                sectionPlaneUniforms.pos(rtcSectionPlanePos);
                            } else {
                                sectionPlaneUniforms.pos(sectionPlane.pos);
                            }
                            sectionPlaneUniforms.dir(sectionPlane.dir);
                        }
                    }
                };
            }
        };
    })();
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const geometryState = mesh._geometry._state;
    const quantizedGeometry = geometryState.compressGeometry;
    const isPoints = geometryState.primitiveName === "points";
    const setupPointSize = programSetup.setupPointSize && isPoints;
    const gammaOutputSetup = scene.gammaOutput && (function() {
        const gammaFactor = programVariables.createUniform("float", "gammaFactor");
        return {
            getValueExpression: (color) => `linearToGamma(${color}, ${gammaFactor})`,
            setupInputs: () => {
                const setGammaFactor = gammaFactor.setupInputs();
                return setGammaFactor && (() => setGammaFactor(scene.gammaFactor));
            }
        };
    })();

    const modelMatrix = programVariables.createUniform("mat4", "modelMatrix");
    const viewMatrix  = programVariables.createUniform("mat4", "viewMatrix");
    const projMatrix  = programVariables.createUniform("mat4", "projMatrix");
    const offset      = programVariables.createUniform("vec3", "offset");
    const scale       = programVariables.createUniform("vec3", "scale");
    const clippable   = programVariables.createUniform("bool", "clippable");

    const logDepthBufFC         = programVariables.createUniform("float", "logDepthBufFC");
    const pointSize             = programVariables.createUniform("float", "pointSize");
    const positionsDecodeMatrix = programVariables.createUniform("mat4",  "positionsDecodeMatrix");
    const uvDecodeMatrix        = programVariables.createUniform("mat3",  "uvDecodeMatrix");
    const modelNormalMatrix     = programVariables.createUniform("mat4",  "modelNormalMatrix");
    const viewNormalMatrix      = programVariables.createUniform("mat4",  "viewNormalMatrix");
    const pickClipPos           = programVariables.createUniform("vec2",  "pickClipPos");

    const vWorldPosition = programVariables.createVarying("vec3",  "vWorldPosition");
    const isPerspective  = programVariables.createVarying("float", "isPerspective");
    const vFragDepth     = programVariables.createVarying("float", "vFragDepth");

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
    programSetup.appendFragmentOutputs(programFragmentOutputs, gammaOutputSetup && gammaOutputSetup.getValueExpression, "gl_FragCoord");

    const programVertexOutputs = [ ];
    programSetup.appendVertexOutputs && programSetup.appendVertexOutputs(programVertexOutputs);

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
                const localNormal = quantizedGeometry ? `octDecode(${attributes.normal}.xy)` : attributes.normal;
                src.push(`vec3 ${worldNormal} = (${billboardIfApplicable(modelNormalMatrix)} * vec4(${localNormal}, 0.0)).xyz;`);
            }
            viewNormalDefinition && src.push(viewNormalDefinition);
            setupPointSize && src.push(`gl_PointSize = ${pointSize};`);
            return src;
        })();

        vWorldPosition.needed && programVertexOutputs.push(`${vWorldPosition} = worldPosition.xyz;`);

        programVertexOutputs.push(`vec4 clipPos = ${projMatrix} * viewPosition;`);
        isPerspective.needed && programVertexOutputs.push(`${isPerspective} = (${projMatrix}[2][3] == -1.0) ? 1.0 : 0.0;`);
        vFragDepth.needed && programVertexOutputs.push(`${vFragDepth} = 1.0 + clipPos.w;`);

        const gl_Position = (meshStateBackground
                             ? "clipPos.xyww"
                             : (programSetup.isPick
                                ? `vec4((clipPos.xy / clipPos.w - ${pickClipPos}) * clipPos.w, clipPos.zw)`
                                : "clipPos"));
        programVertexOutputs.push(`gl_Position = ${gl_Position};`);

        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " vertex shader");
        src.push(`vec3 octDecode(vec2 oct) {`);
        src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
        src.push("    if (v.z < 0.0) {");
        src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
        src.push("    }");
        src.push("    return normalize(v);");
        src.push("}");

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
        programSetup.appendFragmentDefinitions && programSetup.appendFragmentDefinitions(src);
        programVariablesState.appendFragmentDefinitions(src);

        src.push("vec4 linearToGamma(in vec4 value, in float gammaFactor) {");
        src.push("  return vec4(pow(value.xyz, vec3(1.0 / gammaFactor)), value.w);");
        src.push("}");

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
        programVariablesState.setGetInputSetter(makeInputSetters(gl, program.handle, true));

        const programInputSetters       = programSetup.setupProgramInputs && programSetup.setupProgramInputs();
        const setLightInputState        = programInputSetters && programInputSetters.setLightStateValues;
        const setMaterialInputsState    = programInputSetters && programInputSetters.setMaterialStateValues;
        const setProgramMeshInputsState = programInputSetters && programInputSetters.setMeshStateValues;

        const setPickClipPosState = pickClipPos.setupInputs();
        const setGammaOutput = gammaOutputSetup && gammaOutputSetup.setupInputs();
        const setGeometryInputsState = (function() {
            const setPositionsDecodeMatrix = positionsDecodeMatrix.setupInputs();
            const setUvDecodeMatrix = uvDecodeMatrix.setupInputs();
            const setPosition  = attributes.position.setupInputs();
            const setNormal    = attributes.normal && attributes.normal.setupInputs();
            const setUV        = attributes.uv && attributes.uv.setupInputs();
            const setColor     = attributes.color && attributes.color.setupInputs();
            const setPickColor = attributes.pickColor.setupInputs();

            const binder = (arrayBuf, onBindAttribute) => ({ // see ArrayBuf.js and Attribute.js
                bindAtLocation: location => {
                    arrayBuf.bind();
                    gl.vertexAttribPointer(location, arrayBuf.itemSize, arrayBuf.itemType, arrayBuf.normalized, 0, 0);
                    onBindAttribute();
                }
            });

            return (geometryState, onBindAttribute, triangleGeometry) => {
                setPositionsDecodeMatrix && setPositionsDecodeMatrix(geometryState.positionsDecodeMatrix);
                setUvDecodeMatrix && setUvDecodeMatrix(geometryState.uvDecodeMatrix);

                setPosition(binder((triangleGeometry || geometryState).positionsBuf, onBindAttribute));
                setNormal && setNormal(binder(geometryState.normalsBuf, onBindAttribute));
                setUV && setUV(binder(geometryState.uvBuf, onBindAttribute));
                setColor && setColor(binder(geometryState.colorsBuf, onBindAttribute));
                setPickColor && setPickColor(binder(triangleGeometry.pickColorsBuf, onBindAttribute));
            };
        })();
        const setPointSize = pointSize.setupInputs();
        const setMeshInputsState = (function() {
            const setModelMatrix = modelMatrix.setupInputs();
            const setModelNormalMatrix = modelNormalMatrix.setupInputs();
            const setViewMatrix = viewMatrix.setupInputs();
            const setViewNormalMatrix = viewNormalMatrix.setupInputs();
            const setProjMatrix = projMatrix.setupInputs();
            const setOffset = offset.setupInputs();
            const setScale = scale.setupInputs();
            const setLogDepthBufFC = logDepthBufFC.setupInputs();

            return (mesh, viewMatrix, viewNormalMatrix, projMatrix, far) => {
                setModelMatrix(mesh.worldMatrix);
                setModelNormalMatrix && setModelNormalMatrix(mesh.worldNormalMatrix);
                setViewMatrix(viewMatrix);
                setViewNormalMatrix && setViewNormalMatrix(viewNormalMatrix);
                setProjMatrix(projMatrix);
                setOffset(mesh.offset);
                setScale(mesh.scale);
                setLogDepthBufFC && setLogDepthBufFC(2.0 / (Math.log(far + 1.0) / Math.LN2));
            };
        })();
        const setSectionPlanesInputsState = clipping && (function() {
            const setClippable = clippable.setupInputs();
            const setClippingState = clipping.setupInputs();
            return (rtcOrigin, renderFlags, clippable) => {
                setClippable(clippable);
                if (clippable) {
                    setClippingState(rtcOrigin, renderFlags.sectionPlanesActivePerLayer);
                }
            };
        })();

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
                const origin = mesh.origin;
                const camera = scene.camera;
                const project = camera.project;
                const actsAsBackground = programSetup.canActAsBackground && meshStateBackground;

                if (frameCtx.lastProgramId !== program.id) {
                    frameCtx.lastProgramId = program.id;
                    program.bind();
                    frameCtx.useProgram++;
                    lastMaterialId = null;
                    lastGeometryId = null;
                    setLightInputState && setLightInputState();
                    if (actsAsBackground) {
                        gl.depthFunc(gl.LEQUAL);
                    }
                }

                setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, mesh.clippable);

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

                    setMaterialInputsState && setMaterialInputsState(material);
                    setPointSize && setPointSize(material.pointSize);

                    lastMaterialId = materialState.id;
                }

                setPickClipPosState && setPickClipPosState(frameCtx.pickClipPos);
                setProgramMeshInputsState && setProgramMeshInputsState(mesh);
                setGammaOutput && setGammaOutput();

                if (programSetup.isPick) {
                    setMeshInputsState(mesh, origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix, camera.viewNormalMatrix, frameCtx.pickProjMatrix, project.far);
                } else if (programSetup.useShadowView) {
                    setMeshInputsState(mesh, frameCtx.shadowViewMatrix, camera.viewNormalMatrix, frameCtx.shadowProjMatrix, camera.project.far);
                } else {
                    setMeshInputsState(mesh, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix, camera.viewNormalMatrix, project.matrix, project.far);
                }

                if (programSetup.trianglePick) {
                    const positionsBuf = geometry._getPickTrianglePositions();
                    if (geometryState.id !== lastGeometryId) {
                        setGeometryInputsState(geometryState, () => frameCtx.bindArray++, { positionsBuf: positionsBuf, pickColorsBuf: geometry._getPickTriangleColors() });
                        lastGeometryId = geometryState.id;
                    }

                    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                } else if (programSetup.drawEdges) {
                    const indicesBuf = ((geometryState.primitive === gl.TRIANGLES)
                                        ? geometry._getEdgeIndices()
                                        : ((geometryState.primitive === gl.LINES) && geometryState.indicesBuf));

                    if (indicesBuf) {
                        if (geometryState.id !== lastGeometryId) {
                            setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

                            indicesBuf.bind();
                            frameCtx.bindArray++;
                            lastGeometryId = geometryState.id;
                        }

                        gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);

                        frameCtx.drawElements++;
                    }
                } else {
                    if (geometryState.id !== lastGeometryId) {
                        setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

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

export const setupTexture = (programVariables, type, name, encoding, hasMatrix) => {
    const map    = programVariables.createUniform(type, name + "Map");
    const matrix = hasMatrix && programVariables.createUniform("mat4", name + "MapMatrix");
    const swizzle = (type === "samplerCube") ? "xyz" : "xy";
    const getTexCoordExpression = texPos => (matrix ? `(${matrix} * ${texPos}).${swizzle}` : `${texPos}.${swizzle}`);
    return {
        getTexCoordExpression: getTexCoordExpression,
        getValueExpression: (texturePos, bias) => {
            const texel = (bias
                           ? `texture(${map}, ${getTexCoordExpression(texturePos)}, ${bias})`
                           : `texture(${map}, ${getTexCoordExpression(texturePos)})`);
            return (encoding !== LinearEncoding) ? `${TEXTURE_DECODE_FUNCS[encoding]}(${texel})` : texel;
        },
        setupInputs: () => {
            const setMap    = map.setupInputs();
            const setMatrix = matrix && matrix.setupInputs();
            return setMap && function(tex, mtx) {
                if (tex) {
                    setMap(tex);
                    if (mtx && setMatrix) {
                        setMatrix(mtx);
                    }
                }
            };
        }
    };
};

export const createLightSetup = function(programVariables, lightsState, setupCubes) {
    const lightsStateUniform = (type, name, getUniformValue) => {
        const uniform = programVariables.createUniform(type, name);
        return {
            toString: uniform.toString,
            setupLightsInputs: () => {
                const setUniform = uniform.setupInputs();
                return setUniform && (() => setUniform(getUniformValue()));
            }
        };
    };

    const lightAmbient = lightsStateUniform("vec4", "lightAmbient", () => lightsState.getAmbientColorAndIntensity());

    const lights = lightsState.lights;
    const directionals = lights.map((light, i) => {
        const lightUniforms = {
            color: lightsStateUniform("vec4", `lightColor${i}`, () => {
                const light = lights[i]; // in case it changed
                tempVec4[0] = light.color[0];
                tempVec4[1] = light.color[1];
                tempVec4[2] = light.color[2];
                tempVec4[3] = light.intensity;
                return tempVec4;
            }),
            position:  lightsStateUniform("vec3", `lightPos${i}`, () => lights[i].pos),
            direction: lightsStateUniform("vec3", `lightDir${i}`, () => lights[i].dir),

            shadowProjMatrix: lightsStateUniform("mat4", `shadowProjMatrix${i}`, () => lights[i].getShadowViewMatrix()),
            shadowViewMatrix: lightsStateUniform("mat4", `shadowViewMatrix${i}`, () => lights[i].getShadowViewMatrix()),
            shadowMap:        lightsStateUniform("sampler2D", `shadowMap${i}`, () => {
                const shadowRenderBuf = lights[i].getShadowRenderBuf();
                return shadowRenderBuf && shadowRenderBuf.getTexture();
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
        const tex = initMap && setupTexture(programVariables, "samplerCube", name, initMap.encoding, false);
        return tex && {
            getTexCoordExpression: tex.getTexCoordExpression,
            getValueExpression:    tex.getValueExpression,
            setupInputs:           () => {
                const setInputsState = tex.setupInputs();
                return setInputsState && (() => setInputsState(getValue().texture, null));
            }
        };
    };

    const lightMap      = setupCubes && setupCubeTexture("light",      () => lightsState.lightMaps);
    const reflectionMap = setupCubes && setupCubeTexture("reflection", () => lightsState.reflectionMaps);

    return {
        getHash: () => lightsState.getHash(),
        getAmbientColor: () => `${lightAmbient}.rgb * ${lightAmbient}.a`,
        directionalLights: directionals.map(light => light.glslLight),
        getIrradiance: lightMap      && ((worldNormal) => `${lightMap.getValueExpression(worldNormal)}.rgb`),
        getReflection: reflectionMap && ((reflectVec, mipLevel) => `${reflectionMap.getValueExpression(reflectVec, mipLevel)}.rgb`),
        setupInputs: () => {
            const setAmbientInputState = lightAmbient.setupLightsInputs();
            const setDirectionalsInputStates = directionals.map(light => light.setupLightsInputs());
            const uLightMap      = lightMap && lightMap.setupInputs();
            const uReflectionMap = reflectionMap && reflectionMap.setupInputs();
            return () => {
                setAmbientInputState && setAmbientInputState();
                setDirectionalsInputStates.forEach(setState => setState());
                uLightMap      && uLightMap();
                uReflectionMap && uReflectionMap();
            };
        }
    };
};
