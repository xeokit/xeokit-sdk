import {Program} from "../../../../webgl/Program.js";
import {math} from "../../../../math/math.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

/**
 * @private
 */
export class DTXLinesColorRenderer {

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

    drawLayer(frameCtx, dataTextureLayer, renderPass) {

        const scene = this._scene;
        const camera = scene.camera;
        const model = dataTextureLayer.model;
        const gl = scene.canvas.gl;
        const state = dataTextureLayer._state;
        const textureState = state.textureState;
        const origin = dataTextureLayer._state.origin;
        const {position, rotationMatrix} = model;
        const viewMatrix = camera.viewMatrix;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx, state);
        }

        textureState.bindCommonTextures(
            this._program,
            this.uPerObjectDecodeMatrix,
            this._uPerVertexPosition,
            this.uPerObjectColorAndFlags,
            this._uPerObjectMatrix
        );

        let rtcViewMatrix;

        const gotOrigin = (origin[0] !== 0 || origin[1] !== 0 || origin[2] !== 0);
        const gotPosition = (position[0] !== 0 || position[1] !== 0 || position[2] !== 0);
        if (gotOrigin || gotPosition) {
            const rtcOrigin = tempVec3a;
            if (gotOrigin) {
                const rotatedOrigin = math.transformPoint3(rotationMatrix, origin, tempVec3b);
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
        } else {
            rtcViewMatrix = viewMatrix;
        }

        gl.uniformMatrix4fv(this._uSceneModelMatrix, false, rotationMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, rtcViewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera.projMatrix);
        gl.uniform1i(this._uRenderPass, renderPass);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numAllocatedSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = dataTextureLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    if (sectionPlaneIndex < numSectionPlanes) {
                        const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                        gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            if (origin) {
                                const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a, model.matrix);
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

        if (state.numIndices8Bits > 0) {
            textureState.bindLineIndicesTextures(
                this._program,
                this._uPerLineObject,
                this._uPerLineIndices,
                8 // 8 bits indices
            );
            gl.drawArrays(gl.LINES, 0, state.numIndices8Bits);
        }

        if (state.numIndices16Bits > 0) {
            textureState.bindLineIndicesTextures(
                this._program,
                this._uPerLineObject,
                this._uPerLineIndices,
                16 // 16 bits indices
            );
            gl.drawArrays(gl.LINES, 0, state.numIndices16Bits);
        }

        if (state.numIndices32Bits > 0) {
            textureState.bindLineIndicesTextures(
                this._program,
                this._uPerLineObject,
                this._uPerLineIndices,
                32 // 32 bits indices
            );
            gl.drawArrays(gl.LINES, 0, state.numIndices32Bits);
        }

        frameCtx.drawElements++;
    }

    _allocate() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        this._program = new Program(gl, this._buildShader());
        if (this._program.errors) {
            this.errors = this._program.errors;
            console.error(this.errors);
            return;
        }
        const program = this._program;
        this._uRenderPass = program.getLocation("renderPass");
        this._uSceneModelMatrix = program.getLocation("sceneModelMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];
        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
        this.uPerObjectDecodeMatrix = "uPerObjectDecodeMatrix";
        this.uPerObjectColorAndFlags = "uPerObjectColorAndFlags";
        this._uPerVertexPosition = "uPerVertexPosition";
        this._uPerLineIndices = "uPerLineIndices";
        this._uPerLineObject = "uPerLineObject";
        this._uPerObjectMatrix= "uPerObjectMatrix";
        this._uCameraEyeRtc = program.getLocation("uCameraEyeRtc");
    }

    _bindProgram(frameCtx) {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const project = scene.camera.project;
        program.bind();
        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// LinesDataTextureColorRenderer");
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

        if (scene.entityOffsetsEnabled) {
            //    src.push("in vec3 offset;");
        }

        src.push("uniform mat4 sceneModelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");

        src.push("uniform highp sampler2D uPerObjectDecodeMatrix;");
        src.push("uniform highp sampler2D uPerObjectMatrix;");
        src.push("uniform lowp usampler2D uPerObjectColorAndFlags;");
        src.push("uniform mediump usampler2D uPerVertexPosition;");
        src.push("uniform highp usampler2D uPerLineIndices;");
        src.push("uniform mediump usampler2D uPerLineObject;");

        //  src.push("uniform vec4 color;");

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("flat out uint vFlags2;");
        }
        src.push("out vec4 vColor;");
        src.push("void main(void) {");

        src.push("  int lineIndex = gl_VertexID / 2;")

        src.push("  int h_packed_object_id_index = (lineIndex >> 3) & 4095;")
        src.push("  int v_packed_object_id_index = (lineIndex >> 3) >> 12;")

        src.push("  int objectIndex = int(texelFetch(uPerLineObject, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");

        src.push("  ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

        src.push("  uvec4 flags = texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
        src.push("  uvec4 flags2 = texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

        // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
        // renderPass = COLOR_OPAQUE

        src.push(`  if (int(flags.x) != renderPass) {`);
        src.push("      gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("      return;"); // Cull vertex
        src.push("  } else {");

        src.push("      ivec4 packedVertexBase = ivec4(texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
        src.push("      ivec4 packedLineIndexBaseOffset = ivec4(texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+6, objectIndexCoords.y), 0));");
        src.push("      int lineIndexBaseOffset = (packedLineIndexBaseOffset.r << 24) + (packedLineIndexBaseOffset.g << 16) + (packedLineIndexBaseOffset.b << 8) + packedLineIndexBaseOffset.a;");
        src.push("      int h_index = (lineIndex - lineIndexBaseOffset) & 4095;")
        src.push("      int v_index = (lineIndex - lineIndexBaseOffset) >> 12;")
        src.push("      ivec3 vertexIndices = ivec3(texelFetch(uPerLineIndices, ivec2(h_index, v_index), 0));");
        src.push("      ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")

        src.push("      int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;")
        src.push("      int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;")

        src.push("      mat4 objectInstanceMatrix = mat4 (texelFetch (uPerObjectMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uPerObjectMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uPerObjectMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uPerObjectMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));")
        src.push("      mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4 (texelFetch (uPerObjectDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uPerObjectDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uPerObjectDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uPerObjectDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));")

        src.push("      uvec4 flags = texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
        src.push("      uvec4 flags2 = texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

        src.push("      vec3 position = vec3(texelFetch(uPerVertexPosition, ivec2(indexPositionH, indexPositionV), 0));")

        src.push("      uvec4 color = texelFetch (uPerObjectColorAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0);");
        src.push(`      if (color.a == 0u) {`);
        src.push("          gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("          return;");
        src.push("      };");
        src.push("      vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0)); ");
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        if (clipping) {
            src.push("      vWorldPosition = worldPosition;");
            src.push("      vFlags2 = flags2.r;");
        }
        src.push("      vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("      vFragDepth = 1.0 + clipPos.w;");
            src.push("      isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("      gl_Position = clipPos;");
        src.push("      vec4 rgb = vec4(color.rgba);");
        src.push("      vColor = vec4(float(rgb.r*0.5) / 255.0, float(rgb.g*0.5) / 255.0, float(rgb.b*0.5) / 255.0, float(rgb.a) / 255.0);");
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push('#version 300 es');
        src.push("// LinesDataTextureColorRenderer fragment shader");
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
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("flat in uint vFlags2;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vColor;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0u;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { ");
            src.push("      discard;")
            src.push("  }");
            src.push("}");
        }
        if (scene.logarithmicDepthBufferEnabled) {
             src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("   outColor            = vColor;");
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
