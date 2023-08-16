import {Program} from "../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
export class TrianglesDataTextureSnapDepthRenderer {

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

        frameCtx._origin[0] = origin[0];
        frameCtx._origin[1] = origin[1];
        frameCtx._origin[2] = origin[2];

        const aabb = dataTextureLayer.aabb;
        const coordinateDivider = [
            math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT,
            math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT,
            math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT,
        ];
        frameCtx._coordinateScale[0] = math.safeInv(coordinateDivider[0]);
        frameCtx._coordinateScale[1] = math.safeInv(coordinateDivider[1]);
        frameCtx._coordinateScale[2] = math.safeInv(coordinateDivider[2]);

        if (!this._program) {
            this._allocate();
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }

        textureState.bindCommonTextures(
            this._program,
            this._uTexturePerObjectIdPositionsDecodeMatrix,
            this._uTexturePerVertexIdCoordinates,
            this._uTexturePerObjectIdColorsAndFlags,
            this._uTextureCameraMatrices,
            this._uTextureModelMatrices,
            this._uTexturePerObjectIdOffsets
        );

        let cameraEye = camera.eye;

        if (frameCtx.pickViewMatrix) {
            textureState.bindPickCameraTexture(
                this._program,
                this._uTextureCameraMatrices
            );
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
        gl.uniform1i(this._uLayerNumber, frameCtx.layerNumber);
        gl.uniform3fv(this._uCoordinateScaler, coordinateDivider);
        gl.uniform1i(this._uRenderPass, renderPass);
        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
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

        const glMode = (frameCtx.snapMode === "edge") ? gl.LINES : gl.POINTS;

        if (state.numEdgeIndices8Bits > 0) {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds,
                this._uTexturePerPolygonIdEdgeIndices,
                8 // 8 bits edge indices
            );
            gl.drawArrays(glMode, 0, state.numEdgeIndices8Bits);
        }

