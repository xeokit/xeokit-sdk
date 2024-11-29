import {createClippingSetup} from "../layer/Layer.js";
import {createRTCViewMat, math} from "../../math/index.js";
import {Program} from "../../webgl/Program.js";

const tempVec3a = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class VBORenderer {
    constructor(scene, instancing, primitive, cfg, subGeometry) {

        const methodName = instancing ? "instancing" : "batching";
        const sliceColorEnabled = true;

        const pointsMaterial = scene.pointsMaterial;

        const programName               = cfg.programName;
        const incrementDrawState        = cfg.incrementDrawState;
        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = cfg.clippingCaps;
        const renderPassFlag            = cfg.renderPassFlag;
        const usePickParams             = cfg.usePickParams;
        const cullOnAlphaZero           = false && !cfg.dontCullOnAlphaZero;
        const appendVertexDefinitions   = cfg.appendVertexDefinitions;
        const filterIntensityRange      = cfg.filterIntensityRange && (primitive === "points") && pointsMaterial.filterIntensity;
        const transformClipPos          = cfg.transformClipPos;
        const isShadowProgram           = cfg.isShadowProgram;
        const appendVertexOutputs       = cfg.appendVertexOutputs;
        const appendFragmentDefinitions = cfg.appendFragmentDefinitions;
        const appendFragmentOutputs     = cfg.appendFragmentOutputs;
        const vertexCullX               = cfg.vertexCullX;
        const setupInputs               = cfg.setupInputs;

        const testPerspectiveForGl_FragDepth = ((primitive !== "points") && (primitive !== "lines")) || subGeometry;
        const setupPoints = (primitive === "points") && (! subGeometry);

        const sectionPlanesState = scene._sectionPlanesState;

        const getHash = () => [ sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;
        const clipping = createClippingSetup(gl, sectionPlanesState);

        const lazyShaderVariable = function(name) {
            const variable = {
                toString: () => {
                    variable.needed = true;
                    return name;
                }
            };
            return variable;
        };

        const geometry = (function() {
            const params = {
                colorA:             lazyShaderVariable("colorA"),
                pickColorA:         lazyShaderVariable("pickColor"),
                uvA:                lazyShaderVariable("aUv"),
                metallicRoughnessA: lazyShaderVariable("metallicRoughness"),
                viewMatrix:         "viewMatrix",
                viewNormal:         lazyShaderVariable("viewNormal"),
                worldNormal:        lazyShaderVariable("worldNormal"),
                worldPosition:      "worldPosition",
                getFlag:            renderPassFlag => `(int(flags) >> ${renderPassFlag * 4} & 0xF)`,
                fragViewMatrix:     lazyShaderVariable("viewMatrix")
            };

            /**
             * Matrices Uniform Block Buffer
             *
             * In shaders, matrices in the Matrices Uniform Block MUST be set in this order:
             *  - worldMatrix
             *  - viewMatrix
             *  - projMatrix
             *  - positionsDecodeMatrix
             *  - worldNormalMatrix
             *  - viewNormalMatrix
             */
            const matricesUniformBlockBufferBindingPoint = 0;
            const matricesUniformBlockBuffer = scene.canvas.gl.createBuffer();
            const matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

            /**
             * A Vertex Array Object by Layer
             */
            const drawCallCache = new WeakMap();

            const needNormal = () => (params.viewNormal.needed || params.worldNormal.needed);

            const matricesUniformBlockLines = () => [
                "uniform Matrices {",
                "    mat4 worldMatrix;",
                "    mat4 viewMatrix;",
                "    mat4 projMatrix;",
                "    mat4 positionsDecodeMatrix;"
            ].concat(needNormal() ? [
                "    mat4 worldNormalMatrix;",
                "    mat4 viewNormalMatrix;",
            ] : [ ]).concat([ "};" ]);

            return {
                parameters: params,

                getClippable: () => "((int(flags) >> 16 & 0xF) == 1) ? 1.0 : 0.0",

                appendVertexDefinitions: (src) => {
                    src.push("in vec3 position;");
                    if (needNormal()) {
                        src.push("in vec3 normal;");
                    }
                    if (params.colorA.needed) {
                        src.push(`in vec4 colorA255;`);
                    }
                    if (params.pickColorA.needed) {
                        src.push("in vec4 pickColor;");
                    }
                    if (params.uvA.needed) {
                        src.push("in vec2 uv;");
                        src.push("uniform mat3 uvDecodeMatrix;");
                    }
                    if (params.metallicRoughnessA.needed) {
                        src.push("in vec2 metallicRoughness;");
                    }
                    src.push("in float flags;");
                    if (scene.entityOffsetsEnabled) {
                        src.push("in vec3 offset;");
                    }

                    if (instancing) {
                        src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
                        src.push("in vec4 modelMatrixCol1;");
                        src.push("in vec4 modelMatrixCol2;");
                        if (needNormal()) {
                            src.push("in vec4 modelNormalMatrixCol0;");
                            src.push("in vec4 modelNormalMatrixCol1;");
                            src.push("in vec4 modelNormalMatrixCol2;");
                        }
                    }

                    matricesUniformBlockLines().forEach(line => src.push(line));

                    if (needNormal()) {
                        src.push("vec3 octDecode(vec2 oct) {");
                        src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                        src.push("    if (v.z < 0.0) {");
                        src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                        src.push("    }");
                        src.push("    return normalize(v);");
                        src.push("}");
                    }
                },

                appendVertexData: (src, afterFlagsColorLines) => {

                    if (params.colorA.needed) {
                        src.push(`vec4 ${params.colorA} = colorA255 / 255.0;`);
                    }

                    afterFlagsColorLines.forEach(line => src.push(line));

                    if (needNormal()) {
                        src.push("vec4 modelNormal = vec4(octDecode(normal.xy), 0.0);");
                        if (instancing) {
                            src.push("modelNormal = vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
                        }
                        src.push(`vec3 ${params.worldNormal} = (worldNormalMatrix * modelNormal).xyz;`);
                        if (params.viewNormal.needed) {
                            src.push(`vec3 viewNormal = normalize((viewNormalMatrix * vec4(${params.worldNormal}, 0.0)).xyz);`);
                        }
                    }

                    if (params.uvA.needed) {
                        src.push(`vec2 ${params.uvA} = (uvDecodeMatrix * vec3(uv, 1.0)).xy;`);
                    }

                    if (instancing) {
                        src.push("vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0);");
                        src.push("worldPosition = worldMatrix * vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
                    } else {
                        src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0));");
                    }
                    if (scene.entityOffsetsEnabled) {
                        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                    }
                },

                appendFragmentDefinitions: (src) => {
                    if (params.fragViewMatrix.needed) {
                        matricesUniformBlockLines().forEach(line => src.push(line));
                    }
                },

                makeDrawCall: function(program) {
                    gl.uniformBlockBinding(
                        program.handle,
                        gl.getUniformBlockIndex(program.handle, "Matrices"),
                        matricesUniformBlockBufferBindingPoint);

                    const aPosition = program.getAttribute("position");
                    const aOffset = program.getAttribute("offset");
                    const aNormal = program.getAttribute("normal");
                    const aUV = program.getAttribute("uv");
                    const aColor = params.colorA.needed && program.getAttribute("colorA255");
                    const aMetallicRoughness = program.getAttribute("metallicRoughness");
                    const aFlags = program.getAttribute("flags");
                    const aPickColor = program.getAttribute("pickColor");

                    const aModelMatrixCol0 = instancing && program.getAttribute("modelMatrixCol0");
                    const aModelMatrixCol1 = instancing && program.getAttribute("modelMatrixCol1");
                    const aModelMatrixCol2 = instancing && program.getAttribute("modelMatrixCol2");
                    const aModelNormalMatrixCol0 = instancing && program.getAttribute("modelNormalMatrixCol0");
                    const aModelNormalMatrixCol1 = instancing && program.getAttribute("modelNormalMatrixCol1");
                    const aModelNormalMatrixCol2 = instancing && program.getAttribute("modelNormalMatrixCol2");

                    const uUVDecodeMatrix = params.uvA.needed && program.getLocation("uvDecodeMatrix");

                    return function(frameCtx, layer, sceneModelMat, viewMatrix, projMatrix, rtcOrigin, eye) {
                        const state = layer._state;
                        let offset = 0;
                        const mat4Size = 4 * 4;
                        matricesUniformBlockBufferData.set(sceneModelMat, 0);
                        matricesUniformBlockBufferData.set(viewMatrix, offset += mat4Size);
                        matricesUniformBlockBufferData.set(projMatrix, offset += mat4Size);
                        matricesUniformBlockBufferData.set(state.positionsDecodeMatrix, offset += mat4Size);
                        if (needNormal()) {
                            matricesUniformBlockBufferData.set(layer.model.worldNormalMatrix, offset += mat4Size);
                            matricesUniformBlockBufferData.set(scene.camera.viewNormalMatrix, offset += mat4Size);
                        }

                        gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUniformBlockBuffer);
                        gl.bufferData(gl.UNIFORM_BUFFER, matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

                        gl.bindBufferBase(
                            gl.UNIFORM_BUFFER,
                            matricesUniformBlockBufferBindingPoint,
                            matricesUniformBlockBuffer);


                        if (uUVDecodeMatrix) {
                            gl.uniformMatrix3fv(uUVDecodeMatrix, false, state.uvDecodeMatrix);
                        }

                        if (! drawCallCache.has(layer)) {
                            const vao = gl.createVertexArray();
                            gl.bindVertexArray(vao);

                            const bindAttribute = (a, b, setDivisor) => {
                                a.bindArrayBuffer(b);
                                if (setDivisor) {
                                    gl.vertexAttribDivisor(a.location, 1);
                                }
                            };

                            if (instancing) {
                                bindAttribute(aModelMatrixCol0, state.modelMatrixCol0Buf, true);
                                bindAttribute(aModelMatrixCol1, state.modelMatrixCol1Buf, true);
                                bindAttribute(aModelMatrixCol2, state.modelMatrixCol2Buf, true);
                                aModelNormalMatrixCol0 && bindAttribute(aModelNormalMatrixCol0, state.modelNormalMatrixCol0Buf, true);
                                aModelNormalMatrixCol1 && bindAttribute(aModelNormalMatrixCol1, state.modelNormalMatrixCol1Buf, true);
                                aModelNormalMatrixCol2 && bindAttribute(aModelNormalMatrixCol2, state.modelNormalMatrixCol2Buf, true);
                            }

                            bindAttribute(aPosition, state.positionsBuf);
                            aUV                && bindAttribute(aUV,                state.uvBuf);
                            aNormal            && bindAttribute(aNormal,            state.normalsBuf);
                            aMetallicRoughness && bindAttribute(aMetallicRoughness, state.metallicRoughnessBuf, instancing);
                            aColor             && bindAttribute(aColor,             state.colorsBuf,            instancing && state.colorsBuf && (!state.colorsForPointsNotInstancing));
                            aFlags             && bindAttribute(aFlags,             state.flagsBuf,             instancing);
                            aOffset            && bindAttribute(aOffset,            state.offsetsBuf,           instancing);
                            aPickColor         && bindAttribute(aPickColor,         state.pickColorsBuf,        instancing);

                            const drawer = (function() {
                                // TODO: Use drawElements count and offset to draw only one entity

                                const drawPoints = () => {
                                    if (instancing) {
                                        gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                                    } else {
                                        gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                                    }
                                };

                                const elementsDrawer = (mode, indicesBuf) => {
                                    indicesBuf.bind();
                                    return function() {
                                        const count  = indicesBuf.numItems;
                                        const type   = indicesBuf.itemType;
                                        const offset = 0;
                                        if (instancing) {
                                            gl.drawElementsInstanced(mode, count, type, offset, state.numInstances);
                                        } else {
                                            gl.drawElements(mode, count, type, offset);
                                        }
                                    };
                                };

                                if (primitive === "points") {
                                    return drawPoints;
                                } else if (primitive === "lines") {
                                    if (subGeometry && subGeometry.vertices) {
                                        return drawPoints;
                                    } else {
                                        return elementsDrawer(gl.LINES, state.indicesBuf);
                                    }
                                } else {    // triangles
                                    if (subGeometry && subGeometry.vertices) {
                                        return drawPoints;
                                    } else if (subGeometry) {
                                        return elementsDrawer(gl.LINES, state.edgeIndicesBuf);
                                    } else {
                                        return elementsDrawer(gl.TRIANGLES, state.indicesBuf);
                                    }
                                }
                            })();

                            gl.bindVertexArray(null);

                            drawCallCache.set(layer, function(frameCtx) {
                                gl.bindVertexArray(vao);
                                drawer();
                                gl.bindVertexArray(null);
                            });
                        }

                        drawCallCache.get(layer)(frameCtx);
                    };
                }
            };
        })();

        const vWorldPosition = lazyShaderVariable("vWorldPosition");
        const sliceColorOr   = ((sliceColorEnabled && clipping)
                                ? (function() {
                                    const sliceColorOr = color => {
                                        sliceColorOr.needed = true;
                                        return `(sliced ? sliceColor : ${color})`;
                                    };
                                    return sliceColorOr;
                                })()
                                : (color => color));

        const geoParams = geometry.parameters;

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord", sliceColorOr, geoParams.fragViewMatrix);

        const fragmentClippingLines = (function() {
            const src = [ ];

            if (clipping) {
                if (sliceColorOr.needed) {
                    src.push("  bool sliced = false;");
                }
                src.push("  if (vClippable > 0.0) {");
                src.push("      float dist = " + clipping.getDistance(vWorldPosition) + ";");
                if (clippingCaps) {
                    src.push("  if (dist > (0.002 * vClipPositionW)) { discard; }");
                    src.push("  if (dist > 0.0) { ");
                    src.push("      " + clippingCaps + " = vec4(1.0, 0.0, 0.0, 1.0);");
                    if (getLogDepth) {
                        src.push("  gl_FragDepth = log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
                    }
                    src.push("  return;");
                    src.push("  }");
                } else {
                    src.push("  if (dist > " + (sliceColorOr.needed ? "sliceThickness" : "0.0") + ") {  discard; }");
                }
                if (sliceColorOr.needed) {
                    src.push("  sliced = dist > 0.0;");
                }
                src.push("}");
            }

            return src;
        })();

        const colorA = geoParams.colorA;
        const viewParams = {
            viewPosition: "viewPosition",
            viewMatrix:   geoParams.viewMatrix,
            viewNormal:   geoParams.viewNormal
        };
        const worldPosition = geoParams.worldPosition;

        const vertexOutputs = [ ];
        appendVertexOutputs && appendVertexOutputs(vertexOutputs, colorA, geoParams.pickColorA, geoParams.uvA, geoParams.metallicRoughnessA, "gl_Position", viewParams, geoParams.worldNormal, worldPosition); // worldPosition not used by appendVertexOutputs?

        const flagTest = (isShadowProgram
                          ? `(${geoParams.getFlag(renderPassFlag)} <= 0) || (${colorA}.a < 1.0)`
                          : `${geoParams.getFlag(renderPassFlag)} != renderPass`);

        const afterFlagsColorLines = [
            `if (${flagTest}) {`,
            `   gl_Position = vec4(${vertexCullX || 0.0}, 0.0, 0.0, 0.0);`, // Cull vertex
            "   return;",
            "}"
        ].concat(
            cullOnAlphaZero
                ? [
                    `if (${colorA}.a == 0.0) {`,
                    "   gl_Position = vec4(0.0, 0.0, 0.0, 1.0);", // Cull vertex
                    "   return;",
                    "}"
                ]
                : [ ]
        ).concat(
            filterIntensityRange
                ? [
                    `if ((${colorA}.a < intensityRange[0]) || (${colorA}.a > intensityRange[1])) {`,
                    "   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);", // Cull vertex
                    "   return;",
                    "}"
                ]
                : [ ]);

        const buildVertexShader = () => {
            const src = [];

            if (! isShadowProgram) {
                src.push("uniform int renderPass;");
            }

            if (getLogDepth) {
                src.push("out float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("out float isPerspective;");
                }
            }

            if (clipping) {
                src.push("flat out float vClippable;");
                if (clippingCaps) {
                    src.push("out float vClipPositionW;");
                }
            }

            if (vWorldPosition.needed) {
                src.push(`out highp vec3 ${vWorldPosition};`);
            }

            if (setupPoints) {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            }

            if (filterIntensityRange) {
                src.push("uniform vec2 intensityRange;");
            }

            appendVertexDefinitions && appendVertexDefinitions(src);

            geometry.appendVertexDefinitions(src);

            src.push("void main(void) {");

            geometry.appendVertexData(src, afterFlagsColorLines);

            src.push(`vec4 viewPosition = ${viewParams.viewMatrix} * ${worldPosition};`);

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (vWorldPosition.needed) {
                src.push(`${vWorldPosition} = ${worldPosition}.xyz;`);
            }
            if (clipping) {
                src.push(`vClippable = ${geometry.getClippable()};`);
                if (clippingCaps) {
                    src.push("vClipPositionW = clipPos.w;");
                }
            }

            src.push("gl_Position = " + (transformClipPos ? transformClipPos("clipPos") : "clipPos") + ";");

            if (setupPoints) {
                if (pointsMaterial.perspectivePoints) {
                    src.push("gl_PointSize = (nearPlaneHeight * pointSize) / gl_Position.w;");
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
            } else if (subGeometry && subGeometry.vertices) {
                src.push("gl_PointSize = 1.0;");
            }

            vertexOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const src = [];

            if (getLogDepth) {
                src.push("uniform float logDepthBufFC;");
                src.push("in float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("in float isPerspective;");
                }
            }

            if (vWorldPosition.needed) {
                src.push(`in highp vec3 ${vWorldPosition};`);
            }
            if (clipping) {
                src.push("flat in float vClippable;");
                if (clippingCaps) {
                    src.push("in float vClipPositionW;");
                }
                clipping.appendDefinitions(src);
                if (sliceColorOr.needed) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
            }

            geometry.appendFragmentDefinitions(src);

            appendFragmentDefinitions(src);

            src.push("void main(void) {");

            if (setupPoints && pointsMaterial.roundPoints) {
                src.push(`  vec2 cxy = 2.0 * gl_PointCoord - 1.0;`);
                src.push("  float r = dot(cxy, cxy);");
                src.push("  if (r > 1.0) {");
                src.push("       discard;");
                src.push("  }");
            }

            fragmentClippingLines.forEach(line => src.push(line));

            if (getLogDepth) {
                src.push("gl_FragDepth = " + (testPerspectiveForGl_FragDepth ? "isPerspective == 0.0 ? gl_FragCoord.z : " : "") + "log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
            }

            fragmentOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };

        const preamble = (type) => [
            "#version 300 es",
            "// " + primitive + " " + methodName + " " + programName + " " + type + " shader",
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
            vertex:   preamble("vertex"  ).concat(buildVertexShader()),
            fragment: preamble("fragment").concat(buildFragmentShader())
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        const drawCall = geometry.makeDrawCall(program);

        const uRenderPass = (! isShadowProgram) && program.getLocation("renderPass");
        const uLogDepthBufFC = getLogDepth && program.getLocation("logDepthBufFC");
        const setClippingState = clipping && clipping.setupInputs(program);
        const uSlice = sliceColorOr.needed && {
            thickness: program.getLocation("sliceThickness"),
            color:     program.getLocation("sliceColor")
        };
        const uPoint = setupPoints && {
            pointSize:       program.getLocation("pointSize"),
            nearPlaneHeight: pointsMaterial.perspectivePoints && program.getLocation("nearPlaneHeight")
        };
        const uIntensityRange = filterIntensityRange && program.getLocation("intensityRange");

        const setInputsState = setupInputs && setupInputs(program);

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            if (uRenderPass) {
                gl.uniform1i(uRenderPass, renderPass);
            }

            if (setClippingState) {
                setClippingState(layer);
                const crossSections = uSlice && scene.crossSections;
                if (crossSections) {
                    gl.uniform1f(uSlice.thickness, crossSections.sliceThickness);
                    gl.uniform4fv(uSlice.color,    crossSections.sliceColor);
                }
            }

            if (uPoint) {
                gl.uniform1f(uPoint.pointSize, pointsMaterial.pointSize);
                if (uPoint.nearPlaneHeight) {
                    const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                          1.0
                          : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                    gl.uniform1f(uPoint.nearPlaneHeight, nearPlaneHeight);
                }
            }

            if (uIntensityRange) {
                gl.uniform2f(uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
            }

            setInputsState && setInputsState(frameCtx, layer._state.textureSet);

            const model = layer.model;
            const origin = layer._state.origin;
            const {position, rotationMatrix} = model;

            const camera = scene.camera;
            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;
            const eye        = (usePickParams && frameCtx.pickOrigin) || scene.camera.eye;
            const far        = (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far;

            if (uLogDepthBufFC) {
                gl.uniform1f(uLogDepthBufFC, 2.0 / (Math.log(far + 1.0) / Math.LN2));
            }

            let rtcViewMatrix;
            const rtcOrigin = tempVec3a;
            rtcOrigin.set([0, 0, 0]);

            const gotOrigin = (origin[0] !== 0 || origin[1] !== 0 || origin[2] !== 0);
            const gotPosition = (position[0] !== 0 || position[1] !== 0 || position[2] !== 0);
            if (gotOrigin || gotPosition) {
                if (gotOrigin) {
                    math.transformPoint3(rotationMatrix, origin, rtcOrigin);
                }
                math.addVec3(rtcOrigin, position, rtcOrigin);
                rtcViewMatrix = createRTCViewMat(viewMatrix, rtcOrigin, tempMat4a);
            } else {
                rtcViewMatrix = viewMatrix;
            }

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            drawCall(frameCtx, layer, rotationMatrix, rtcViewMatrix, projMatrix, rtcOrigin, eye);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
