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
export class TrianglesSnapRenderer extends VBORenderer {

    constructor(scene, isSnapInit) {
        super(scene, false, { isSnap: true, isSnapInit: isSnapInit });
    }

    drawLayer(frameCtx, layer, renderPass) {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const {_state: state, model} = layer;
        const {origin, positionsDecodeMatrix} = state;
        const {camera} = model.scene;
        const {project} = camera;
        const viewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;
        const {position, rotationMatrix} = model;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }

        if (this._vaoCache.has(layer)) {
            gl.bindVertexArray(this._vaoCache.get(layer));
        } else {
            this._vaoCache.set(layer, this._makeVAO(state))
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

        gl.bindBuffer(gl.UNIFORM_BUFFER, this._matricesUniformBlockBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this._matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

        gl.bindBufferBase(
            gl.UNIFORM_BUFFER,
            this._matricesUniformBlockBufferBindingPoint,
            this._matricesUniformBlockBuffer);

        this.setSectionPlanesStateUniforms(layer);

        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        const aabb = layer.aabb; // Per-layer AABB for best RTC accuracy
        const coordinateScaler = tempVec3b;
        coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
        coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
        coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;

        frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
        frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
        frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);
        frameCtx.snapPickOrigin[0] = rtcOrigin[0];
        frameCtx.snapPickOrigin[1] = rtcOrigin[1];
        frameCtx.snapPickOrigin[2] = rtcOrigin[2];

        gl.uniform2fv(this.uVectorA, frameCtx.snapVectorA);
        gl.uniform2fv(this.uInverseVectorAB, frameCtx.snapInvVectorAB);
        gl.uniform1i(this._uLayerNumber, frameCtx.snapPickLayerNumber);
        gl.uniform3fv(this._uCoordinateScaler, coordinateScaler);
        gl.uniform1i(this._uRenderPass, renderPass);

        //=============================================================
        // TODO: Use drawElements count and offset to draw only one entity
        //=============================================================

        if (this._isSnapInit) {
            state.indicesBuf.bind();
            gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
            state.indicesBuf.unbind();
        } else if ((frameCtx.snapMode === "edge") && state.edgeIndicesBuf) {
            state.edgeIndicesBuf.bind();
            gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
            state.edgeIndicesBuf.unbind(); // needed?
        } else {
            gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
        }

        gl.bindVertexArray(null);
    }

    _buildVertexShader() {
        const isSnapInit = this._isSnapInit;
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// TrianglesSnapRenderer vertex shader");
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
        if (isSnapInit) {
            src.push("in vec4 pickColor;");
        }
        src.push("in vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in float flags;");

        this._addMatricesUniformBlockLines(src);

        src.push("uniform vec2 snapVectorA;");
        src.push("uniform vec2 snapInvVectorAB;");
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        src.push("vec2 remapClipPos(vec2 clipPos) {");
        src.push("    float x = (clipPos.x - snapVectorA.x) * snapInvVectorAB.x;");
        src.push("    float y = (clipPos.y - snapVectorA.y) * snapInvVectorAB.y;");
        src.push("    return vec2(x, y);")
        src.push("}");
        if (isSnapInit) {
            src.push("flat out vec4 vPickColor;");
        }
        if (clipping || isSnapInit) {
            src.push("out vec4 vWorldPosition;");
        }
        if (clipping) {
            src.push("out float vFlags;");
        }
        src.push("out highp vec3 relativeToOriginPosition;");
        src.push("void main(void) {");
        // pickFlag = NOT_RENDERED | PICK
        // renderPass = PICK
        src.push(`int pickFlag = int(flags) >> 12 & 0xF;`);
        src.push(`if (pickFlag != renderPass) {`);
        src.push("      gl_Position = vec4(" + (isSnapInit ? "0.0" : "2.0") + ", 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("  } else {");
        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      relativeToOriginPosition = worldPosition.xyz;");
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        if (clipping || isSnapInit) {
            src.push("      vWorldPosition = worldPosition;");
        }
        if (clipping) {
            src.push("      vFlags = flags;");
        }
        if (isSnapInit) {
            src.push("vPickColor = pickColor;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        src.push("float tmp = clipPos.w;")
        src.push("clipPos.xyzw /= tmp;")
        src.push("clipPos.xy = remapClipPos(clipPos.xy);");
        src.push("clipPos.xyzw *= tmp;");
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        if (! isSnapInit) {
            src.push("gl_PointSize = 1.0;"); // Windows needs this?
        }
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const isSnapInit = this._isSnapInit;
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// TrianglesSnapRenderer fragment shader");
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
        if (clipping || isSnapInit) {
            src.push("in vec4 vWorldPosition;");
        }
        if (isSnapInit) {
            src.push("flat in vec4 vPickColor;");
        }
        if (clipping) {
            src.push("in float vFlags;");
            for (let i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in highp vec3 relativeToOriginPosition;");
        if (isSnapInit) {
            src.push("layout(location = 0) out highp ivec4 outCoords;");
            src.push("layout(location = 1) out highp ivec4 outNormal;");
            src.push("layout(location = 2) out lowp uvec4 outPickColor;");
        } else {
            src.push("out highp ivec4 outCoords;");
        }
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
            if (isSnapInit) {
                src.push("    float dx = dFdx(vFragDepth);");
                src.push("    float dy = dFdy(vFragDepth);");
                src.push("    float diff = sqrt(dx*dx+dy*dy);");
            } else {
                src.push("    float diff = 0.0;");
            }
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth + diff ) * logDepthBufFC * 0.5;");
        }
        src.push("outCoords = ivec4(relativeToOriginPosition.xyz*coordinateScaler.xyz, " + (isSnapInit ? "-" : "") + "layerNumber);");

        if (isSnapInit) {
            src.push("vec3 xTangent = dFdx( vWorldPosition.xyz );");
            src.push("vec3 yTangent = dFdy( vWorldPosition.xyz );");
            src.push("vec3 worldNormal = normalize( cross( xTangent, yTangent ) );");
            src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
            src.push("outPickColor = uvec4(vPickColor);");
        }
        src.push("}");
        return src;
    }
}
