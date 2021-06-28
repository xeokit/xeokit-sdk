import {Program} from "../../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../math/rtcCoords.js";
import {math} from "../../../../../math/math.js";

const tempVec3a = math.vec3();

/**
 * Renders InstancingLayer fragment depths to a shadow map.
 *
 * @private
 */
class PointsInstancingShadowRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._lastLightId = null;
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer( frameCtx, instancingLayer) {

        const model = instancingLayer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = instancingLayer._state;
        const instanceExt = this._instanceExt;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx, instancingLayer);
        }

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, instancingLayer._state.positionsDecodeMatrix);

        this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
        this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
        this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 1);

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
            instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 1);
        }

        this._aColor.bindArrayBuffer(state.colorsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aColor.location, 1);

        this._aFlags.bindArrayBuffer(state.flagsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 1);

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 1);
        }

        // TODO: Section planes need to be set if RTC center has changed since last RTC center recorded on frameCtx

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = instancingLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            const rtcCenter = instancingLayer._state.rtcCenter;
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

        gl.uniform1f(this._uPointSize, 10);

        instanceExt.drawArraysInstancedANGLE(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aColor.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 0);

        if (this._aFlags2) { // Won't be in shader when not clipping
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 0);
        }

        if (this._aOffset) {
            instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 0);
        }
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
        this._instanceExt = gl.getExtension("ANGLE_instanced_arrays");
        const program = this._program;
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        this._uShadowProjMatrix = program.getLocation("shadowProjMatrix");
        this._uSectionPlanes = [];
        const clips = sectionPlanesState.sectionPlanes;
        for (let i = 0, len = clips.length; i < len; i++) {
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
        this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
        this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
        this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");
        this._uPointSize = program.getLocation("pointSize");
    }

    _bindProgram(frameCtx, instancingLayer) {
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
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("// Instancing geometry shadow drawing vertex shader");
        src.push("attribute vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("attribute vec3 offset;");
        }
        src.push("attribute vec4 color;");
        src.push("attribute vec4 flags;");
        src.push("attribute vec4 flags2;");
        src.push("attribute vec4 modelMatrixCol0;");
        src.push("attribute vec4 modelMatrixCol1;");
        src.push("attribute vec4 modelMatrixCol2;");
        src.push("uniform mat4 shadowViewMatrix;");
        src.push("uniform mat4 shadowProjMatrix;");
        src.push("uniform mat4 positionsDecodeMatrix;");
        src.push("uniform float pointSize;");
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
        }
        src.push("void main(void) {");
        src.push("bool visible      = (float(flags.x) > 0.0);");
        src.push("bool transparent  = ((float(color.a) / 255.0) < 1.0);");
        src.push(`if (!visible || transparent) {`);
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("} else {");
        src.push("  vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
        src.push("  worldPosition = vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("  vec4 viewPosition  = shadowViewMatrix * worldPosition; ");

        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags2 = flags2;");
        }
        src.push("  gl_Position = shadowProjMatrix * viewPosition;");
        src.push("}");
        src.push("gl_PointSize = pointSize;");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("// Instancing geometry depth drawing fragment shader");
        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("#extension GL_EXT_frag_depth : enable");
        }
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("uniform float logDepthBufFC;");
            src.push("varying float vFragDepth;");
        }
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("varying vec3 vViewNormal;");
        src.push("vec3 packNormalToRGB( const in vec3 normal ) {");
        src.push("    return normalize( normal ) * 0.5 + 0.5;");
        src.push("}");
        src.push("void main(void) {");
        src.push("  vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
        src.push("  float r = dot(cxy, cxy);");
        src.push("  if (r > 1.0) {");
        src.push("       discard;");
        src.push("  }");
        if (clipping) {
            src.push("  bool clippable = (float(vFlags2.x) > 0.0);");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("gl_FragDepthEXT = log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("    gl_FragColor = vec4(packNormalToRGB(vViewNormal), 1.0); ");
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

export {PointsInstancingShadowRenderer};