        if (state.numEdgeIndices16Bits > 0) {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds,
                this._uTexturePerPolygonIdEdgeIndices,
                16 // 16 bits edge indices
            );
            gl.drawArrays(glMode, 0, state.numEdgeIndices16Bits);
        }

        if (state.numEdgeIndices32Bits > 0) {
            textureState.bindEdgeIndicesTextures(
                this._program,
                this._uTexturePerEdgeIdPortionIds,
                this._uTexturePerPolygonIdEdgeIndices,
                32 // 32 bits edge indices
            );
            gl.drawArrays(glMode, 0, state.numEdgeIndices32Bits);
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
        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
        this._uTexturePerObjectIdPositionsDecodeMatrix = "uTexturePerObjectIdPositionsDecodeMatrix";
        this._uTexturePerObjectIdColorsAndFlags = "uTexturePerObjectIdColorsAndFlags";
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates";
        this._uTexturePerPolygonIdEdgeIndices = "uTexturePerPolygonIdEdgeIndices";
        this._uTexturePerEdgeIdPortionIds = "uTexturePerEdgeIdPortionIds";
        this._uTextureCameraMatrices = "uTextureCameraMatrices";
        this._uTextureModelMatrices = "uTextureModelMatrices";
        this._uTexturePerObjectIdOffsets = "uTexturePerObjectIdOffsets";
        this._uCameraEyeRtc = program.getLocation("uCameraEyeRtc");
        this.uVectorA = program.getLocation("uSnapVectorA");
        this.uInverseVectorAB = program.getLocation("uSnapInvVectorAB");
        this._uLayerNumber = program.getLocation("uLayerNumber");
        this._uCoordinateScaler = program.getLocation("uCoordinateLayer");
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

        src.push("uniform highp sampler2D uTexturePerObjectIdPositionsDecodeMatrix;");
        src.push("uniform lowp usampler2D uTexturePerObjectIdColorsAndFlags;");
        src.push("uniform highp sampler2D uTexturePerObjectIdOffsets;");
        src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;");
        src.push("uniform highp usampler2D uTexturePerPolygonIdEdgeIndices;");
        src.push("uniform mediump usampler2D uTexturePerEdgeIdPortionIds;");
        src.push("uniform highp sampler2D uTextureCameraMatrices;");
        src.push("uniform highp sampler2D uTextureModelMatrices;");
        src.push("uniform vec3 uCameraEyeRtc;");
        src.push("uniform vec2 uSnapVectorA;");
        src.push("uniform vec2 uSnapInvVectorAB;");

        src.push("vec3 positions[3];")

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("out float isPerspective;");
        }

        src.push("bool isPerspectiveMatrix(mat4 m) {");
        src.push("    return (m[2][3] == - 1.0);");
        src.push("}");

        src.push("vec2 remapClipPos(vec2 clipPos) {");
        src.push("    float x = (clipPos.x - uSnapVectorA.x) * uSnapInvVectorAB.x;");
        src.push("    float y = (clipPos.y - uSnapVectorA.y) * uSnapInvVectorAB.y;");
        src.push("    return vec2(x, y);")
        src.push("}");

        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("flat out uint vFlags2;");
        }
        src.push("out vec4 vViewPosition;");
        src.push("out highp vec3 relativeToOriginPosition;");
        src.push("void main(void) {");

        // camera matrices
        src.push("mat4 viewMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 0), 0));");
        src.push("mat4 viewNormalMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 1), 0));");
        src.push("mat4 projMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 2), 0));");

        // model matrices
        src.push("mat4 worldMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 0), 0), texelFetch (uTextureModelMatrices, ivec2(1, 0), 0), texelFetch (uTextureModelMatrices, ivec2(2, 0), 0), texelFetch (uTextureModelMatrices, ivec2(3, 0), 0));");
        src.push("mat4 worldNormalMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 1), 0), texelFetch (uTextureModelMatrices, ivec2(1, 1), 0), texelFetch (uTextureModelMatrices, ivec2(2, 1), 0), texelFetch (uTextureModelMatrices, ivec2(3, 1), 0));");

        // constants
        src.push("int edgeIndex = gl_VertexID / 2;")

        // get packed object-id
        src.push("int h_packed_object_id_index = (edgeIndex >> 3) & 4095;")
        src.push("int v_packed_object_id_index = (edgeIndex >> 3) >> 12;")

        src.push("int objectIndex = int(texelFetch(uTexturePerEdgeIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");
        src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

        src.push("{");

        // get vertex base
        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
        src.push("ivec4 packedEdgeIndexBaseOffset = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+6, objectIndexCoords.y), 0));");
        src.push("int edgeIndexBaseOffset = (packedEdgeIndexBaseOffset.r << 24) + (packedEdgeIndexBaseOffset.g << 16) + (packedEdgeIndexBaseOffset.b << 8) + packedEdgeIndexBaseOffset.a;");
        src.push("int h_index = (edgeIndex - edgeIndexBaseOffset) & 4095;")
        src.push("int v_index = (edgeIndex - edgeIndexBaseOffset) >> 12;")
        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPolygonIdEdgeIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")
        src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;")
        src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;")
        src.push("mat4 positionsDecodeMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));")
        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");
        // get position
        src.push("vec3 position = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH, indexPositionV), 0));")
        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        // get XYZ offset
        src.push("vec4 offset = vec4(texelFetch (uTexturePerObjectIdOffsets, objectIndexCoords, 0).rgb, 0.0);");
        src.push("worldPosition.xyz = worldPosition.xyz + offset.xyz;");
        src.push("relativeToOriginPosition = worldPosition.xyz;")
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        if (clipping) {
            src.push("  vWorldPosition = worldPosition;");
            src.push("  vFlags2 = flags2.r;");
        }
        src.push("vViewPosition = viewPosition;");
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        src.push("float tmp = clipPos.w;")
        src.push("clipPos.xyzw /= tmp;")
        src.push("clipPos.xy = remapClipPos(clipPos.xy);");
        src.push("clipPos.xyzw *= tmp;")
        src.push("vViewPosition = clipPos;");
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
        src.push('#version 300 es');
        src.push("// Triangles dataTexture pick depth fragment shader");
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
        src.push("uniform int uLayerNumber;");
        src.push("uniform vec3 uCoordinateLayer;");
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("flat in uint vFlags2;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in highp vec3 relativeToOriginPosition;");
        src.push("out highp ivec4 outCoords;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0u;");
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
        src.push("outCoords = ivec4(relativeToOriginPosition.xyz*uCoordinateLayer.xyz, uLayerNumber);")
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
