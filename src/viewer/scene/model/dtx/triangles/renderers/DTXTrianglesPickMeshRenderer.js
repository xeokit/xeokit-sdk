import {Program} from "../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class DTXTrianglesPickMeshRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        const gl = scene.canvas.gl;

        this._programName = "DTXTrianglesPickMeshRenderer";
        this._useLogDepthBuffer = scene.logarithmicDepthBufferEnabled;
        this._fragDepthDiff = (vFragDepth) => "0.0";
        this._getViewParams = (frameCtx, camera) => ({
            viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
            projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
            eye: frameCtx.pickOrigin || camera.eye,
            far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
        });
        // flags.w = NOT_RENDERED | PICK
        // renderPass = PICK
        this._renderPassFlag = "w";
        this._cullOnAlphaZero = false;
        this._appendVertexDefinitions = (src) => {
            src.push("uniform vec2 pickClipPos;");
            src.push("uniform vec2 drawingBufferSize;");
            src.push("out vec4 vPickColor;");
        };
        // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
        this._transformClipPos = (src, clipPos) => src.push(`${clipPos}.xy = (${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w;`);
        this._needVertexColor = false;
        this._needPickColor = true;
        this._needGl_Position = false;
        this._needViewMatrixPositionNormal = false;
        this._appendVertexOutputs = (src, color, pickColor, gl_Position, view) => src.push(`vPickColor = ${pickColor} / 255.0;`);
        this._appendFragmentDefinitions = (src) => {
            src.push("in vec4 vPickColor;");
            src.push("out vec4 outPickColor;");
        };
        this._needvWorldPosition = false;
        this._needGl_FragCoord = false;
        this._appendFragmentOutputs = (src, vWorldPosition, gl_FragCoord) => src.push("outPickColor = vPickColor;");
        this._setupInputs = (program) => {
            this._uPickClipPos = program.getLocation("pickClipPos");
            this._uDrawingBufferSize = program.getLocation("drawingBufferSize");
        };
        this._setRenderState = (frameCtx, dataTextureLayer, renderPass, rtcOrigin) => {
            gl.uniform2fv(this._uPickClipPos, frameCtx.pickClipPos);
            gl.uniform2f(this._uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
        };
        this._getGlMode = (frameCtx) => gl.TRIANGLES;

        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    }

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, dataTextureLayer, renderPass) {
        if (!this._program) {
            this._allocate();
            if (!this._program) {
                return;
            }
        }

        const program = this._program;

        if (frameCtx.lastProgramId !== program.id) {
            frameCtx.lastProgramId = program.id;
            program.bind();
        }

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const model = dataTextureLayer.model;
        const state = dataTextureLayer._state;
        const textureState = state.textureState;
        const origin = dataTextureLayer._state.origin;
        const {position, rotationMatrix} = model;
        const viewParams = this._getViewParams(frameCtx, scene.camera);

        textureState.bindCommonTextures(
            program,
            this._uTexturePerObjectPositionsDecodeMatrix,
            this._uTexturePerVertexIdCoordinates,
            this._uTexturePerObjectColorsAndFlags,
            this._uTexturePerObjectMatrix
        );

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
            rtcViewMatrix = createRTCViewMat(viewParams.viewMatrix, rtcOrigin, tempMat4a);
        } else {
            rtcViewMatrix = viewParams.viewMatrix;
        }

        gl.uniformMatrix4fv(this._uSceneModelMatrix, false, rotationMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, rtcViewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, viewParams.projMatrix);
        gl.uniform3fv(this._uCameraEyeRtc, math.subVec3(viewParams.eye, rtcOrigin, tempVec3b));
        gl.uniform1i(this._uRenderPass, renderPass);

        this._setRenderState(frameCtx, dataTextureLayer, renderPass, rtcOrigin);

        if (this._useLogDepthBuffer) {
            const logDepthBufFC = 2.0 / (Math.log(viewParams.far + 1.0) / Math.LN2);
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
                                const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3b, model.matrix);
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
        const glMode = this._getGlMode(frameCtx);
        if (state.numIndices8Bits > 0) {
            textureState.bindTriangleIndicesTextures(
                program,
                this._uTexturePerPrimitiveIdPortionIds,
                this._uTexturePerPrimitiveIdIndices,
                8 // 8 bits indices
            );
            gl.drawArrays(glMode, 0, state.numIndices8Bits);
        }
        if (state.numIndices16Bits > 0) {
            textureState.bindTriangleIndicesTextures(
                program,
                this._uTexturePerPrimitiveIdPortionIds,
                this._uTexturePerPrimitiveIdIndices,
                16 // 16 bits indices
            );
            gl.drawArrays(glMode, 0, state.numIndices16Bits);
        }
        if (state.numIndices32Bits > 0) {
            textureState.bindTriangleIndicesTextures(
                program,
                this._uTexturePerPrimitiveIdPortionIds,
                this._uTexturePerPrimitiveIdIndices,
                32 // 32 bits indices
            );
            gl.drawArrays(glMode, 0, state.numIndices32Bits);
        }
        frameCtx.drawElements++;
    }

    _allocate() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = new Program(gl, {
            vertex:   this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            return;
        }

        this._program = program;

        this._uRenderPass = program.getLocation("renderPass");
        this._uSceneModelMatrix = program.getLocation("sceneModelMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uCameraEyeRtc = program.getLocation("uCameraEyeRtc");

        this._uSectionPlanes = [];
        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        if (this._useLogDepthBuffer) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uTexturePerObjectPositionsDecodeMatrix = "uObjectPerObjectPositionsDecodeMatrix";
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates";
        this._uTexturePerObjectColorsAndFlags = "uObjectPerObjectColorsAndFlags";
        this._uTexturePerObjectMatrix = "uTexturePerObjectMatrix";
        this._uTexturePerPrimitiveIdPortionIds = "uTexturePerPrimitiveIdPortionIds";
        this._uTexturePerPrimitiveIdIndices = "uTexturePerPrimitiveIdIndices";

        this._setupInputs(program);
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// " + this._programName + " vertex shader");
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

        src.push("uniform mat4 sceneModelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");

        src.push("uniform highp sampler2D uObjectPerObjectPositionsDecodeMatrix;");
        src.push("uniform highp sampler2D uTexturePerObjectMatrix;");
        src.push("uniform lowp usampler2D uObjectPerObjectColorsAndFlags;");
        src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;");
        src.push("uniform highp usampler2D uTexturePerPrimitiveIdIndices;");
        src.push("uniform mediump usampler2D uTexturePerPrimitiveIdPortionIds;");
        src.push("uniform vec3 uCameraEyeRtc;");

        if (this._useLogDepthBuffer) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("out float isPerspective;");
        }

        if (this._needvWorldPosition || clipping) {
            src.push("out " + (this._needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
        }
        if (clipping) {
            src.push("flat out uint vFlags2;");
        }

        this._appendVertexDefinitions(src);

        src.push("void main(void) {");

        // constants
        src.push("int primitiveIndex = gl_VertexID / 3;");

        // get packed object-id
        src.push("int h_packed_object_id_index = (primitiveIndex >> 3) & 4095;");
        src.push("int v_packed_object_id_index = (primitiveIndex >> 3) >> 12;");

        src.push("int objectIndex = int(texelFetch(uTexturePerPrimitiveIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");
        src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
        src.push("uvec4 flags2 = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

        src.push("if (int(flags." + this._renderPassFlag + ") != renderPass) {");
        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("   return;"); // Cull vertex
        src.push("}");

        if (this._cullOnAlphaZero || this._needVertexColor) {
            src.push("uvec4 color = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0);");
        }
        if (this._cullOnAlphaZero) {
            src.push(`if (color.a == 0u) {`);
            src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
            src.push("   return;");
            src.push("}");
        }

        src.push("{");

        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
        src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+5, objectIndexCoords.y), 0));");
        src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

        src.push("int h_index = (primitiveIndex - indexBaseOffset) & 4095;");
        src.push("int v_index = (primitiveIndex - indexBaseOffset) >> 12;");

        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPrimitiveIdIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;");

        src.push("ivec3 indexPositionH = uniqueVertexIndexes & 4095;");
        src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 12;");

        src.push("mat4 objectInstanceMatrix = mat4 (texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

        src.push("mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4 (texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

        src.push("uint solid = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+7, objectIndexCoords.y), 0).r;");
        src.push("vec3 positions[] = vec3[](");
        src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0)),");
        src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0)),");
        src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0)));");
        src.push("vec3 normal = normalize(cross(positions[2] - positions[0], positions[1] - positions[0]));");
        src.push("vec3 position = positions[gl_VertexID % 3];");
        if (this._needViewMatrixPositionNormal) {
            src.push("vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
        }
        // when the geometry is not solid, if needed, flip the triangle winding
        src.push("if (solid != 1u) {");
        src.push(`  if (${isPerspectiveMatrix("projMatrix")}) {`);
        src.push("      vec3 uCameraEyeRtcInQuantizedSpace = (inverse(sceneModelMatrix * objectDecodeAndInstanceMatrix) * vec4(uCameraEyeRtc, 1)).xyz;");
        src.push("      if (dot(position.xyz - uCameraEyeRtcInQuantizedSpace, normal) < 0.0) {");
        src.push("          position = positions[2 - (gl_VertexID % 3)];");
        if (this._needViewMatrixPositionNormal) {
            src.push("          viewNormal = -viewNormal;");
        }
        src.push("      }");
        src.push("  } else {");
        if (!this._needViewMatrixPositionNormal) {
            src.push("      vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
        }
        src.push("      if (viewNormal.z < 0.0) {");
        src.push("          position = positions[2 - (gl_VertexID % 3)];");
        if (this._needViewMatrixPositionNormal) {
            src.push("          viewNormal = -viewNormal;");
        }
        src.push("      }");
        src.push("  }");
        src.push("}");

        src.push("vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));");
        src.push("vec4 viewPosition = viewMatrix * worldPosition;");

        if (this._needvWorldPosition || clipping) {
            src.push("vWorldPosition = worldPosition;");
        }
        if (clipping) {
            src.push("vFlags2 = flags2.r;");
        }

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (this._useLogDepthBuffer) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
        }
        this._transformClipPos(src, "clipPos");
        src.push("gl_Position = clipPos;");

        if (this._needPickColor) {
            // TODO: Normalize color "/ 255.0"?
            src.push("vec4 pickColor = vec4(texelFetch(uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+1, objectIndexCoords.y), 0));");
        }
        this._appendVertexOutputs(src, this._needVertexColor && "color", this._needPickColor && "pickColor", this._needGl_Position &&"gl_Position", this._needViewMatrixPositionNormal && {viewMatrix: "viewMatrix", viewPosition: "viewPosition", viewNormal: "viewNormal"});

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
        src.push("// " + this._programName + " fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");

        if (this._useLogDepthBuffer) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }

        if (this._needvWorldPosition || clipping) {
            src.push("in " + (this._needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
        }
        if (clipping) {
            src.push("flat in uint vFlags2;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }

        this._appendFragmentDefinitions(src);

        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0u;");
            src.push("  if (clippable) {");
            src.push("      float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("      if (sectionPlaneActive" + i + ") {");
                src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("      }");
            }
            src.push("      if (dist > 0.0) { discard; }");
            src.push("  }");
        }

        if (this._useLogDepthBuffer) {
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth + " + this._fragDepthDiff("vFragDepth") + " ) * logDepthBufFC * 0.5;");
        }

        this._appendFragmentOutputs(src, this._needvWorldPosition && "vWorldPosition", this._needGl_FragCoord && "gl_FragCoord");

        src.push("}");
        return src;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
    }
}
