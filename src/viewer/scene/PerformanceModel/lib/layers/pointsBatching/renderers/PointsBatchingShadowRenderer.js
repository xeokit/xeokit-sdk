import {Program} from "../../../../../webgl/Program.js";
import {math} from "../../../../../math/math.js";
import {getPlaneRTCPos} from "../../../../../math/rtcCoords.js";

const tempVec3a = math.vec3();

/**
 * Renders pointsBatchingLayer fragment depths to a shadow map.
 *
 * @private
 */
class PointsBatchingShadowRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, pointsBatchingLayer) {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const state = pointsBatchingLayer._state;
        const pointsMaterial = scene.pointsMaterial._state;
        if (!this._program) {
            this._allocate();
        }
        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, pointsBatchingLayer._state.positionsDecodeMatrix);
        if (scene.logarithmicDepthBufferEnabled) {
            gl.uniform1f(this._uZFar, scene.camera.project.far)
        }
        this._aPosition.bindArrayBuffer(state.positionsBuf);
        if (this._aColor) { // Needed for masking out transparent entities using alpha channel
            this._aColor.bindArrayBuffer(state.colorsBuf);
        }
        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }
        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }
        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
        }

        // TODO: Section planes need to be set if RTC center has changed since last RTC center recorded on frameCtx

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = pointsBatchingLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            const rtcCenter = pointsBatchingLayer._state.rtcCenter;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        if (rtcCenter) {
                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a);
                            gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                        } else {
                            gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                        }
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }

        gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
    }

    _allocate() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const sectionPlanesState = scene._sectionPlanesState;
        this._program = new Program(gl, this._buildShader());
        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }
        const program = this._program;
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        this._uShadowProjMatrix = program.getLocation("shadowProjMatrix");
        if (scene.logarithmicDepthBufferEnabled) {
            this._uZFar = program.getLocation("zFar");
        }
        this._uSectionPlanes = [];
        const sectionPlanes = sectionPlanesState.sectionPlanes;
        for (let i = 0, len = sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aColor = program.getAttribute("color");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");
        this._uPointSize = program.getLocation("pointSize");
    }

    _bindProgram(frameCtx) {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        program.bind();
        gl.uniformMatrix4fv(this._uShadowViewMatrix, false, frameCtx.shadowViewMatrix);
        gl.uniformMatrix4fv(this._uShadowProjMatrix, false, frameCtx.shadowProjMatrix);
        this._lastLightId = null;
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
        const src = [];
        src.push("// Batched geometry shadow vertex shader");
        src.push("attribute vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("attribute vec3 offset;");
        }
        src.push("attribute vec4 color;");
        src.push("attribute vec4 flags;");
        src.push("attribute vec4 flags2;");
        src.push("uniform mat4 shadowViewMatrix;");
        src.push("uniform mat4 shadowProjMatrix;");
        src.push("uniform mat4 positionsDecodeMatrix;");
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
        }
        src.push("varying vec4 vViewPosition;");
        src.push("void main(void) {");
        src.push("  bool visible        = (float(flags.x) > 0.0);");
        src.push("  bool transparent    = ((float(color.a) / 255.0) < 1.0);");
        src.push("  if (!visible || transparent) {");
        src.push("      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);");
        src.push("  } else {");
        src.push("      vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      vec4 viewPosition  = shadowViewMatrix * worldPosition; ");
        if (clipping) {
            src.push("      vWorldPosition = worldPosition;");
            src.push("      vFlags2 = flags2;");
        }
        src.push("      vViewPosition = viewPosition;");
        src.push("      gl_Position = shadowProjMatrix * viewPosition;");
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = (sectionPlanesState.sectionPlanes.length > 0);
        const src = [];
        src.push("// Batched geometry shadow fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
            for (let i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("varying vec4 vViewPosition;");

        src.push("vec4 encodeFloat( const in float v ) {");
        src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
        src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
        src.push("  vec4 comp = fract(v * bitShift);");
        src.push("  comp -= comp.xxyz * bitMask;");
        src.push("  return comp;");
        src.push("}");

        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (float(vFlags2.x) > 0.0);");
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
        src.push("    gl_FragColor = encodeFloat( gl_FragCoord.z); ");
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

export {PointsBatchingShadowRenderer};