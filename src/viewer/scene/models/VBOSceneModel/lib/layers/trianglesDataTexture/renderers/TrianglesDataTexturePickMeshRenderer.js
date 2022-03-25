import {Program} from "../../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../math/rtcCoords.js";
import {math} from "../../../../../math/math.js";
import {WEBGL_INFO} from "../../../../../webglInfo.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
class TrianglesDataTexturePickMeshRenderer {

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
        const model = dataTextureLayer.model;
        const scene = model.scene;
        const camera = scene.camera;
        const gl = scene.canvas.gl;
        const state = dataTextureLayer._state;
        const textureState = state.textureState;
        const origin = dataTextureLayer._state.origin;

        if (!this._program) {
            this._allocate(dataTextureLayer);
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }
        
        textureState.bindCommonTextures (
            this._program,
            this._uTexturePerObjectIdPositionsDecodeMatrix, 
            this._uTexturePerVertexIdCoordinates, 
            this._uTexturePerObjectIdColorsAndFlags, 
            this._uTextureCameraMatrices, 
            this._uTextureModelMatrices,
            this._uTexturePerObjectIdOffsets
        );

        gl.uniform1i(this._uRenderPass, renderPass);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(camera.project.far + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = dataTextureLayer.layerIndex * numSectionPlanes;
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

        if (state.numIndices8Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                8 // 8 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices8Bits);
        }

        if (state.numIndices16Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                16 // 16 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices16Bits);
        }
        
        if (state.numIndices32Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                32 // 32 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices32Bits);
        }

        frameCtx.drawElements++;
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

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        
        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uTexturePerObjectIdPositionsDecodeMatrix = "uTexturePerObjectIdPositionsDecodeMatrix"; // chipmunk
        this._uTexturePerObjectIdColorsAndFlags = "uTexturePerObjectIdColorsAndFlags"; // chipmunk
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates"; // chipmunk
        this._uTexturePerPolygonIdNormals = "uTexturePerPolygonIdNormals"; // chipmunk
        this._uTexturePerPolygonIdIndices = "uTexturePerPolygonIdIndices"; // chipmunk
        this._uTexturePerPolygonIdPortionIds = "uTexturePerPolygonIdPortionIds"; // chipmunk
        this._uTextureCameraMatrices = "uTextureCameraMatrices"; // chipmunk
        this._uTextureModelMatrices = "uTextureModelMatrices"; // chipmunk
        this._uTexturePerObjectIdOffsets = "uTexturePerObjectIdOffsets"; // chipmunk
    }

    _bindProgram(frameCtx) {

        const scene = this._scene;
        const gl = scene.canvas.gl;

        this._program.bind();

        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);
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
        src.push("// Batched geometry picking vertex shader");

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
            src.push("in vec3 offset;");
        }

        src.push("uniform bool pickInvisible;");
        // src.push("uniform sampler2D uOcclusionTexture;"); // chipmunk

        src.push("uniform mediump sampler2D uTexturePerObjectIdPositionsDecodeMatrix;"); // chipmunk
        src.push("uniform lowp usampler2D uTexturePerObjectIdColorsAndFlags;"); // chipmunk
        src.push("uniform highp sampler2D uTexturePerObjectIdOffsets;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;"); // chipmunk
        src.push("uniform highp usampler2D uTexturePerPolygonIdIndices;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerPolygonIdPortionIds;"); // chipmunk
        src.push("uniform highp sampler2D uTextureCameraMatrices;"); // chipmunk
        src.push("uniform highp sampler2D uTextureModelMatrices;"); // chipmunk

        src.push("vec3 positions[3];")

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
            src.push("out int vFlags2;");
        }

        src.push("out vec4 vPickColor;");

        src.push("void main(void) {");

        // camera matrices
        src.push ("mat4 viewMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 0), 0));");
        src.push ("mat4 viewNormalMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 1), 0));");
        src.push ("mat4 projMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 2), 0));");

        // model matrices
        src.push ("mat4 worldMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 0), 0), texelFetch (uTextureModelMatrices, ivec2(1, 0), 0), texelFetch (uTextureModelMatrices, ivec2(2, 0), 0), texelFetch (uTextureModelMatrices, ivec2(3, 0), 0));");
        src.push ("mat4 worldNormalMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 1), 0), texelFetch (uTextureModelMatrices, ivec2(1, 1), 0), texelFetch (uTextureModelMatrices, ivec2(2, 1), 0), texelFetch (uTextureModelMatrices, ivec2(3, 1), 0));");

        // constants
        src.push("int polygonIndex = gl_VertexID / 3;")

        // get packed object-id
        src.push("int h_packed_object_id_index = (polygonIndex >> 3) & 1023;")
        src.push("int v_packed_object_id_index = (polygonIndex >> 3) >> 10;")

        src.push("int objectIndex = int(texelFetch(uTexturePerPolygonIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(2, objectIndex), 0);"); // chipmunk
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(3, objectIndex), 0);"); // chipmunk
        
        // flags.w = NOT_RENDERED | PICK
        // renderPass = PICK

        src.push(`if (int(flags.w) != renderPass) {`);
        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("   return;"); // Cull vertex
        src.push("} else {");

        // get vertex base
        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(4, objectIndex), 0));");

        src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(5, objectIndex), 0));");

        src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

        src.push("int h_index = (polygonIndex - indexBaseOffset) & 1023;")
        src.push("int v_index = (polygonIndex - indexBaseOffset) >> 10;")

        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPolygonIdIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")
        
        src.push("ivec3 indexPositionH = uniqueVertexIndexes & 1023;")
        src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 10;")

        src.push("mat4 positionsDecodeMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(0, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(1, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(2, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(3, objectIndex), 0));")
        src.push("mat4 entityMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(4, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(5, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(6, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(7, objectIndex), 0));")

        src.push("positionsDecodeMatrix = entityMatrix * positionsDecodeMatrix;")
        
        // get position
        src.push("positions[0] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0));")
        src.push("positions[1] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0));")
        src.push("positions[2] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0));")

        // get pick-color
        src.push("vPickColor = vec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(1, objectIndex), 0)) / 255.0;");

        src.push("vec3 position = positions[gl_VertexID % 3];");
        
        src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");

        // get XYZ offset
        src.push("vec3 offset = texelFetch (uTexturePerObjectIdOffsets, ivec2(0, objectIndex), 0).rgb;");

        src.push("worldPosition.xyz = worldPosition.xyz + offset;");

        src.push("vec4 viewPosition = viewMatrix * worldPosition; ");

        if (clipping) {
            src.push("      vWorldPosition = worldPosition;");
            src.push("      vFlags2 = flags2;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
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
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// Batched geometry picking fragment shader");
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
            src.push("in int vFlags2;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vPickColor;");
        src.push("out vec4 outPickColor;");
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
        if (scene.logarithmicDepthBufferEnabled) {
            // src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
            src.push("    gl_FragDepth = log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("   outPickColor = vPickColor; ");
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

export {TrianglesDataTexturePickMeshRenderer};