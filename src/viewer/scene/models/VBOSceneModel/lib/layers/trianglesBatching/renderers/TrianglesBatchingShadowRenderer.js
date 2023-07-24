import {Program} from "../../../../../../webgl/Program.js";
import { VBOSceneModelTriangleBatchingRenderer } from "../../VBOSceneModelRenderer.js";

/**
 * Renders BatchingLayer fragment depths to a shadow map.
 *
 * @private
 */
class TrianglesBatchingShadowRenderer extends VBOSceneModelTriangleBatchingRenderer {
    _getHash() {
        return this._scene._sectionPlanesState.getHash();
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
        src.push("#version 300 es");
        src.push("// Batched geometry shadow vertex shader");
        src.push("in vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in vec4 color;");
        src.push("in float flags;");
        src.push("uniform mat4 shadowViewMatrix;");
        src.push("uniform mat4 shadowProjMatrix;");
        src.push("uniform mat4 positionsDecodeMatrix;");
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out float vFlags;");
        }
        src.push("out vec4 vViewPosition;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        src.push(`  int colorFlag = int(flags) & 0xF;`);
        src.push("  bool visible        = (colorFlag > 0);");
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
            src.push("      vFlags = flags;");
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
        src.push("#version 300 es");
        src.push("// Batched geometry shadow fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("in float vFlags;");
            for (let i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vViewPosition;");

        src.push("vec4 encodeFloat( const in float v ) {");
        src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
        src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
        src.push("  vec4 comp = fract(v * bitShift);");
        src.push("  comp -= comp.xxyz * bitMask;");
        src.push("  return comp;");
        src.push("}");
        src.push("out vec4 outColor;");
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
        src.push("    outColor = encodeFloat( gl_FragCoord.z); ");
        src.push("}");
        return src;
    }
}

export {TrianglesBatchingShadowRenderer};