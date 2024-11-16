import {createRTCViewMat, getPlaneRTCPos} from "../../math/rtcCoords.js";
import {math} from "../../math/math.js";
import {Program} from "../../webgl/Program.js";
import {WEBGL_INFO} from "../../webglInfo.js";
import {RENDER_PASSES} from "./../RENDER_PASSES.js";

const defaultColor = new Float32Array([1, 1, 1, 1]);
const edgesDefaultColor = new Float32Array([0, 0, 0, 1]);

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempMat4a = math.mat4();

const SNAPPING_LOG_DEPTH_BUF_ENABLED = true; // Improves occlusion accuracy at distance

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class VBORenderer {
    constructor(scene, instancing, primitive, withSAO = false, cfg) {

        const getHash = () => [ scene._sectionPlanesState.getHash() ].concat(cfg.getHash()).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const progMode                  = cfg.progMode;
        const edges                     = cfg.edges;
        const useAlphaCutoff            = cfg.useAlphaCutoff;
        const colorUniform              = cfg.colorUniform;
        const incrementDrawState        = cfg.incrementDrawState;

        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = cfg.clippingCaps;
        const renderPassFlag            = cfg.renderPassFlag;
        const appendVertexDefinitions   = cfg.appendVertexDefinitions;
        const filterIntensityRange      = cfg.filterIntensityRange;
        const transformClipPos          = cfg.transformClipPos;
        const shadowParameters          = cfg.shadowParameters;
        const needVertexColor           = cfg.needVertexColor;
        const needPickColor             = cfg.needPickColor;
        const needGl_Position           = cfg.needGl_Position;
        const needViewPosition          = cfg.needViewPosition;
        const needViewMatrixNormal      = cfg.needViewMatrixNormal;
        const needWorldNormal           = cfg.needWorldNormal;
        const needWorldPosition         = cfg.needWorldPosition;
        const appendVertexOutputs       = cfg.appendVertexOutputs;
        const appendFragmentDefinitions = cfg.appendFragmentDefinitions;
        const sectionDiscardThreshold   = cfg.sectionDiscardThreshold;
        const needSliced                = cfg.needSliced;
        const needvWorldPosition        = cfg.needvWorldPosition;
        const needGl_FragCoord          = cfg.needGl_FragCoord;
        const needViewMatrixInFragment  = cfg.needViewMatrixInFragment;
        const needGl_PointCoord         = cfg.needGl_PointCoord;
        const appendFragmentOutputs     = cfg.appendFragmentOutputs;
        const vertexCullX               = cfg.vertexCullX;

        const isSnap = (progMode === "snapInitMode") || (progMode === "snapMode");
        const testPerspectiveForGl_FragDepth = ((primitive !== "points") && (primitive !== "lines")) || isSnap;

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
        const vaoCache = new WeakMap();

        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;

        const sectionPlanesState = scene._sectionPlanesState;
        const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;

        const addMatricesUniformBlockLines = (src, normals) => {
            src.push("uniform Matrices {");
            src.push("    mat4 worldMatrix;");
            src.push("    mat4 viewMatrix;");
            src.push("    mat4 projMatrix;");
            src.push("    mat4 positionsDecodeMatrix;");
            if (normals) {
                src.push("    mat4 worldNormalMatrix;");
                src.push("    mat4 viewNormalMatrix;");
            }
            src.push("};");
            return src;
        };

        const buildVertexShader = () => {
            const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
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

            if (! shadowParameters) {
                src.push("uniform int renderPass;");
            }
            src.push("in vec3 position;");
            if (needViewMatrixNormal || needWorldNormal) {
                src.push("in vec3 normal;");
            }
            if (needVertexColor || shadowParameters || filterIntensityRange) {
                src.push("in vec4 color;");
            }
            if (needPickColor) {
                src.push("in vec4 pickColor;");
            }
            src.push("in float flags;");
            if (scene.entityOffsetsEnabled) {
                src.push("in vec3 offset;");
            }

            if (instancing) {
                src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
                src.push("in vec4 modelMatrixCol1;");
                src.push("in vec4 modelMatrixCol2;");
                if (needViewMatrixNormal || needWorldNormal) {
                    src.push("in vec4 modelNormalMatrixCol0;");
                    src.push("in vec4 modelNormalMatrixCol1;");
                    src.push("in vec4 modelNormalMatrixCol2;");
                }
            }

            addMatricesUniformBlockLines(src, needViewMatrixNormal || needWorldNormal);

            if (getLogDepth && (! shadowParameters)) { // likely shouldn't be testing shadowParameters, perhaps an earlier overlook
                src.push("out float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("out float isPerspective;");
                }
            }

            if (needvWorldPosition || clipping) {
                src.push("out " + (needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
            }
            if (clipping) {
                src.push("out float vFlags;");
                if (clippingCaps) {
                    src.push("out vec4 vClipPosition;");
                }
            }

            if (needViewMatrixNormal || needWorldNormal) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
            }

            appendVertexDefinitions(src);

            src.push("void main(void) {");

            if (shadowParameters) {
                src.push(`if (((int(flags) >> ${renderPassFlag * 4} & 0xF) <= 0) || ((float(color.a) / 255.0) < 1.0)) {`);
            } else {
                src.push(`if ((int(flags) >> ${renderPassFlag * 4} & 0xF) != renderPass) {`);
            }
            src.push(`   gl_Position = vec4(${vertexCullX || 0.0}, 0.0, 0.0, 0.0);`); // Cull vertex
            src.push("} else {");
            if (filterIntensityRange) {
                src.push("float intensity = float(color.a) / 255.0;");
                src.push("if ((intensity < " + filterIntensityRange + "[0]) || (intensity > " + filterIntensityRange + "[1])) {");
                src.push(`   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);`); // Cull vertex
                src.push("   return;");
                src.push("}");
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
            src.push("vec4 viewPosition = " + (shadowParameters ? shadowParameters.viewMatrix : "viewMatrix") + " * worldPosition;");

            src.push("vec4 clipPos = " + (shadowParameters ? shadowParameters.projMatrix : "projMatrix") + " * viewPosition;");
            if (getLogDepth && (! shadowParameters)) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (needvWorldPosition || clipping) {
                src.push("vWorldPosition = worldPosition;");
            }
            if (clipping) {
                src.push("vFlags = flags;");
                if (clippingCaps) {
                    src.push("vClipPosition = clipPos;");
                }
            }

            src.push("gl_Position = " + transformClipPos("clipPos") + ";");

            if (needViewMatrixNormal || needWorldNormal) {
                if (instancing) {
                    src.push("vec4 modelNormal = vec4(octDecode(normal.xy), 0.0);");
                    src.push("vec4 worldNormal = worldNormalMatrix * vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
                } else {
                    src.push("vec4 worldNormal = worldNormalMatrix * vec4(octDecode(normal.xy), 0.0);");
                }
                if (needViewMatrixNormal) {
                    src.push("vec3 viewNormal = normalize((viewNormalMatrix * worldNormal).xyz);");
                }
            }

            appendVertexOutputs(src, needVertexColor && "color", needPickColor && "pickColor", needGl_Position && "gl_Position", (needViewPosition || needViewMatrixNormal) && {viewPosition: needViewPosition && "viewPosition", viewMatrix: needViewMatrixNormal && "viewMatrix", viewNormal: needViewMatrixNormal && "viewNormal"}, needWorldNormal && "worldNormal", needWorldPosition && "worldPosition");

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

            if (needvWorldPosition || clipping) {
                src.push("in " + (needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
            }
            if (clipping) {
                src.push("in float vFlags;");
                if (clippingCaps) {
                    src.push("in vec4 vClipPosition;");
                }
                for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                    src.push("uniform bool sectionPlaneActive" + i + ";");
                    src.push("uniform vec3 sectionPlanePos" + i + ";");
                    src.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
            }

            if (needViewMatrixInFragment) {
                addMatricesUniformBlockLines(src, needViewMatrixNormal || needWorldNormal); // if false then WebGL error "Interface block `Matrices` is not linkable between attached shaders."
            }

            appendFragmentDefinitions(src);

            src.push("void main(void) {");
            if (needSliced) {
                src.push("  bool sliced = false;");
            }
            if (clipping) {
                src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
                src.push("  if (clippable) {");
                src.push("      float dist = 0.0;");
                for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                    src.push("      if (sectionPlaneActive" + i + ") {");
                    src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
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
                    src.push("       if (dist > " + sectionDiscardThreshold + ") {  discard; }");
                }
                if (needSliced) {
                    src.push("  sliced = dist > 0.0;");
                }
                src.push("}");
            }

            if (getLogDepth) {
                src.push("gl_FragDepth = " + (testPerspectiveForGl_FragDepth ? "isPerspective == 0.0 ? gl_FragCoord.z : " : "") + "log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
            }

            appendFragmentOutputs(src, needvWorldPosition && "vWorldPosition", needGl_FragCoord && "gl_FragCoord", needSliced && "sliced", needViewMatrixInFragment && "viewMatrix", needGl_PointCoord && "gl_PointCoord");

            src.push("}");
            return src;
        };

        const preamble = (type, src) => [
            "#version 300 es",
            "// " + primitive + " " + (instancing ? "instancing" : "batching") + " " + progMode + " " + type + " shader"
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

        const uRenderPass = program.getLocation("renderPass");

        // some shader may have color as attribute, in this case the uniform must be renamed silhouetteColor
        const uColor = program.getLocation("color") || program.getLocation("silhouetteColor");
        const uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
        const uGammaFactor = program.getLocation("gammaFactor");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            matricesUniformBlockBufferBindingPoint);

        const uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        const uShadowProjMatrix = program.getLocation("shadowProjMatrix");

        const uLightAmbient = program.getLocation("lightAmbient");
        const uLightColor = [];
        const uLightDir = [];
        const uLightPos = [];
        const uLightAttenuation = [];

        // TODO add a gard to prevent light params if not affected by light ?
        const lights = lightsState.lights;
        let light;

        for (let i = 0, len = lights.length; i < len; i++) {
            light = lights[i];
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

        const uReflectionMap = (lightsState.reflectionMaps.length > 0) && "reflectionMap";
        const uLightMap = (lightsState.lightMaps.length > 0) && "lightMap";

        const uSectionPlanes = [];

        for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        const aPosition = program.getAttribute("position");
        const aOffset = program.getAttribute("offset");
        const aNormal = program.getAttribute("normal");
        const aUV = program.getAttribute("uv");
        const aColor = program.getAttribute("color");
        const aMetallicRoughness = program.getAttribute("metallicRoughness");
        const aFlags = program.getAttribute("flags");
        const aPickColor = program.getAttribute("pickColor");
        const uPickZNear = program.getLocation("pickZNear");
        const uPickZFar = program.getLocation("pickZFar");
        const uPickClipPos = program.getLocation("pickClipPos");
        const uDrawingBufferSize = program.getLocation("drawingBufferSize");

        const uColorMap = "uColorMap";
        const uMetallicRoughMap = "uMetallicRoughMap";
        const uEmissiveMap = "uEmissiveMap";
        const uNormalMap = "uNormalMap";
        const uAOMap = "uAOMap";

        const aModelMatrixCol0 = instancing && program.getAttribute("modelMatrixCol0");
        const aModelMatrixCol1 = instancing && program.getAttribute("modelMatrixCol1");
        const aModelMatrixCol2 = instancing && program.getAttribute("modelMatrixCol2");
        const aModelNormalMatrixCol0 = instancing && program.getAttribute("modelNormalMatrixCol0");
        const aModelNormalMatrixCol1 = instancing && program.getAttribute("modelNormalMatrixCol1");
        const aModelNormalMatrixCol2 = instancing && program.getAttribute("modelNormalMatrixCol2");

        const uOcclusionTexture = withSAO && "uOcclusionTexture";
        const uSAOParams = withSAO && program.getLocation("uSAOParams");

        const alphaCutoffLocation = useAlphaCutoff && program.getLocation("materialAlphaCutoff");

        const uLogDepthBufFC = (isSnap || scene.logarithmicDepthBufferEnabled) && program.getLocation("logDepthBufFC");

        const uIntensityRange = filterIntensityRange && program.getLocation(filterIntensityRange);

        const uPointSize = program.getLocation("pointSize");
        const uNearPlaneHeight = program.getLocation("nearPlaneHeight");

        const uSliceColor = scene.crossSections && program.getLocation("sliceColor");
        const uSliceThickness = scene.crossSections && program.getLocation("sliceThickness");

        const uVectorA = isSnap && program.getLocation("snapVectorA");
        const uInverseVectorAB = isSnap && program.getLocation("snapInvVectorAB");
        const uLayerNumber = isSnap && program.getLocation("layerNumber");
        const uCoordinateScaler = isSnap && program.getLocation("coordinateScaler");

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
            const viewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;

            if (uLightAmbient) {
                gl.uniform4fv(uLightAmbient, lightsState.getAmbientColorAndIntensity());
            }

            if (uGammaFactor) {
                gl.uniform1f(uGammaFactor, scene.gammaFactor);
            }

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

            if (vaoCache.has(layer)) {
                gl.bindVertexArray(vaoCache.get(layer));
            } else {
                const vao = gl.createVertexArray();
                gl.bindVertexArray(vao);
                if (instancing) {
                    aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
                    aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
                    aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);

                    gl.vertexAttribDivisor(aModelMatrixCol0.location, 1);
                    gl.vertexAttribDivisor(aModelMatrixCol1.location, 1);
                    gl.vertexAttribDivisor(aModelMatrixCol2.location, 1);

                    if (aModelNormalMatrixCol0) {
                        aModelNormalMatrixCol0.bindArrayBuffer(state.modelNormalMatrixCol0Buf);
                        gl.vertexAttribDivisor(aModelNormalMatrixCol0.location, 1);
                    }
                    if (aModelNormalMatrixCol1) {
                        aModelNormalMatrixCol1.bindArrayBuffer(state.modelNormalMatrixCol1Buf);
                        gl.vertexAttribDivisor(aModelNormalMatrixCol1.location, 1);
                    }
                    if (aModelNormalMatrixCol2) {
                        aModelNormalMatrixCol2.bindArrayBuffer(state.modelNormalMatrixCol2Buf);
                        gl.vertexAttribDivisor(aModelNormalMatrixCol2.location, 1);
                    }

                }

                aPosition.bindArrayBuffer(state.positionsBuf);

                if (aUV) {
                    aUV.bindArrayBuffer(state.uvBuf);
                }

                if (aNormal) {
                    aNormal.bindArrayBuffer(state.normalsBuf);
                }

                if (aMetallicRoughness) {
                    aMetallicRoughness.bindArrayBuffer(state.metallicRoughnessBuf);
                    if (instancing) {
                        gl.vertexAttribDivisor(aMetallicRoughness.location, 1);
                    }
                }

                if (aColor) {
                    aColor.bindArrayBuffer(state.colorsBuf);
                    if (instancing && state.colorsBuf && (!state.colorsForPointsNotInstancing)) {
                        gl.vertexAttribDivisor(aColor.location, 1);
                    }
                }

                if (aFlags) {
                    aFlags.bindArrayBuffer(state.flagsBuf);
                    if (instancing) {
                        gl.vertexAttribDivisor(aFlags.location, 1);
                    }
                }

                if (aOffset) {
                    aOffset.bindArrayBuffer(state.offsetsBuf);
                    if (instancing) {
                        gl.vertexAttribDivisor(aOffset.location, 1);
                    }
                }

                if (aPickColor) {
                    aPickColor.bindArrayBuffer(state.pickColorsBuf);
                    if (instancing) {
                        gl.vertexAttribDivisor(aPickColor.location, 1);
                    }
                }

                if (edges && state.edgeIndicesBuf) {
                    state.edgeIndicesBuf.bind();
                } else {
                    if (state.indicesBuf) {
                        state.indicesBuf.bind();
                    }
                }
                vaoCache.set(layer, vao);
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

            let offset = 0;
            const mat4Size = 4 * 4;
            matricesUniformBlockBufferData.set(rotationMatrix, 0);
            matricesUniformBlockBufferData.set(rtcViewMatrix, offset += mat4Size);
            matricesUniformBlockBufferData.set(frameCtx.pickProjMatrix || project.matrix, offset += mat4Size);
            matricesUniformBlockBufferData.set(positionsDecodeMatrix, offset += mat4Size);
            if (! isSnap) {
                matricesUniformBlockBufferData.set(model.worldNormalMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(camera.viewNormalMatrix, offset += mat4Size);
            }

            gl.bindBuffer(gl.UNIFORM_BUFFER, matricesUniformBlockBuffer);
            gl.bufferData(gl.UNIFORM_BUFFER, matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

            gl.bindBufferBase(
                gl.UNIFORM_BUFFER,
                matricesUniformBlockBufferBindingPoint,
                matricesUniformBlockBuffer);


            const sectionPlanes = sectionPlanesState.sectionPlanes;
            const numSectionPlanes = sectionPlanes.length;
            if (numAllocatedSectionPlanes > 0) {
                const baseIndex = layer.layerIndex * numSectionPlanes;
                const renderFlags = model.renderFlags;
                if (scene.crossSections) {
                    gl.uniform4fv(uSliceColor, scene.crossSections.sliceColor);
                    gl.uniform1f(uSliceThickness, scene.crossSections.sliceThickness);
                }
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
            }


            if (uShadowViewMatrix) {
                gl.uniformMatrix4fv(uShadowViewMatrix, false, frameCtx.shadowViewMatrix); // Not tested
            }
            if (uShadowProjMatrix) {
                gl.uniformMatrix4fv(uShadowProjMatrix, false, frameCtx.shadowProjMatrix); // Not tested
            }

            if (scene.logarithmicDepthBufferEnabled || (isSnap && SNAPPING_LOG_DEPTH_BUF_ENABLED)) {
                if (uLogDepthBufFC) {
                    const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
                    gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
                }
            }

            if (isSnap) {
                const aabb = layer.aabb; // Per-layer AABB for best RTC accuracy
                const coordinateScaler = tempVec3c;
                coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
                coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
                coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;

                frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
                frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
                frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];

                gl.uniform3fv(uCoordinateScaler, coordinateScaler);
                gl.uniform2fv(uVectorA, frameCtx.snapVectorA);
                gl.uniform2fv(uInverseVectorAB, frameCtx.snapInvVectorAB);
                gl.uniform1i(uLayerNumber, frameCtx.snapPickLayerNumber);
                gl.uniform1i(uRenderPass, renderPass);
                if (uPointSize) {
                    gl.uniform1f(uPointSize, 1.0);
                }

                //=============================================================
                // TODO: Use drawElements count and offset to draw only one entity
                //=============================================================

                if ((progMode === "snapInitMode") && (primitive !== "points")) {
                    state.indicesBuf.bind();
                    const mode = (primitive === "lines") ? gl.LINES : gl.TRIANGLES;
                    if (instancing) {
                        gl.drawElementsInstanced(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                    } else {
                        gl.drawElements(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                    }
                    state.indicesBuf.unbind();
                } else if ((frameCtx.snapMode === "edge") && (primitive !== "points")) {
                    const indicesBuf = ((primitive !== "lines") && state.edgeIndicesBuf) || state.indicesBuf;
                    indicesBuf.bind();
                    if (instancing) {
                        gl.drawElementsInstanced(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0, state.numInstances);
                    } else {
                        gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);
                    }
                    indicesBuf.unbind(); // needed?
                } else {
                    if (instancing) {
                        gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                    } else {
                        gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                    }
                }

            } else {                // ! isSnap

                gl.uniform1i(uRenderPass, renderPass);

                if (uPickZNear) {
                    gl.uniform1f(uPickZNear, frameCtx.pickZNear);
                }

                if (uPickZFar) {
                    gl.uniform1f(uPickZFar, frameCtx.pickZFar);
                }

                if (uPickClipPos) {
                    gl.uniform2fv(uPickClipPos, frameCtx.pickClipPos);
                }

                if (uDrawingBufferSize) {
                    gl.uniform2f(uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
                }

                if (uUVDecodeMatrix) {
                    gl.uniformMatrix3fv(uUVDecodeMatrix, false, state.uvDecodeMatrix);
                }

                const pointsMaterial = scene.pointsMaterial;
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

                const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
                const textureSet = state.textureSet;
                if (textureSet) {
                    const {
                        colorTexture,
                        metallicRoughnessTexture,
                        emissiveTexture,
                        normalsTexture,
                        occlusionTexture,
                    } = textureSet;

                    if (uColorMap && colorTexture) {
                        program.bindTexture(uColorMap, colorTexture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    }
                    if (uMetallicRoughMap && metallicRoughnessTexture) {
                        program.bindTexture(uMetallicRoughMap, metallicRoughnessTexture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    }
                    if (uEmissiveMap && emissiveTexture) {
                        program.bindTexture(uEmissiveMap, emissiveTexture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    }
                    if (uNormalMap && normalsTexture) {
                        program.bindTexture(uNormalMap, normalsTexture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    }
                    if (uAOMap && occlusionTexture) {
                        program.bindTexture(uAOMap, occlusionTexture.texture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    }

                }

                if (lightsState.reflectionMaps.length > 0 && lightsState.reflectionMaps[0].texture && uReflectionMap) {
                    program.bindTexture(uReflectionMap, lightsState.reflectionMaps[0].texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    frameCtx.bindTexture++;
                }

                if (lightsState.lightMaps.length > 0 && lightsState.lightMaps[0].texture && uLightMap) {
                    program.bindTexture(uLightMap, lightsState.lightMaps[0].texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    frameCtx.bindTexture++;
                }

                if (withSAO) {
                    const sao = scene.sao;
                    const saoEnabled = sao.possible;
                    if (saoEnabled) {
                        const viewportWidth = gl.drawingBufferWidth;
                        const viewportHeight = gl.drawingBufferHeight;
                        tempVec4[0] = viewportWidth;
                        tempVec4[1] = viewportHeight;
                        tempVec4[2] = sao.blendCutoff;
                        tempVec4[3] = sao.blendFactor;
                        gl.uniform4fv(uSAOParams, tempVec4);
                        program.bindTexture(uOcclusionTexture, frameCtx.occlusionTexture, frameCtx.textureUnit);
                        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                        frameCtx.bindTexture++;
                    }
                }

                if (useAlphaCutoff) {
                    gl.uniform1f(alphaCutoffLocation, textureSet.alphaCutoff);
                }

                if (colorUniform) {
                    const colorKey = edges ? "edgeColor" : "fillColor";
                    const alphaKey = edges ? "edgeAlpha" : "fillAlpha";

                    if (renderPass === RENDER_PASSES[`${edges ? "EDGES" : "SILHOUETTE"}_XRAYED`]) {
                        const material = scene.xrayMaterial._state;
                        const color = material[colorKey];
                        const alpha = material[alphaKey];
                        gl.uniform4f(uColor, color[0], color[1], color[2], alpha);

                    } else if (renderPass === RENDER_PASSES[`${edges ? "EDGES" : "SILHOUETTE"}_HIGHLIGHTED`]) {
                        const material = scene.highlightMaterial._state;
                        const color = material[colorKey];
                        const alpha = material[alphaKey];
                        gl.uniform4f(uColor, color[0], color[1], color[2], alpha);

                    } else if (renderPass === RENDER_PASSES[`${edges ? "EDGES" : "SILHOUETTE"}_SELECTED`]) {
                        const material = scene.selectedMaterial._state;
                        const color = material[colorKey];
                        const alpha = material[alphaKey];
                        gl.uniform4f(uColor, color[0], color[1], color[2], alpha);

                    } else {
                        gl.uniform4fv(uColor, edges ? edgesDefaultColor : defaultColor);
                    }
                }

                if (primitive === "lines") {
                    if (instancing) {
                        gl.drawElementsInstanced(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                    } else {
                        gl.drawElements(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                    }
                    if (incrementDrawState) {
                        frameCtx.drawElements++;
                    }
                } else if (primitive === "points") {
                    if (instancing) {
                        gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                    } else {
                        gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                    }
                    if (incrementDrawState) {
                        frameCtx.drawElements++;
                    }
                } else {
                    if (instancing) {
                        if (edges && state.edgeIndicesBuf) {
                            gl.drawElementsInstanced(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);
                        } else {
                            gl.drawElementsInstanced(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

                            if (incrementDrawState) {
                                frameCtx.drawElements++;
                            }
                        }
                    } else {
                        if (edges && state.edgeIndicesBuf) {
                            gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
                        } else {
                            gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);

                            if (incrementDrawState) {
                                frameCtx.drawElements++;
                            }
                        }
                    }
                }
            }

            gl.bindVertexArray(null);
        };
    }
}