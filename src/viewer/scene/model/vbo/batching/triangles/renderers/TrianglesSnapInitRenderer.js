import {VBORenderer} from "../../../VBORenderer.js";
import {createRTCViewMat} from "../../../../../math/rtcCoords.js";
import {math} from "../../../../../math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();
const tempMat4a = math.mat4();

const SNAPPING_LOG_DEPTH_BUF_ENABLED = true; // Improves occlusion accuracy at distance

/**
 * @private
 */
export class TrianglesSnapInitRenderer extends VBORenderer {

    drawLayer(frameCtx, batchingLayer, renderPass) {

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }

        const model = batchingLayer.model;
        const scene = model.scene;
        const camera = scene.camera;
        const gl = scene.canvas.gl;
        const state = batchingLayer._state;
        const origin = batchingLayer._state.origin;
        const {position, rotationMatrix} = model;
        const aabb = batchingLayer.aabb; // Per-layer AABB for best RTC accuracy
        const viewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;

        if (this._vaoCache.has(batchingLayer)) {
            gl.bindVertexArray(this._vaoCache.get(batchingLayer));
        } else {
            this._vaoCache.set(batchingLayer, this._makeVAO(state))
        }

        const coordinateScaler = tempVec3a;
        coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
        coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
        coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;

        frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
        frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
        frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);

        let rtcViewMatrix;
        let rtcCameraEye;

        if (origin || position[0] !== 0 || position[1] !== 0 || position[2] !== 0) {
            const rtcOrigin = tempVec3b;
            if (origin) {
                const rotatedOrigin = tempVec3c;
                math.transformPoint3(rotationMatrix, origin, rotatedOrigin);
                rtcOrigin[0] = rotatedOrigin[0];
                rtcOrigin[1] = rotatedOrigin[1];
                rtcOrigin[2] = rotatedOrigin[2];
            } else {
                rtcOrigin[0] = 0;
                rtcOrigin[1] = 0;
                rtcOrigin[2] = 0;
            }
            rtcOrigin[0] += position[0];
            rtcOrigin[1] += position[1];
            rtcOrigin[2] += position[2];
            rtcViewMatrix = createRTCViewMat(viewMatrix, rtcOrigin, tempMat4a);
            rtcCameraEye = tempVec3d;
            rtcCameraEye[0] = camera.eye[0] - rtcOrigin[0];
            rtcCameraEye[1] = camera.eye[1] - rtcOrigin[1];
            rtcCameraEye[2] = camera.eye[2] - rtcOrigin[2];
            frameCtx.snapPickOrigin[0] = rtcOrigin[0];
            frameCtx.snapPickOrigin[1] = rtcOrigin[1];
            frameCtx.snapPickOrigin[2] = rtcOrigin[2];
        } else {
            rtcViewMatrix = viewMatrix;
            rtcCameraEye = camera.eye;
            frameCtx.snapPickOrigin[0] = 0;
            frameCtx.snapPickOrigin[1] = 0;
            frameCtx.snapPickOrigin[2] = 0;
        }

        gl.uniform3fv(this._uCameraEyeRtc, rtcCameraEye);
        gl.uniform2fv(this.uVectorA, frameCtx.snapVectorA);
        gl.uniform2fv(this.uInverseVectorAB, frameCtx.snapInvVectorAB);
        gl.uniform1i(this._uLayerNumber, frameCtx.snapPickLayerNumber);
        gl.uniform3fv(this._uCoordinateScaler, coordinateScaler);
        gl.uniform1i(this._uRenderPass, renderPass);
        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        let offset = 0;
        const mat4Size = 4 * 4;

        this._matricesUniformBlockBufferData.set(rotationMatrix, 0);
        this._matricesUniformBlockBufferData.set(rtcViewMatrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(camera.projMatrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(state.positionsDecodeMatrix, offset += mat4Size);

        gl.bindBuffer(gl.UNIFORM_BUFFER, this._matricesUniformBlockBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this._matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

        gl.bindBufferBase(
            gl.UNIFORM_BUFFER,
            this._matricesUniformBlockBufferBindingPoint,
            this._matricesUniformBlockBuffer);

        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        this.setSectionPlanesStateUniforms(batchingLayer);
        //=============================================================
        // TODO: Use drawElements count and offset to draw only one entity
        //=============================================================

        state.indicesBuf.bind();
        gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
        state.indicesBuf.unbind();

        gl.bindVertexArray(null);
    }

    _allocate() {
        super._allocate();

        const program = this._program;

        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
        this._uCameraEyeRtc = program.getLocation("uCameraEyeRtc");
        this.uVectorA = program.getLocation("snapVectorA");
        this.uInverseVectorAB = program.getLocation("snapInvVectorAB");
        this._uLayerNumber = program.getLocation("layerNumber");
        this._uCoordinateScaler = program.getLocation("coordinateScaler");
    }

    _bindProgram() {
        this._program.bind();
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// VBO SnapBatchingDepthBufInitRenderer vertex shader");
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
        src.push("uniform int renderPass;");
        src.push("in vec4 pickColor;");
        src.push("in vec3 position;");

        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in float flags;");
        src.push("uniform bool pickInvisible;");

        this._addMatricesUniformBlockLines(src);

        src.push("uniform vec3 uCameraEyeRtc;");
        src.push("uniform vec2 snapVectorA;");
        src.push("uniform vec2 snapInvVectorAB;");
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("out float isPerspective;");
        }
        src.push("bool isPerspectiveMatrix(mat4 m) {");
        src.push("    return (m[2][3] == - 1.0);");
        src.push("}");
        src.push("vec2 remapClipPos(vec2 clipPos) {");
        src.push("    float x = (clipPos.x - snapVectorA.x) * snapInvVectorAB.x;");
        src.push("    float y = (clipPos.y - snapVectorA.y) * snapInvVectorAB.y;");
        src.push("    return vec2(x, y);")
        src.push("}");
        src.push("flat out vec4 vPickColor;");
        src.push("out vec4 vWorldPosition;");
        if (clipping) {
            src.push("out float vFlags;");
        }
        src.push("out highp vec3 relativeToOriginPosition;");
        src.push("void main(void) {");
        // pickFlag = NOT_RENDERED | PICK
        // renderPass = PICK
        src.push(`int pickFlag = int(flags) >> 12 & 0xF;`);
        src.push(`if (pickFlag != renderPass) {`);
        src.push("      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("  } else {");
        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      relativeToOriginPosition = worldPosition.xyz;");
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        src.push("      vWorldPosition = worldPosition;");
        if (clipping) {
            src.push("      vFlags = flags;");
        }
        src.push("vPickColor = pickColor;");
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        src.push("float tmp = clipPos.w;")
        src.push("clipPos.xyzw /= tmp;")
        src.push("clipPos.xy = remapClipPos(clipPos.xy);");
        src.push("clipPos.xyzw *= tmp;")
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// VBO SnapBatchingDepthBufInitRenderer fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        src.push("uniform int layerNumber;");
        src.push("uniform vec3 coordinateScaler;");
        src.push("in vec4 vWorldPosition;");
        src.push("flat in vec4 vPickColor;");
        if (clipping) {
            src.push("in float vFlags;");
            for (let i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in highp vec3 relativeToOriginPosition;");
        src.push("layout(location = 0) out highp ivec4 outCoords;");
        src.push("layout(location = 1) out highp ivec4 outNormal;");
        src.push("layout(location = 2) out lowp uvec4 outPickColor;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("      float dist = 0.0;");
            for (var i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
                src.push("      if (sectionPlaneActive" + i + ") {");
                src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("      }");
            }
            src.push("      if (dist > 0.0) { discard; }");
            src.push("  }");
        }
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("    float dx = dFdx(vFragDepth);")
            src.push("    float dy = dFdy(vFragDepth);")
            src.push("    float diff = sqrt(dx*dx+dy*dy);");
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth + diff ) * logDepthBufFC * 0.5;");
        }
        src.push("outCoords = ivec4(relativeToOriginPosition.xyz*coordinateScaler.xyz, -layerNumber);");

        src.push("vec3 xTangent = dFdx( vWorldPosition.xyz );");
        src.push("vec3 yTangent = dFdy( vWorldPosition.xyz );");
        src.push("vec3 worldNormal = normalize( cross( xTangent, yTangent ) );");
        src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
        src.push("outPickColor = uvec4(vPickColor);");
        src.push("}");
        return src;
    }

    webglContextRestored() {
        this._program = null;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
    }
}
