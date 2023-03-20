import {Program} from "../../../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../../math/rtcCoords.js";
import {math} from "../../../../../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
class TrianglesDataTextureEdgesColorRenderer {

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
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
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

        if (state.numEdgeIndices8Bits > 0)
        {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds, 
                this._uTexturePerPolygonIdEdgeIndices, 
                8 // 8 bits edge indices
            );

            gl.drawArrays(gl.LINES, 0, state.numEdgeIndices8Bits);
        }

        if (state.numEdgeIndices16Bits > 0)
        {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds, 
                this._uTexturePerPolygonIdEdgeIndices, 
                16 // 16 bits edge indices
            );

            gl.drawArrays(gl.LINES, 0, state.numEdgeIndices16Bits);
        }

        if (state.numEdgeIndices32Bits > 0)
        {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds, 
                this._uTexturePerPolygonIdEdgeIndices, 
                32 // 32 bits edge indices
            );

            gl.drawArrays(gl.LINES, 0, state.numEdgeIndices32Bits);
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
        
        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        //this._aOffset = program.getAttribute("offset");

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uTexturePerObjectIdPositionsDecodeMatrix = "uTexturePerObjectIdPositionsDecodeMatrix"; // chipmunk
        this._uTexturePerObjectIdColorsAndFlags = "uTexturePerObjectIdColorsAndFlags"; // chipmunk
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates"; // chipmunk
        this._uTexturePerPolygonIdEdgeIndices = "uTexturePerPolygonIdEdgeIndices"; // chipmunk
        this._uTexturePerEdgeIdPortionIds = "uTexturePerEdgeIdPortionIds"; // chipmunk
        this._uTextureCameraMatrices = "uTextureCameraMatrices"; // chipmunk
        this._uTextureModelMatrices = "uTextureModelMatrices"; // chipmunk
        this._uTexturePerObjectIdOffsets = "uTexturePerObjectIdOffsets"; // chipmunk
    }

    _bindProgram() {

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
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Batched geometry edges drawing vertex shader");

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

        src.push("uniform highp sampler2D uTexturePerObjectIdPositionsDecodeMatrix;"); // chipmunk
        src.push("uniform lowp usampler2D uTexturePerObjectIdColorsAndFlags;"); // chipmunk
        src.push("uniform highp sampler2D uTexturePerObjectIdOffsets;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;"); // chipmunk
        src.push("uniform highp usampler2D uTexturePerPolygonIdEdgeIndices;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerEdgeIdPortionIds;"); // chipmunk
        src.push("uniform highp sampler2D uTextureCameraMatrices;"); // chipmunk
        src.push("uniform highp sampler2D uTextureModelMatrices;"); // chipmunk


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
        src.push("out vec4 vColor;");

        src.push("void main(void) {");

        // camera matrices
        src.push ("mat4 viewMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 0), 0));");
        src.push ("mat4 projMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 2), 0));");

        // model matrices
        src.push ("mat4 worldMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 0), 0), texelFetch (uTextureModelMatrices, ivec2(1, 0), 0), texelFetch (uTextureModelMatrices, ivec2(2, 0), 0), texelFetch (uTextureModelMatrices, ivec2(3, 0), 0));");
        
        // constants
        src.push("int edgeIndex = gl_VertexID / 2;")

        // get packed object-id
        src.push("int h_packed_object_id_index = (edgeIndex >> 3) & 1023;")
        src.push("int v_packed_object_id_index = (edgeIndex >> 3) >> 10;")

        src.push("int objectIndex = int(texelFetch(uTexturePerEdgeIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(2, objectIndex), 0);"); // chipmunk
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(3, objectIndex), 0);"); // chipmunk
        
        // flags.z = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT
        
        src.push(`if (int(flags.z) != renderPass) {`);
        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("   return;"); // Cull vertex
        src.push("} else {");

        // get vertex base
        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(4, objectIndex), 0));");

        src.push("ivec4 packedEdgeIndexBaseOffset = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(6, objectIndex), 0));");

        src.push("int edgeIndexBaseOffset = (packedEdgeIndexBaseOffset.r << 24) + (packedEdgeIndexBaseOffset.g << 16) + (packedEdgeIndexBaseOffset.b << 8) + packedEdgeIndexBaseOffset.a;");

        src.push("int h_index = (edgeIndex - edgeIndexBaseOffset) & 1023;")
        src.push("int v_index = (edgeIndex - edgeIndexBaseOffset) >> 10;")

        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPolygonIdEdgeIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")
        
        src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 1023;")
        src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 10;")

        src.push("mat4 positionsDecodeMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(0, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(1, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(2, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(3, objectIndex), 0));")
        src.push("mat4 entityMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(4, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(5, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(6, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(7, objectIndex), 0));")

        src.push("positionsDecodeMatrix = entityMatrix * positionsDecodeMatrix;")

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(2, objectIndex), 0);"); // chipmunk
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(3, objectIndex), 0);"); // chipmunk
        
        // get position
        src.push("vec3 position = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH, indexPositionV), 0));")

        // get color
        src.push("uvec4 color = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(0, objectIndex), 0);"); // chipmunk

        src.push(`if (color.a == 0u) {`);
        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("   return;");
        src.push("};");

        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");

        // get XYZ offset
        src.push("vec3 offset = texelFetch (uTexturePerObjectIdOffsets, ivec2(0, objectIndex), 0).rgb;");

        src.push("worldPosition.xyz = worldPosition.xyz + offset;");

        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");

        if (clipping) {
            src.push("  vWorldPosition = worldPosition;");
            src.push("  vFlags2 = flags2;");
        }

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        src.push("vec4 rgb = vec4(color.rgba);");
        //src.push("vColor = vec4(float(color.r-100.0) / 255.0, float(color.g-100.0) / 255.0, float(color.b-100.0) / 255.0, float(color.a) / 255.0);");
        src.push("vColor = vec4(float(rgb.r*0.5) / 255.0, float(rgb.g*0.5) / 255.0, float(rgb.b*0.5) / 255.0, float(rgb.a) / 255.0);");
        src.push("}");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// Batched geometry edges drawing fragment shader");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("#extension GL_EXT_frag_depth : enable");
        }
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
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vColor;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
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

export {TrianglesDataTextureEdgesColorRenderer};