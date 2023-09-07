import {Program} from "../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../math/rtcCoords.js";
import {math} from "../../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
export class SnapBatchingDepthRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash() + (this._scene.pointsMaterial.hash);
    }

    drawLayer(frameCtx, batchingLayer, renderPass) {

        const model = batchingLayer.model;
        const scene = model.scene;
        const camera = scene.camera;
        const gl = scene.canvas.gl;
        const state = batchingLayer._state;
        const origin = batchingLayer._state.origin;

        frameCtx.snapPickOrigin[0] = origin[0];
        frameCtx.snapPickOrigin[1] = origin[1];
        frameCtx.snapPickOrigin[2] = origin[2];

        const aabb = batchingLayer.aabb;
        const coordinateDivider = [
            math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT,
            math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT,
            math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT,
        ];

        frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateDivider[0]);
        frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateDivider[1]);
        frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateDivider[2]);


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

        let cameraEye = camera.eye;

        if (frameCtx.pickViewMatrix) {
            cameraEye = frameCtx.pickOrigin || cameraEye;
        }

        const originCameraEye = [
            cameraEye[0] - origin[0],
            cameraEye[1] - origin[1],
            cameraEye[2] - origin[2],
        ];

        gl.uniform3fv(this._uCameraEyeRtc, originCameraEye);

        gl.uniform2fv(this.uVectorA, frameCtx.snapVectorA);
        gl.uniform2fv(this.uInverseVectorAB, frameCtx.snapInvVectorAB);
        gl.uniform1i(this._uLayerNumber, frameCtx.snapPickLayerNumber);
        gl.uniform3fv(this._uCoordinateScaler, coordinateDivider);

        gl.uniform1i(this._uRenderPass, renderPass);

        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        const pickViewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;
        const viewMatrix = origin ? createRTCViewMat(pickViewMatrix, origin) : pickViewMatrix;

        gl.uniformMatrix4fv(this._uWorldMatrix, false, model.worldMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera.projMatrix);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = batchingLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        if (origin) {
                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a);
                            gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                        } else {
                            gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                        }
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }

        //=============================================================
        // TODO: Use drawElements count and offset to draw only one entity
        //=============================================================

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
        }

        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }

        if (frameCtx.snapMode === "edge") {
            state.edgeIndicesBuf.bind();
            gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
            state.edgeIndicesBuf.unbind(); // needed?
        } else {
            gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
        }
    }

    _allocate() {

        const scene = this._scene;
        const gl = scene.canvas.gl;

        this._program = new Program(gl, this._buildShader());

        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }

        const program = this._program;

        this._uRenderPass = program.getLocation("renderPass");
        this._uPickInvisible = program.getLocation("pickInvisible");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uWorldMatrix = program.getLocation("worldMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aFlags = program.getAttribute("flags");

        if (scene.logarithmicDepthBufferEnabled) {
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

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.sectionPlanes.length > 0;
        const pointsMaterial = scene.pointsMaterial._state;
        const src = [];
        src.push ('#version 300 es');
        src.push("// SnapBatchingDepthRenderer vertex shader");
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
        src.push("in vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in float flags;");
        src.push("uniform bool pickInvisible;");
        src.push("uniform mat4 worldMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        src.push("uniform mat4 positionsDecodeMatrix;");
        src.push("uniform vec3 uCameraEyeRtc;"); 
        src.push("uniform vec2 snapVectorA;"); 
        src.push("uniform vec2 snapInvVectorAB;"); 
        if (scene.logarithmicDepthBufferEnabled) {
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
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
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
        src.push("relativeToOriginPosition = worldPosition.xyz;")
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        if (clipping) {
            src.push("      vWorldPosition = worldPosition;");
            src.push("      vFlags = flags;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        src.push("float tmp = clipPos.w;")
        src.push("clipPos.xyzw /= tmp;")
        src.push("clipPos.xy = remapClipPos(clipPos.xy);");
        src.push("clipPos.xyzw *= tmp;");
        if (scene.logarithmicDepthBufferEnabled) {
           src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        src.push("gl_PointSize = 1.0;"); // Windows needs this?
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// SnapBatchingDepthRenderer fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        src.push("uniform int layerNumber;"); 
        src.push("uniform vec3 coordinateScaler;"); 
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("in float vFlags;");
            for (let i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in highp vec3 relativeToOriginPosition;");
        src.push("out highp ivec4 outCoords;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("      float dist = 0.0;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("      if (sectionPlaneActive" + i + ") {");
                src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("      }");
            }
            src.push("      if (dist > 0.0) { discard; }");
            src.push("  }");
        }
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("outCoords = ivec4(relativeToOriginPosition.xyz*coordinateScaler.xyz, layerNumber);")
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

