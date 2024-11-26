import {createRTCViewMat, getPlaneRTCPos} from "../../math/rtcCoords.js";
import {math} from "../../math/math.js";
import {Program} from "../../webgl/Program.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class VBORenderer {
    constructor(scene, instancing, primitive, cfg, subGeometry) {

        const pointsMaterial = scene.pointsMaterial;

        const programName               = cfg.programName;
        const incrementDrawState        = cfg.incrementDrawState;
        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = cfg.clippingCaps;
        const renderPassFlag            = cfg.renderPassFlag;
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

        const getHash = () => [ scene._sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;

        const sectionPlanesState = scene._sectionPlanesState;
        const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();
        const clipping = numAllocatedSectionPlanes > 0;


        const lazyShaderVariable = function(name) {
            const variable = {
                toString: () => {
                    variable.needed = true;
                    return name;
                }
            };
            return variable;
        };

        const vWorldPosition = lazyShaderVariable("vWorldPosition");
        const fragViewMatrix = lazyShaderVariable("viewMatrix");
        const sliceColorOr   = (clipping
                                ? (function() {
                                    const sliceColorOr = color => {
                                        sliceColorOr.needed = true;
                                        return `(sliced ? sliceColor : ${color})`;
                                    };
                                    return sliceColorOr;
                                })()
                                : (color => color));

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord", sliceColorOr, fragViewMatrix);

        const fragmentClippingLines = (function() {
            const src = [ ];

            if (clipping) {
                if (sliceColorOr.needed) {
                    src.push("  bool sliced = false;");
                }
                src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
                src.push("  if (clippable) {");
                src.push("      float dist = 0.0;");
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    src.push("      if (sectionPlaneActive" + i + ") {");
                    src.push(`          dist += clamp(dot(-sectionPlaneDir${i}.xyz, ${vWorldPosition} - sectionPlanePos${i}.xyz), 0.0, 1000.0);`);
                    src.push("      }");
                }
                if (clippingCaps) {
                    src.push("  if (dist > (0.002 * vClipPosition.w)) {");
                    src.push("      discard;");
                    src.push("  }");
                    src.push("  if (dist > 0.0) { ");
                    src.push("      " + clippingCaps + " = vec4(1.0, 0.0, 0.0, 1.0);");
                    if (getLogDepth) {
                        src.push("  gl_FragDepth = log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
                    }
                    src.push("  return;");
                    src.push("}");
                } else {
                    src.push("       if (dist > " + (sliceColorOr.needed ? "sliceThickness" : "0.0") + ") {  discard; }");
                }
                if (sliceColorOr.needed) {
                    src.push("  sliced = dist > 0.0;");
                }
                src.push("}");
            }

            return src;
        })();

        const colorA             = lazyShaderVariable("aColor");
        const pickColorA         = lazyShaderVariable("pickColor");
        const uvA                = lazyShaderVariable("aUv");
        const metallicRoughnessA = lazyShaderVariable("metallicRoughness");
        const viewParams  = {
            viewPosition: "viewPosition",
            viewMatrix:   "viewMatrix",
            viewNormal:   lazyShaderVariable("viewNormal")
        };
        const worldNormal = lazyShaderVariable("worldNormal");

        const vertexOutputs = [ ];
        appendVertexOutputs && appendVertexOutputs(vertexOutputs, colorA, pickColorA, uvA, metallicRoughnessA, "gl_Position", viewParams, worldNormal, "worldPosition");

        const needNormal = viewParams.viewNormal.needed || worldNormal.needed;


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

        const addMatricesUniformBlockLines = (src) => {
            src.push("uniform Matrices {");
            src.push("    mat4 worldMatrix;");
            src.push("    mat4 viewMatrix;");
            src.push("    mat4 projMatrix;");
            src.push("    mat4 positionsDecodeMatrix;");
            if (needNormal) {
                src.push("    mat4 worldNormalMatrix;");
                src.push("    mat4 viewNormalMatrix;");
            }
            src.push("};");
            return src;
        };

        const buildVertexShader = () => {
            const src = [];

            src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
            src.push("precision highp float;");
            src.push("precision highp int;");
            src.push("precision highp usampler2D;");
            src.push("precision highp isampler2D;");
            src.push("precision highp sampler2D;");
            src.push("#else");
            src.push("precision mediump float;");
            src.push("precision mediump int;");
            src.push("precision mediump usampler2D;");
            src.push("precision mediump isampler2D;");
            src.push("precision mediump sampler2D;");
            src.push("#endif");

            if (! isShadowProgram) {
                src.push("uniform int renderPass;");
            }
            src.push("in vec3 position;");
            if (needNormal) {
                src.push("in vec3 normal;");
            }
            if (colorA.needed || isShadowProgram || filterIntensityRange) {
                src.push("in vec4 aColor;");
            }
            if (pickColorA.needed) {
                src.push("in vec4 pickColor;");
            }
            if (uvA.needed) {
                src.push("in vec2 uv;");
                src.push("uniform mat3 uvDecodeMatrix;");
            }
            if (metallicRoughnessA.needed) {
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
                if (needNormal) {
                    src.push("in vec4 modelNormalMatrixCol0;");
                    src.push("in vec4 modelNormalMatrixCol1;");
                    src.push("in vec4 modelNormalMatrixCol2;");
                }
            }

            addMatricesUniformBlockLines(src);

            if (getLogDepth) { // && (! isShadowProgram)) { // likely shouldn't be testing isShadowProgram, perhaps an earlier overlook
                src.push("out float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("out float isPerspective;");
                }
            }

            if (vWorldPosition.needed) {
                src.push(`out highp vec3 ${vWorldPosition};`);
            }
            if (clipping) {
                src.push("out float vFlags;");
                if (clippingCaps) {
                    src.push("out vec4 vClipPosition;");
                }
            }

            if (needNormal) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
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

            src.push("void main(void) {");

            if (isShadowProgram) {
                src.push(`if (((int(flags) >> ${renderPassFlag * 4} & 0xF) <= 0) || ((float(aColor.a) / 255.0) < 1.0)) {`);
            } else {
                src.push(`if ((int(flags) >> ${renderPassFlag * 4} & 0xF) != renderPass) {`);
            }
            src.push(`   gl_Position = vec4(${vertexCullX || 0.0}, 0.0, 0.0, 0.0);`); // Cull vertex
            src.push("} else {");
            if (filterIntensityRange) {
                src.push("float intensity = float(aColor.a) / 255.0;");
                src.push("if ((intensity < intensityRange[0]) || (intensity > intensityRange[1])) {");
                src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
                src.push("   return;");
                src.push("}");
            }
            if (instancing) {
                src.push("vec4 worldPosition4 = positionsDecodeMatrix * vec4(position, 1.0);");
                src.push("worldPosition4 = worldMatrix * vec4(dot(worldPosition4, modelMatrixCol0), dot(worldPosition4, modelMatrixCol1), dot(worldPosition4, modelMatrixCol2), 1.0);");
            } else {
                src.push("vec4 worldPosition4 = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0));");
            }
            if (scene.entityOffsetsEnabled) {
                src.push("worldPosition4.xyz = worldPosition4.xyz + offset;");
            }
            src.push("vec3 worldPosition = worldPosition4.xyz;");
            src.push("vec4 viewPosition = viewMatrix * worldPosition4;");

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) { // && (! isShadowProgram)) { // see comment above
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (vWorldPosition.needed) {
                src.push(`${vWorldPosition} = worldPosition;`);
            }
            if (clipping) {
                src.push("vFlags = flags;");
                if (clippingCaps) {
                    src.push("vClipPosition = clipPos;");
                }
            }

            src.push("gl_Position = " + (transformClipPos ? transformClipPos("clipPos") : "clipPos") + ";");

            if (needNormal) {
                src.push("vec4 modelNormal = vec4(octDecode(normal.xy), 0.0);");
                if (instancing) {
                    src.push("modelNormal = vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
                }
                src.push(`vec3 ${worldNormal} = (worldNormalMatrix * modelNormal).xyz;`);
                if (viewParams.viewNormal.needed) {
                    src.push(`vec3 viewNormal = normalize((viewNormalMatrix * vec4(${worldNormal}, 0.0)).xyz);`);
                }
            }

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

            if (uvA.needed) {
                src.push(`vec2 ${uvA} = (uvDecodeMatrix * vec3(uv, 1.0)).xy;`);
            }

            vertexOutputs.forEach(line => src.push(line));

            src.push("}");
            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const src = [];
            src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
            src.push("precision highp float;");
            src.push("precision highp int;");
            src.push("#else");
            src.push("precision mediump float;");
            src.push("precision mediump int;");
            src.push("#endif");

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
                src.push("in float vFlags;");
                if (clippingCaps) {
                    src.push("in vec4 vClipPosition;");
                }
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    src.push("uniform bool sectionPlaneActive" + i + ";");
                    src.push("uniform vec3 sectionPlanePos" + i + ";");
                    src.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
                if (sliceColorOr.needed) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
            }

            if (fragViewMatrix.needed) {
                addMatricesUniformBlockLines(src);
            }

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

        const preamble = (type, src) => [
            "#version 300 es",
            "// " + primitive + " " + (instancing ? "instancing" : "batching") + " " + programName + " " + type + " shader"
        ].concat(src);

        const program = new Program(gl, {
            vertex:   preamble("vertex",   buildVertexShader()),
            fragment: preamble("fragment", buildFragmentShader())
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        const uRenderPass = (! isShadowProgram) && program.getLocation("renderPass");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            matricesUniformBlockBufferBindingPoint);

        const uSectionPlanes = [];
        for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
            uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        const uSliceThickness = clipping && sliceColorOr.needed && program.getLocation("sliceThickness");
        const uSliceColor     = clipping && sliceColorOr.needed && program.getLocation("sliceColor");

        const aPosition = program.getAttribute("position");
        const aOffset = program.getAttribute("offset");
        const aNormal = program.getAttribute("normal");
        const aUV = program.getAttribute("uv");
        const aColor = program.getAttribute("aColor");
        const aMetallicRoughness = program.getAttribute("metallicRoughness");
        const aFlags = program.getAttribute("flags");
        const aPickColor = program.getAttribute("pickColor");

        const aModelMatrixCol0 = instancing && program.getAttribute("modelMatrixCol0");
        const aModelMatrixCol1 = instancing && program.getAttribute("modelMatrixCol1");
        const aModelMatrixCol2 = instancing && program.getAttribute("modelMatrixCol2");
        const aModelNormalMatrixCol0 = instancing && program.getAttribute("modelNormalMatrixCol0");
        const aModelNormalMatrixCol1 = instancing && program.getAttribute("modelNormalMatrixCol1");
        const aModelNormalMatrixCol2 = instancing && program.getAttribute("modelNormalMatrixCol2");

        const uUVDecodeMatrix = uvA.needed && program.getLocation("uvDecodeMatrix");

        const uLogDepthBufFC = getLogDepth && program.getLocation("logDepthBufFC");

        const uIntensityRange = filterIntensityRange && program.getLocation("intensityRange");

        const uPointSize       = setupPoints && program.getLocation("pointSize");
        const uNearPlaneHeight = setupPoints && pointsMaterial.perspectivePoints && program.getLocation("nearPlaneHeight");

        const setInputsState = setupInputs && setupInputs(program);

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            frameCtx.textureUnit = 0;

            const model = layer.model;
            const state = layer._state;
            const origin = state.origin;
            const positionsDecodeMatrix = state.positionsDecodeMatrix;
            const {position, rotationMatrix} = model;
            const {camera} = model.scene;
            const {project} = camera;
            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || frameCtx.pickViewMatrix || camera.viewMatrix;

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

            let offset = 0;
            const mat4Size = 4 * 4;
            matricesUniformBlockBufferData.set(rotationMatrix, 0);
            matricesUniformBlockBufferData.set(rtcViewMatrix, offset += mat4Size);
            matricesUniformBlockBufferData.set((isShadowProgram && frameCtx.shadowProjMatrix) || frameCtx.pickProjMatrix || project.matrix, offset += mat4Size);
            matricesUniformBlockBufferData.set(positionsDecodeMatrix, offset += mat4Size);
            if (needNormal) {
                matricesUniformBlockBufferData.set(model.worldNormalMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(camera.viewNormalMatrix, offset += mat4Size);
            }

            gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUniformBlockBuffer);
            gl.bufferData(gl.UNIFORM_BUFFER, matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

            gl.bindBufferBase(
                gl.UNIFORM_BUFFER,
                matricesUniformBlockBufferBindingPoint,
                matricesUniformBlockBuffer);


            if (clipping) {
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                const numSectionPlanes = sectionPlanes.length;
                const baseIndex = layer.layerIndex * numSectionPlanes;
                const renderFlags = model.renderFlags;
                for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                    const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
                    if (sectionPlaneUniforms) {
                        if (sectionPlaneIndex < numSectionPlanes) {
                            const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                            gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                            if (active) {
                                const sectionPlane = sectionPlanes[sectionPlaneIndex];
                                const origin = layer._state.origin;
                                if (origin) {
                                    const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3b, model.matrix);
                                    gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                                } else {
                                    gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                                }
                                gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                            }
                        } else {
                            gl.uniform1i(sectionPlaneUniforms.active, 0);
                        }
                    }
                }
                const crossSections = sliceColorOr.needed && scene.crossSections;
                if (crossSections) {
                    gl.uniform1f(uSliceThickness, crossSections.sliceThickness);
                    gl.uniform4fv(uSliceColor,    crossSections.sliceColor);
                }
            }

            if (uRenderPass) {
                gl.uniform1i(uRenderPass, renderPass);
            }

            if (uUVDecodeMatrix) {
                gl.uniformMatrix3fv(uUVDecodeMatrix, false, state.uvDecodeMatrix);
            }

            if (uLogDepthBufFC) {
                gl.uniform1f(uLogDepthBufFC, 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2)); // TODO: Far from pick project matrix?
            }

            if (uIntensityRange) {
                gl.uniform2f(uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
            }

            if (uPointSize) {
                gl.uniform1f(uPointSize, pointsMaterial.pointSize);
            }

            if (uNearPlaneHeight) {
                const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                      1.0
                      : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                gl.uniform1f(uNearPlaneHeight, nearPlaneHeight);
            }

            setInputsState && setInputsState(frameCtx, state.textureSet);

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
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
                        } else if (subGeometry && state.edgeIndicesBuf) {
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

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
