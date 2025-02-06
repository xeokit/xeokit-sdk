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

export const instantiateMeshRenderer = (mesh, programSetup) => {
    const scene = mesh.scene;
    const clipping = (function() {
        const sectionPlanesState = scene._sectionPlanesState;
        const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();

        return (numAllocatedSectionPlanes > 0) && {
            appendDefinitions: (src) => {
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    src.push("uniform bool sectionPlaneActive" + i + ";");
                    src.push("uniform vec3 sectionPlanePos" + i + ";");
                    src.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
            },
            getDistance: (worldPosition) => {
                return iota(numAllocatedSectionPlanes).map(i => `(sectionPlaneActive${i} ? clamp(dot(-sectionPlaneDir${i}, ${worldPosition} - sectionPlanePos${i}), 0.0, 1000.0) : 0.0)`).join(" + ");
            },
            setupInputs: (getUniformSetter) => {
                const uSectionPlanes = iota(numAllocatedSectionPlanes).map(i => ({
                    active: getUniformSetter("sectionPlaneActive" + i),
                    pos:    getUniformSetter("sectionPlanePos" + i),
                    dir:    getUniformSetter("sectionPlaneDir" + i)
                }));
                return (rtcOrigin, sectionPlanesActivePerLayer) => {
                    const sectionPlanes = sectionPlanesState.sectionPlanes;
                    const numSectionPlanes = sectionPlanes.length;
                    for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                        const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
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
    const gammaOutputSetup = programSetup.useGammaOutput && scene.gammaOutput && (function() {
        let needed = false;
        return {
            appendDefinitions: (src) => {
                if (needed) {
                    src.push("uniform float gammaFactor;");
                    src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                    src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                    src.push("}");
                }
            },
            getValueExpression: (color) => {
                needed = true;
                return `linearToGamma(${color}, gammaFactor)`;
            },
            setupInputs: (getInputSetter) => {
                const gammaFactor = needed && getInputSetter("gammaFactor");
                return () => gammaFactor && gammaFactor(scene.gammaFactor);
            }
        };
    })();

    const lazyShaderAttribute = function(name, type) {
        let needed = false;
        return {
            appendDefinitions: (src) => needed && src.push(`in ${type} ${name};`),
            toString: () => {
                needed = true;
                return name;
            },
            setupInputs: (getInputSetter) => needed && getInputSetter(name)
        };
    };

    const attributes = {
        position:  lazyShaderAttribute("position",  "vec3"),
        color:     lazyShaderAttribute("color",     "vec4"),
        pickColor: lazyShaderAttribute("pickColor", "vec4"),
        uv:        lazyShaderAttribute("uv",        "vec2"),
        normal:    lazyShaderAttribute("normal",    "vec3")
    };

    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const uvDecoded   = lazyShaderVariable("uvDecoded");
    const worldNormal = lazyShaderVariable("worldNormal");
    const viewNormal  = lazyShaderVariable("viewNormal");

    const programFragmentOutputs = [ ];
    programSetup.appendFragmentOutputs(programFragmentOutputs, gammaOutputSetup && gammaOutputSetup.getValueExpression, "gl_FragCoord");

    const programVertexOutputs = [ ];
    programSetup.appendVertexOutputs && programSetup.appendVertexOutputs(programVertexOutputs, attributes.color, attributes.pickColor, uvDecoded, worldNormal, viewNormal);

    const buildVertexShader = () => {
        const billboard = mesh.billboard;
        const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
        const stationary = mesh.stationary;

        const viewNormalLines = viewNormal.needed && [
            "mat4 viewNormalMatrix2 = viewNormalMatrix;",
            isBillboard && "billboard(viewNormalMatrix2);",
            `vec3 ${viewNormal} = normalize((viewNormalMatrix2 * vec4(${worldNormal}, 0.0)).xyz);`
        ].filter(line => line);

        const mainVertexOutputs = (function() {
            const src = [ ];
            src.push(`vec4 localPosition = vec4(${attributes.position}, 1.0);`);
            if (quantizedGeometry) {
                src.push("localPosition = positionsDecodeMatrix * localPosition;");
            }
            if (programSetup.dontBillboardAnything) {
                src.push("vec4 worldPosition = modelMatrix * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                src.push("vec4 viewPosition = viewMatrix * worldPosition;");
            } else {
                src.push("mat4 viewMatrix2 = viewMatrix;");
                src.push("mat4 modelMatrix2 = modelMatrix;");
                if (stationary) {
                    src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;");
                } else if (programSetup.meshStateBackground) {
                    src.push("viewMatrix2[3] = vec4(0.0, 0.0, 0.0 ,1.0);");
                }
                if (isBillboard) {
                    src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
                    src.push("billboard(modelMatrix2);");
                    src.push("billboard(viewMatrix2);");
                }
                src.push("vec4 worldPosition = modelMatrix2 * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                if (isBillboard) {
                    src.push("billboard(modelViewMatrix);");
                    src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
                } else {
                    src.push("vec4 viewPosition = viewMatrix2 * worldPosition;");
                }
            }
            if (uvDecoded.needed) {
                src.push(`vec2 uvDecoded = ${quantizedGeometry ? `(uvDecodeMatrix * vec3(${attributes.uv}, 1.0)).xy` : attributes.uv};`);
            }
            if (worldNormal.needed) {
                src.push(`vec3 localNormal = ${quantizedGeometry ? `octDecode(${attributes.normal}.xy)` : attributes.normal};`);
                src.push("mat4 modelNormalMatrix2 = modelNormalMatrix;");
                isBillboard && src.push("billboard(modelNormalMatrix2);");
                src.push(`vec3 ${worldNormal} = (modelNormalMatrix2 * vec4(localNormal, 0.0)).xyz;`);
            }
            viewNormalLines && viewNormalLines.forEach(line => src.push(line));
            return src;
        })();

        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " vertex shader");
        Object.values(attributes).forEach(a => a.appendDefinitions(src));
        src.push("uniform mat4 modelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        src.push("uniform vec3 offset;");
        src.push("uniform vec3 scale;");
        if (quantizedGeometry) {
            src.push("uniform mat4 positionsDecodeMatrix;");
            if (uvDecoded.needed) {
                src.push("uniform mat3 uvDecodeMatrix;");
            }
            if (worldNormal.needed) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
            }
        }
        if (getLogDepth) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        if (clipping) {
            src.push("out vec3 vWorldPosition;");
        }
        if (isBillboard) {
            src.push("void billboard(inout mat4 mat) {");
            src.push("   mat[0][0] = scale[0];");
            src.push("   mat[0][1] = 0.0;");
            src.push("   mat[0][2] = 0.0;");
            if (billboard === "spherical") {
                src.push("   mat[1][0] = 0.0;");
                src.push("   mat[1][1] = scale[1];");
                src.push("   mat[1][2] = 0.0;");
            }
            src.push("   mat[2][0] = 0.0;");
            src.push("   mat[2][1] = 0.0;");
            src.push("   mat[2][2] =1.0;");
            src.push("}");
        }
        if (setupPointSize) {
            src.push("uniform float pointSize;");
        }
        if (worldNormal.needed) {
            src.push("uniform mat4 modelNormalMatrix;");
        }
        if (viewNormal.needed) {
            src.push("uniform mat4 viewNormalMatrix;");
        }
        programSetup.appendVertexDefinitions && programSetup.appendVertexDefinitions(src);
        src.push("void main(void) {");
        mainVertexOutputs.forEach(line => src.push(line));
        programVertexOutputs.forEach(line => src.push(line));
        if (setupPointSize) {
            src.push("gl_PointSize = pointSize;");
        }
        if (clipping) {
            src.push("vWorldPosition = worldPosition.xyz;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (getLogDepth) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = " + (programSetup.transformClipPos ? programSetup.transformClipPos("clipPos") : "clipPos") + ";");
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
        if (getLogDepth) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        if (clipping) {
            src.push("in vec3 vWorldPosition;");
            src.push("uniform bool clippable;");
            clipping.appendDefinitions(src);
        }
        gammaOutputSetup && gammaOutputSetup.appendDefinitions(src);
        programSetup.appendFragmentDefinitions(src);
        src.push("void main(void) {");
        if (clipping) {
            src.push("if (clippable) {");
            src.push("  float dist = " + clipping.getDistance("vWorldPosition") + ";");
            src.push("  if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (isPoints && programSetup.discardPoints) {
            src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
            src.push("float r = dot(cxy, cxy);");
            src.push("if (r > 1.0) {");
            src.push("   discard;");
            src.push("}");
        }
        programFragmentOutputs.forEach(line => src.push(line));
        if (getLogDepth) {
            src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("}");
        return src;
    };

    const gl = scene.canvas.gl;
    const program = new Program(gl, { vertex: buildVertexShader(), fragment: buildFragmentShader() });
    if (program.errors) {
        return { errors: program.errors };
    } else {
        const getInputSetter = makeInputSetters(gl, program.handle, true);
        const setPickClipPosState = programSetup.setupPickClipPosInputs && programSetup.setupPickClipPosInputs(getInputSetter);
        const setProgramMeshInputsState = programSetup.setupMeshInputs && programSetup.setupMeshInputs(getInputSetter);
        const setGammaOutput = gammaOutputSetup && gammaOutputSetup.setupInputs(getInputSetter);
        const setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
        const setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);
        const setGeometryInputsState = (function() {
            const uPositionsDecodeMatrix = quantizedGeometry && getInputSetter("positionsDecodeMatrix");
            const uvDecodeMatrix = uvDecoded.needed && quantizedGeometry && getInputSetter("uvDecodeMatrix");
            const setPosition  = attributes.position.setupInputs(getInputSetter);
            const setNormal    = attributes.normal.setupInputs(getInputSetter);
            const setUV        = attributes.uv.setupInputs(getInputSetter);
            const setColor     = attributes.color.setupInputs(getInputSetter);
            const setPickColor = attributes.pickColor.setupInputs(getInputSetter);

            const binder = (arrayBuf, onBindAttribute) => ({ // see ArrayBuf.js and Attribute.js
                bindAtLocation: location => {
                    arrayBuf.bind();
                    gl.vertexAttribPointer(location, arrayBuf.itemSize, arrayBuf.itemType, arrayBuf.normalized, 0, 0);
                    onBindAttribute();
                }
            });

            return (geometryState, onBindAttribute, triangleGeometry) => {
                uPositionsDecodeMatrix && uPositionsDecodeMatrix(geometryState.positionsDecodeMatrix);
                uvDecodeMatrix && uvDecodeMatrix(geometryState.uvDecodeMatrix);

                setPosition(binder((triangleGeometry || geometryState).positionsBuf, onBindAttribute));
                setNormal && setNormal(binder(geometryState.normalsBuf, onBindAttribute));
                setUV && setUV(binder(geometryState.uvBuf, onBindAttribute));
                setColor && setColor(binder(geometryState.colorsBuf, onBindAttribute));
                setPickColor && setPickColor(binder(triangleGeometry.pickColorsBuf, onBindAttribute));
            };
        })();
        const setGeneralMaterialInputsState = setupPointSize && (function() {
            const pointSize = getInputSetter("pointSize");
            return (mtl) => pointSize(mtl.pointSize);
        })();
        const setMeshInputsState = (function() {
            const uModelMatrix = getInputSetter("modelMatrix");
            const uModelNormalMatrix = worldNormal.needed && getInputSetter("modelNormalMatrix");
            const uViewMatrix = getInputSetter("viewMatrix");
            const uViewNormalMatrix = viewNormal.needed && getInputSetter("viewNormalMatrix");
            const uProjMatrix = getInputSetter("projMatrix");

            const uOffset = getInputSetter("offset");
            const uScale = getInputSetter("scale");
            const uLogDepthBufFC = getLogDepth && getInputSetter("logDepthBufFC");

            return (mesh, viewMatrix, viewNormalMatrix, projMatrix, far) => {
                uModelMatrix(mesh.worldMatrix);
                uModelNormalMatrix && uModelNormalMatrix(mesh.worldNormalMatrix);
                uViewMatrix(viewMatrix);
                uViewNormalMatrix && uViewNormalMatrix(viewNormalMatrix);
                uProjMatrix(projMatrix);
                uOffset(mesh.offset);
                uScale(mesh.scale);
                uLogDepthBufFC && uLogDepthBufFC(2.0 / (Math.log(far + 1.0) / Math.LN2));
            };
        })();
        const setSectionPlanesInputsState = clipping && (function() {
            const uClippable = getInputSetter("clippable");
            const setClippingState = clipping.setupInputs(getInputSetter);
            return (rtcOrigin, renderFlags, clippable) => {
                uClippable(clippable);
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
                const actsAsBackground = programSetup.canActAsBackground && meshState.background;

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
                    setGeneralMaterialInputsState && setGeneralMaterialInputsState(material);

                    lastMaterialId = materialState.id;
                }

                setPickClipPosState && setPickClipPosState(frameCtx.pickClipPos);
                setProgramMeshInputsState && setProgramMeshInputsState(mesh);
                setGammaOutput && setGammaOutput();

                if (programSetup.usePickView) {
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

const lazyShaderUniform = function(name, type) {
    let needed = false;
    return {
        appendDefinitions: (src) => needed && src.push(`uniform ${type} ${name};`),
        toString: () => {
            needed = true;
            return name;
        },
        setupInputs: (getUniformSetter) => needed && getUniformSetter(name)
    };
};

export const setupTexture = (name, type, getValue, initValue) => {
    return initValue && (function() {
        const map    = lazyShaderUniform(name + "Map", type);
        const matrix = initValue._state.matrix && lazyShaderUniform(name + "MapMatrix", "mat4");
        const swizzle = (type === "samplerCube") ? "xyz" : "xy";
        const getTexCoordExpression = texPos => (matrix ? `(${matrix} * ${texPos}).${swizzle}` : `${texPos}.${swizzle}`);
        return {
            appendDefinitions: (src) => {
                map.appendDefinitions(src);
                matrix && matrix.appendDefinitions(src);
            },
            getTexCoordExpression: getTexCoordExpression,
            getValueExpression: (texturePos, bias) => {
                const texel = (bias
                               ? `texture(${map}, ${getTexCoordExpression(texturePos)}, ${bias})`
                               : `texture(${map}, ${getTexCoordExpression(texturePos)})`);
                const enc = initValue.encoding;
                return (enc !== LinearEncoding) ? `${TEXTURE_DECODE_FUNCS[enc]}(${texel})` : texel;
            },
            setupInputs: (getInputSetter) => {
                const setMap    = map.setupInputs(getInputSetter);
                const setMatrix = matrix && matrix.setupInputs(getInputSetter);
                return setMap && function(...args) {
                    const value = getValue(...args);
                    const tex = value._state.texture;
                    if (tex) {
                        setMap(tex);
                        const mtx = setMatrix && value._state.matrix;
                        if (mtx) {
                            setMatrix(mtx);
                        }
                    }
                };
            }
        };
    })();
};

export const createLightSetup = function(lightsState, setupCubes) {
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

            shadowProjMatrix: lightsStateUniform(`shadowProjMatrix${i}`, "mat4", () => lights[i].getShadowViewMatrix()),
            shadowViewMatrix: lightsStateUniform(`shadowViewMatrix${i}`, "mat4", () => lights[i].getShadowViewMatrix()),
            shadowMap:        lightsStateUniform(`shadowMap${i}`,   "sampler2D", () => {
                const shadowRenderBuf = lights[i].getShadowRenderBuf();
                return shadowRenderBuf && shadowRenderBuf.getTexture();
            })
        };

        const withViewLightDir = getDirection => {
            return {
                appendDefinitions: (src) => Object.values(lightUniforms).forEach(u => u.appendDefinitions(src)),
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
                setupLightsInputs: (getUniformSetter) => {
                    const setters = Object.values(lightUniforms).map(u => u.setupLightsInputs(getUniformSetter)).filter(v => v);
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
        const getValue = () => { const m = getMaps(); return (m.length > 0) && { encoding: m[0].encoding, _state: { texture: m[0].texture } }; };
        return setupTexture(name, "samplerCube", getValue, getValue());
    };

    const lightMap      = setupCubes && setupCubeTexture("light",      () => lightsState.lightMaps);
    const reflectionMap = setupCubes && setupCubeTexture("reflection", () => lightsState.reflectionMaps);

    return {
        appendDefinitions: (src) => {
            lightAmbient.appendDefinitions(src);
            directionals.forEach(light => light.appendDefinitions(src));
            lightMap && lightMap.appendDefinitions(src);
            reflectionMap && reflectionMap.appendDefinitions(src);
        },
        getAmbientColor: () => `${lightAmbient}.rgb * ${lightAmbient}.a`,
        directionalLights: directionals.map(light => light.glslLight),
        lightMap:      lightMap      && { getValueExpression: lightMap.getValueExpression },
        reflectionMap: reflectionMap && { getValueExpression: reflectionMap.getValueExpression },
        setupInputs: (getUniformSetter) => {
            const setAmbientInputState = lightAmbient.setupLightsInputs(getUniformSetter);
            const setDirectionalsInputStates = directionals.map(light => light.setupLightsInputs(getUniformSetter));
            const uLightMap      = lightMap && lightMap.setupInputs(getUniformSetter);
            const uReflectionMap = reflectionMap && reflectionMap.setupInputs(getUniformSetter);
            return () => {
                setAmbientInputState && setAmbientInputState();
                setDirectionalsInputStates.forEach(setState => setState());
                uLightMap      && uLightMap();
                uReflectionMap && uReflectionMap();
            };
        }
    };
};
