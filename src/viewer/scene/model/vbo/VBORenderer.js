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

        this._scene                     = scene;
        this._instancing                = instancing;
        this._primitive                 = primitive;
        this._withSAO                   = withSAO;

        this._progMode                  = cfg.progMode;
        this._edges                     = cfg.edges;
        this._useAlphaCutoff            = cfg.useAlphaCutoff;
        this._colorUniform              = cfg.colorUniform;
        this._incrementDrawState        = cfg.incrementDrawState;

        this._getRendererHash           = cfg.getHash;
        this._getLogDepth               = cfg.getLogDepth;
        this._clippingCaps              = cfg.clippingCaps;
        this._renderPassFlag            = cfg.renderPassFlag;
        this._appendVertexDefinitions   = cfg.appendVertexDefinitions;
        this._filterIntensityRange      = cfg.filterIntensityRange;
        this._transformClipPos          = cfg.transformClipPos;
        this._shadowParameters          = cfg.shadowParameters;
        this._needVertexColor           = cfg.needVertexColor;
        this._needPickColor             = cfg.needPickColor;
        this._needGl_Position           = cfg.needGl_Position;
        this._needViewPosition          = cfg.needViewPosition;
        this._needViewMatrixNormal      = cfg.needViewMatrixNormal;
        this._needWorldNormal           = cfg.needWorldNormal;
        this._needWorldPosition         = cfg.needWorldPosition;
        this._appendVertexOutputs       = cfg.appendVertexOutputs;
        this._appendFragmentDefinitions = cfg.appendFragmentDefinitions;
        this._sectionDiscardThreshold   = cfg.sectionDiscardThreshold;
        this._needSliced                = cfg.needSliced;
        this._needvWorldPosition        = cfg.needvWorldPosition;
        this._needGl_FragCoord          = cfg.needGl_FragCoord;
        this._needViewMatrixInFragment  = cfg.needViewMatrixInFragment;
        this._needGl_PointCoord         = cfg.needGl_PointCoord;
        this._appendFragmentOutputs     = cfg.appendFragmentOutputs;

        const progMode                  = cfg.progMode;


        this._testPerspectiveForGl_FragDepth = ((primitive !== "points") && (primitive !== "lines")) || (progMode === "snapInitMode") || (progMode === "snapMode");

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
        this._matricesUniformBlockBufferBindingPoint = 0;
        this._matricesUniformBlockBuffer = scene.canvas.gl.createBuffer();
        this._matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

        /**
         * A Vertex Array Object by Layer
         */
        this._vaoCache = new WeakMap();

        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;

        const preamble = (type, src) => [
            "#version 300 es",
            "// " + primitive + " " + (instancing ? "instancing" : "batching") + " " + progMode + " " + type + " shader"
        ].concat(src);

        const program = new Program(gl, {
            vertex:   preamble("vertex",   this.buildVertexShader()),
            fragment: preamble("fragment", this.buildFragmentShader())
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        this._program = program;

        this._uRenderPass = program.getLocation("renderPass");

        this._uColor = program.getLocation("color");
        if (!this._uColor) {
            // some shader may have color as attribute, in this case the uniform must be renamed silhouetteColor
            this._uColor = program.getLocation("silhouetteColor");
        }
        this._uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
        this._uGammaFactor = program.getLocation("gammaFactor");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            this._matricesUniformBlockBufferBindingPoint
        );

        this._uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        this._uShadowProjMatrix = program.getLocation("shadowProjMatrix");

        this._uLightAmbient = program.getLocation("lightAmbient");
        this._uLightColor = [];
        this._uLightDir = [];
        this._uLightPos = [];
        this._uLightAttenuation = [];

        // TODO add a gard to prevent light params if not affected by light ?
        const lights = lightsState.lights;
        let light;

        for (let i = 0, len = lights.length; i < len; i++) {
            light = lights[i];
            switch (light.type) {
                case "dir":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = null;
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = null;
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
            }
        }

        if (lightsState.reflectionMaps.length > 0) {
            this._uReflectionMap = "reflectionMap";
        }

        if (lightsState.lightMaps.length > 0) {
            this._uLightMap = "lightMap";
        }

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aNormal = program.getAttribute("normal");
        this._aUV = program.getAttribute("uv");
        this._aColor = program.getAttribute("color");
        this._aMetallicRoughness = program.getAttribute("metallicRoughness");
        this._aFlags = program.getAttribute("flags");
        this._aPickColor = program.getAttribute("pickColor");
        this._uPickZNear = program.getLocation("pickZNear");
        this._uPickZFar = program.getLocation("pickZFar");
        this._uPickClipPos = program.getLocation("pickClipPos");
        this._uDrawingBufferSize = program.getLocation("drawingBufferSize");

        this._uColorMap = "uColorMap";
        this._uMetallicRoughMap = "uMetallicRoughMap";
        this._uEmissiveMap = "uEmissiveMap";
        this._uNormalMap = "uNormalMap";
        this._uAOMap = "uAOMap";

        if (this._instancing) {
            this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
            this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
            this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");

            this._aModelNormalMatrixCol0 = program.getAttribute("modelNormalMatrixCol0");
            this._aModelNormalMatrixCol1 = program.getAttribute("modelNormalMatrixCol1");
            this._aModelNormalMatrixCol2 = program.getAttribute("modelNormalMatrixCol2");
        }

        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }

        if (this._useAlphaCutoff) {
            this._alphaCutoffLocation = program.getLocation("materialAlphaCutoff");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        if (this._filterIntensityRange) {
            this._uIntensityRange = program.getLocation(this._filterIntensityRange);
        }

        this._uPointSize = program.getLocation("pointSize");
        this._uNearPlaneHeight = program.getLocation("nearPlaneHeight");

        if (scene.crossSections) {
            this._uSliceColor = program.getLocation("sliceColor");
            this._uSliceThickness = program.getLocation("sliceThickness");
        }

        if ((this._progMode === "snapInitMode") || (this._progMode === "snapMode")) {
            if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
                this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
            }

            this.uVectorA = program.getLocation("snapVectorA");
            this.uInverseVectorAB = program.getLocation("snapInvVectorAB");
            this._uLayerNumber = program.getLocation("layerNumber");
            this._uCoordinateScaler = program.getLocation("coordinateScaler");
        }

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            this._drawLayer(frameCtx, layer, renderPass);
        };
    }

    buildVertexShader() {
        const getLogDepth = this._getLogDepth;
        const clippingCaps = this._clippingCaps;
        const renderPassFlag = this._renderPassFlag;
        const appendVertexDefinitions = this._appendVertexDefinitions;
        const filterIntensityRange = this._filterIntensityRange;
        const transformClipPos = this._transformClipPos;
        const shadowParameters = this._shadowParameters;
        const needVertexColor = this._needVertexColor;
        const needPickColor = this._needPickColor;
        const needGl_Position = this._needGl_Position;
        const needViewPosition = this._needViewPosition;
        const needViewMatrixNormal = this._needViewMatrixNormal;
        const needWorldNormal = this._needWorldNormal;
        const needWorldPosition = this._needWorldPosition;
        const appendVertexOutputs = this._appendVertexOutputs;
        const needvWorldPosition = this._needvWorldPosition;

        const testPerspectiveForGl_FragDepth = this._testPerspectiveForGl_FragDepth;

        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
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

        if (this._instancing) {
            src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
            src.push("in vec4 modelMatrixCol1;");
            src.push("in vec4 modelMatrixCol2;");
            if (needViewMatrixNormal || needWorldNormal) {
                src.push("in vec4 modelNormalMatrixCol0;");
                src.push("in vec4 modelNormalMatrixCol1;");
                src.push("in vec4 modelNormalMatrixCol2;");
            }
        }

        this._addMatricesUniformBlockLines(src, needViewMatrixNormal || needWorldNormal);

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
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("} else {");
        if (filterIntensityRange) {
            src.push("float intensity = float(color.a) / 255.0;");
            src.push("if ((intensity < " + filterIntensityRange + "[0]) || (intensity > " + filterIntensityRange + "[1])) {");
            src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
            src.push("   return;");
            src.push("}");
        }
        if (this._instancing) {
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
            if (this._instancing) {
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
    }

    buildFragmentShader() {
        const getLogDepth = this._getLogDepth;
        const clippingCaps = this._clippingCaps;
        const needViewMatrixNormal = this._needViewMatrixNormal;
        const needWorldNormal = this._needWorldNormal;
        const appendFragmentDefinitions = this._appendFragmentDefinitions;
        const sectionDiscardThreshold = this._sectionDiscardThreshold;
        const needSliced = this._needSliced;
        const needvWorldPosition = this._needvWorldPosition;
        const needGl_FragCoord = this._needGl_FragCoord;
        const needViewMatrixInFragment = this._needViewMatrixInFragment;
        const needGl_PointCoord = this._needGl_PointCoord;
        const appendFragmentOutputs = this._appendFragmentOutputs;

        const testPerspectiveForGl_FragDepth = this._testPerspectiveForGl_FragDepth;

        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
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
            this._addMatricesUniformBlockLines(src, needViewMatrixNormal || needWorldNormal); // if false then WebGL error "Interface block `Matrices` is not linkable between attached shaders."
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
    }

    _addMatricesUniformBlockLines(src, normals = false) {
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
    }

    _drawLayer(frameCtx, layer, renderPass) {

        const isSnap = (this._progMode === "snapInitMode") || (this._progMode === "snapMode");
        const incrementDrawState = this._incrementDrawState;

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const {_state: state, model} = layer;
        const {origin, positionsDecodeMatrix} = state;
        const {camera} = model.scene;
        const {project} = camera;
        const viewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;
        const {position, rotationMatrix} = model;

        const program = this._program;

        if (frameCtx.lastProgramId !== program.id) {
            frameCtx.lastProgramId = program.id;
            program.bind();

            const lightsState = scene._lightsState;
            const lights = lightsState.lights;

            frameCtx.textureUnit = 0;

            if (this._uLightAmbient) {
                gl.uniform4fv(this._uLightAmbient, lightsState.getAmbientColorAndIntensity());
            }

            if (this._uGammaFactor) {
                gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
            }

            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                if (this._uLightColor[i]) {
                    gl.uniform4f(this._uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
                }
                if (this._uLightPos[i]) {
                    gl.uniform3fv(this._uLightPos[i], light.pos);
                    if (this._uLightAttenuation[i]) {
                        gl.uniform1f(this._uLightAttenuation[i], light.attenuation);
                    }
                }
                if (this._uLightDir[i]) {
                    gl.uniform3fv(this._uLightDir[i], light.dir);
                }
            }
        }

        if (this._vaoCache.has(layer)) {
            gl.bindVertexArray(this._vaoCache.get(layer));
        } else {
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            if (this._instancing) {
                this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
                this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
                this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);

                gl.vertexAttribDivisor(this._aModelMatrixCol0.location, 1);
                gl.vertexAttribDivisor(this._aModelMatrixCol1.location, 1);
                gl.vertexAttribDivisor(this._aModelMatrixCol2.location, 1);

                if (this._aModelNormalMatrixCol0) {
                    this._aModelNormalMatrixCol0.bindArrayBuffer(state.modelNormalMatrixCol0Buf);
                    gl.vertexAttribDivisor(this._aModelNormalMatrixCol0.location, 1);
                }
                if (this._aModelNormalMatrixCol1) {
                    this._aModelNormalMatrixCol1.bindArrayBuffer(state.modelNormalMatrixCol1Buf);
                    gl.vertexAttribDivisor(this._aModelNormalMatrixCol1.location, 1);
                }
                if (this._aModelNormalMatrixCol2) {
                    this._aModelNormalMatrixCol2.bindArrayBuffer(state.modelNormalMatrixCol2Buf);
                    gl.vertexAttribDivisor(this._aModelNormalMatrixCol2.location, 1);
                }

            }

            this._aPosition.bindArrayBuffer(state.positionsBuf);

            if (this._aUV) {
                this._aUV.bindArrayBuffer(state.uvBuf);
            }

            if (this._aNormal) {
                this._aNormal.bindArrayBuffer(state.normalsBuf);
            }

            if (this._aMetallicRoughness) {
                this._aMetallicRoughness.bindArrayBuffer(state.metallicRoughnessBuf);
                if (this._instancing) {
                    gl.vertexAttribDivisor(this._aMetallicRoughness.location, 1);
                }
            }

            if (this._aColor) {
                this._aColor.bindArrayBuffer(state.colorsBuf);
                if (this._instancing && state.colorsBuf && (!state.colorsForPointsNotInstancing)) {
                    gl.vertexAttribDivisor(this._aColor.location, 1);
                }
            }

            if (this._aFlags) {
                this._aFlags.bindArrayBuffer(state.flagsBuf);
                if (this._instancing) {
                    gl.vertexAttribDivisor(this._aFlags.location, 1);
                }
            }

            if (this._aOffset) {
                this._aOffset.bindArrayBuffer(state.offsetsBuf);
                if (this._instancing) {
                    gl.vertexAttribDivisor(this._aOffset.location, 1);
                }
            }

            if (this._aPickColor) {
                this._aPickColor.bindArrayBuffer(state.pickColorsBuf);
                if (this._instancing) {
                    gl.vertexAttribDivisor(this._aPickColor.location, 1);
                }
            }

            if (this._edges && state.edgeIndicesBuf) {
                state.edgeIndicesBuf.bind();
            } else {
                if (state.indicesBuf) {
                    state.indicesBuf.bind();
                }
            }
            this._vaoCache.set(layer, vao);
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
        this._matricesUniformBlockBufferData.set(rotationMatrix, 0);
        this._matricesUniformBlockBufferData.set(rtcViewMatrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(frameCtx.pickProjMatrix || project.matrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(positionsDecodeMatrix, offset += mat4Size);
        if (! isSnap) {
            this._matricesUniformBlockBufferData.set(model.worldNormalMatrix, offset += mat4Size);
            this._matricesUniformBlockBufferData.set(camera.viewNormalMatrix, offset += mat4Size);
        }

        gl.bindBuffer(gl.UNIFORM_BUFFER, this._matricesUniformBlockBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this._matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

        gl.bindBufferBase(
            gl.UNIFORM_BUFFER,
            this._matricesUniformBlockBufferBindingPoint,
            this._matricesUniformBlockBuffer);


        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numAllocatedSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = layer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            if (scene.crossSections) {
                gl.uniform4fv(this._uSliceColor, scene.crossSections.sliceColor);
                gl.uniform1f(this._uSliceThickness, scene.crossSections.sliceThickness);
            }
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
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


        if (this._uShadowViewMatrix) {
            gl.uniformMatrix4fv(this._uShadowViewMatrix, false, frameCtx.shadowViewMatrix); // Not tested
        }
        if (this._uShadowProjMatrix) {
            gl.uniformMatrix4fv(this._uShadowProjMatrix, false, frameCtx.shadowProjMatrix); // Not tested
        }

        if (scene.logarithmicDepthBufferEnabled || (isSnap && SNAPPING_LOG_DEPTH_BUF_ENABLED)) {
            if (this._uLogDepthBufFC) {
                const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
                gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
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

            gl.uniform3fv(this._uCoordinateScaler, coordinateScaler);
            gl.uniform2fv(this.uVectorA, frameCtx.snapVectorA);
            gl.uniform2fv(this.uInverseVectorAB, frameCtx.snapInvVectorAB);
            gl.uniform1i(this._uLayerNumber, frameCtx.snapPickLayerNumber);
            gl.uniform1i(this._uRenderPass, renderPass);
            if (this._uPointSize) {
                gl.uniform1f(this._uPointSize, 1.0);
            }

            //=============================================================
            // TODO: Use drawElements count and offset to draw only one entity
            //=============================================================

            if ((this._progMode === "snapInitMode") && (this._primitive !== "points")) {
                state.indicesBuf.bind();
                const mode = (this._primitive === "lines") ? gl.LINES : gl.TRIANGLES;
                if (this._instancing) {
                    gl.drawElementsInstanced(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                }
                state.indicesBuf.unbind();
            } else if ((frameCtx.snapMode === "edge") && (this._primitive !== "points")) {
                const indicesBuf = ((this._primitive !== "lines") && state.edgeIndicesBuf) || state.indicesBuf;
                indicesBuf.bind();
                if (this._instancing) {
                    gl.drawElementsInstanced(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);
                }
                indicesBuf.unbind(); // needed?
            } else {
                if (this._instancing) {
                    gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                } else {
                    gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                }
            }

        } else {                // ! isSnap

            gl.uniform1i(this._uRenderPass, renderPass);

            if (this._uPickZNear) {
                gl.uniform1f(this._uPickZNear, frameCtx.pickZNear);
            }

            if (this._uPickZFar) {
                gl.uniform1f(this._uPickZFar, frameCtx.pickZFar);
            }

            if (this._uPickClipPos) {
                gl.uniform2fv(this._uPickClipPos, frameCtx.pickClipPos);
            }

            if (this._uDrawingBufferSize) {
                gl.uniform2f(this._uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            if (this._uUVDecodeMatrix) {
                gl.uniformMatrix3fv(this._uUVDecodeMatrix, false, state.uvDecodeMatrix);
            }

            const pointsMaterial = scene.pointsMaterial;
            if (this._uIntensityRange) {
                gl.uniform2f(this._uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
            }

            if (this._uPointSize) {
                gl.uniform1f(this._uPointSize, pointsMaterial.pointSize);
            }

            if (this._uNearPlaneHeight) {
                const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                      1.0
                      : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                gl.uniform1f(this._uNearPlaneHeight, nearPlaneHeight);
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

                if (this._uColorMap && colorTexture) {
                    this._program.bindTexture(this._uColorMap, colorTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (this._uMetallicRoughMap && metallicRoughnessTexture) {
                    this._program.bindTexture(this._uMetallicRoughMap, metallicRoughnessTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (this._uEmissiveMap && emissiveTexture) {
                    this._program.bindTexture(this._uEmissiveMap, emissiveTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (this._uNormalMap && normalsTexture) {
                    this._program.bindTexture(this._uNormalMap, normalsTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (this._uAOMap && occlusionTexture) {
                    this._program.bindTexture(this._uAOMap, occlusionTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }

            }

            const lightsState = scene._lightsState;
            if (lightsState.reflectionMaps.length > 0 && lightsState.reflectionMaps[0].texture && this._uReflectionMap) {
                this._program.bindTexture(this._uReflectionMap, lightsState.reflectionMaps[0].texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                frameCtx.bindTexture++;
            }

            if (lightsState.lightMaps.length > 0 && lightsState.lightMaps[0].texture && this._uLightMap) {
                this._program.bindTexture(this._uLightMap, lightsState.lightMaps[0].texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                frameCtx.bindTexture++;
            }

            if (this._withSAO) {
                const sao = scene.sao;
                const saoEnabled = sao.possible;
                if (saoEnabled) {
                    const viewportWidth = gl.drawingBufferWidth;
                    const viewportHeight = gl.drawingBufferHeight;
                    tempVec4[0] = viewportWidth;
                    tempVec4[1] = viewportHeight;
                    tempVec4[2] = sao.blendCutoff;
                    tempVec4[3] = sao.blendFactor;
                    gl.uniform4fv(this._uSAOParams, tempVec4);
                    this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    frameCtx.bindTexture++;
                }
            }

            if (this._useAlphaCutoff) {
                gl.uniform1f(this._alphaCutoffLocation, textureSet.alphaCutoff);
            }

            if (this._colorUniform) {
                const colorKey = this._edges ? "edgeColor" : "fillColor";
                const alphaKey = this._edges ? "edgeAlpha" : "fillAlpha";

                if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_XRAYED`]) {
                    const material = scene.xrayMaterial._state;
                    const color = material[colorKey];
                    const alpha = material[alphaKey];
                    gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);

                } else if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_HIGHLIGHTED`]) {
                    const material = scene.highlightMaterial._state;
                    const color = material[colorKey];
                    const alpha = material[alphaKey];
                    gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);

                } else if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_SELECTED`]) {
                    const material = scene.selectedMaterial._state;
                    const color = material[colorKey];
                    const alpha = material[alphaKey];
                    gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);

                } else {
                    gl.uniform4fv(this._uColor, this._edges ? edgesDefaultColor : defaultColor);
                }
            }

            if (this._primitive === "lines") {
                if (this._instancing) {
                    gl.drawElementsInstanced(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                }
                if (incrementDrawState) {
                    frameCtx.drawElements++;
                }
            } else if (this._primitive === "points") {
                if (this._instancing) {
                    gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                } else {
                    gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                }
                if (incrementDrawState) {
                    frameCtx.drawElements++;
                }
            } else {
                if (this._instancing) {
                    if (this._edges) {
                        gl.drawElementsInstanced(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);
                    } else {
                        gl.drawElementsInstanced(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

                        if (incrementDrawState) {
                            frameCtx.drawElements++;
                        }
                    }
                } else {
                    if (this._edges) {
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
    }
}