import {Program} from "../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec4a = math.vec4();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class DTXTrianglesColorRenderer {

    constructor(scene, withSAO) {
        this._scene = scene;
        this._withSAO = withSAO;
        this._hash = this._getHash();
        const gl = scene.canvas.gl;

        this._programName = "DTXTrianglesColorRenderer";
        this._useLogDepthBuffer = scene.logarithmicDepthBufferEnabled;
        this._getLogDepthFar = (frameCtx, cameraProjectFar) => cameraProjectFar;
        this._fragDepthDiff = (vFragDepth) => "0.0";
        this._usePickMatrix = false;
        // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
        // renderPass = COLOR_OPAQUE
        this._renderPassFlag = "x";
        this._cullOnAlphaZero = true;
        this._appendVertexDefinitions = (src) => {
            src.push("uniform vec4 lightAmbient;");
            const lightsState = scene._lightsState;
            for (let i = 0, len = lightsState.lights.length; i < len; i++) {
                const light = lightsState.lights[i];
                if (light.type === "ambient") {
                    continue;
                }
                src.push("uniform vec4 lightColor" + i + ";");
                if (light.type === "dir") {
                    src.push("uniform vec3 lightDir" + i + ";");
                }
                if (light.type === "point") {
                    src.push("uniform vec3 lightPos" + i + ";");
                }
                if (light.type === "spot") {
                    src.push("uniform vec3 lightPos" + i + ";");
                    src.push("uniform vec3 lightDir" + i + ";");
                }
            }
            src.push("out vec4 vColor;");
        };
        this._transformClipPos = (src, clipPos) => { };
        this._needVertexColor = true;
        this._needPickColor = false;
        this._needGl_Position = false;
        this._needViewMatrixPositionNormal = true;
        this._appendVertexOutputs = (src, color, pickColor, gl_Position, view) => {
            const lightsState = scene._lightsState;
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
            src.push("float lambertian = 1.0;");
            for (let i = 0, len = lightsState.lights.length; i < len; i++) {
                const light = lightsState.lights[i];
                if (light.type === "ambient") {
                    continue;
                }
                if (light.type === "dir") {
                    if (light.space === "view") {
                        src.push(`viewLightDir = normalize(lightDir${i});`);
                    } else {
                        src.push(`viewLightDir = normalize((${view.viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                    }
                } else if (light.type === "point") {
                    if (light.space === "view") {
                        src.push(`viewLightDir = -normalize(lightPos${i} - ${view.viewPosition}.xyz);`);
                    } else {
                        src.push(`viewLightDir = -normalize((${view.viewMatrix} * vec4(lightPos${i}, 0.0)).xyz);`);
                    }
                } else if (light.type === "spot") {
                    if (light.space === "view") {
                        src.push(`viewLightDir = normalize(lightDir${i});`);
                    } else {
                        src.push(`viewLightDir = normalize((${view.viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                    }
                } else {
                    continue;
                }
                src.push(`lambertian = max(dot(-${view.viewNormal}, viewLightDir), 0.0);`);
                src.push(`reflectedColor += lambertian * (lightColor${i}.rgb * lightColor${i}.a);`);
            }
            src.push(`vColor = vec4(lightAmbient.rgb * lightAmbient.a + reflectedColor, 1) * vec4(${color}) / 255.0;`);
        };
        this._appendFragmentDefinitions = (src) => {
            src.push("in vec4 vColor;");
            if (this._withSAO) {
                src.push("uniform sampler2D uOcclusionTexture;");
                src.push("uniform vec4      uSAOParams;");
                src.push("const float       packUpscale = 256. / 255.;");
                src.push("const float       unpackDownScale = 255. / 256.;");
                src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
                src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");
                src.push("float unpackRGBToFloat( const in vec4 v ) {");
                src.push("    return dot( v, unPackFactors );");
                src.push("}");
            }
            src.push("out vec4 outColor;");
        };
        this._needvWorldPosition = false;
        this._needGl_FragCoord = true;
        this._appendFragmentOutputs = (src, vWorldPosition, gl_FragCoord) => {
            if (this._withSAO) {
                // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                src.push("   float viewportWidth     = uSAOParams[0];");
                src.push("   float viewportHeight    = uSAOParams[1];");
                src.push("   float blendCutoff       = uSAOParams[2];");
                src.push("   float blendFactor       = uSAOParams[3];");
                src.push(`   vec2 uv                 = vec2(${gl_FragCoord}.x / viewportWidth, ${gl_FragCoord}.y / viewportHeight);`);
                src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
                src.push("   outColor            = vec4(vColor.rgb * ambient, vColor.a);");
            } else {
                src.push("   outColor            = vColor;");
            }
        };
        this._setupInputs = (program) => {
            this._uLightAmbient = program.getLocation("lightAmbient");
            this._uLightColor = [];
            this._uLightDir = [];
            this._uLightPos = [];
            this._uLightAttenuation = [];
            const lights = scene._lightsState.lights;
            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                switch (light.type) {
                case "dir":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = null;
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = null;
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                }
            }
            if (this._withSAO) {
                this._uOcclusionTexture = "uOcclusionTexture";
                this._uSAOParams = program.getLocation("uSAOParams");
            }
        };
        this._setRenderState = (frameCtx, dataTextureLayer, renderPass, rtcOrigin) => {
            const lightsState = scene._lightsState;
            if (this._uLightAmbient) {
                gl.uniform4fv(this._uLightAmbient, lightsState.getAmbientColorAndIntensity());
            }
            const lights = lightsState.lights;
            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                if (this._uLightColor[i]) {
                    gl.uniform4f(this._uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
                }
                if (this._uLightPos[i]) {
                    gl.uniform3fv(this._uLightPos[i], light.pos);
                    if (this._uLightAttenuation[i]) {
                        gl.uniform1f(this._uLightAttenuation[i], light.attenuation);
                    }
                }
                if (this._uLightDir[i]) {
                    gl.uniform3fv(this._uLightDir[i], light.dir);
                }
            }
            if (this._withSAO) {
                const sao = scene.sao;
                const saoEnabled = sao.possible;
                if (saoEnabled) {
                    const viewportWidth = gl.drawingBufferWidth;
                    const viewportHeight = gl.drawingBufferHeight;
                    tempVec4a[0] = viewportWidth;
                    tempVec4a[1] = viewportHeight;
                    tempVec4a[2] = sao.blendCutoff;
                    tempVec4a[3] = sao.blendFactor;
                    gl.uniform4fv(this._uSAOParams, tempVec4a);
                    this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, 10);
                }
            }
        };
        this._getGlMode = (frameCtx) => gl.TRIANGLES;

        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    }

    _getHash() {
        const scene = this._scene;
        return [scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
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
        const camera = scene.camera;
        const model = dataTextureLayer.model;
        const state = dataTextureLayer._state;
        const textureState = state.textureState;
        const origin = dataTextureLayer._state.origin;
        const {position, rotationMatrix} = model;
        const viewMatrix = (this._usePickMatrix && frameCtx.pickViewMatrix) || camera.viewMatrix;

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
            rtcViewMatrix = createRTCViewMat(viewMatrix, rtcOrigin, tempMat4a);
        } else {
            rtcViewMatrix = viewMatrix;
        }

        gl.uniformMatrix4fv(this._uSceneModelMatrix, false, rotationMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, rtcViewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera.projMatrix);
        gl.uniform3fv(this._uCameraEyeRtc, math.subVec3(camera.eye, rtcOrigin, tempVec3b));
        gl.uniform1i(this._uRenderPass, renderPass);

        this._setRenderState(frameCtx, dataTextureLayer, renderPass, rtcOrigin);

        if (this._useLogDepthBuffer) {
            const logDepthBufFC = 2.0 / (Math.log(this._getLogDepthFar(frameCtx, camera.project.far) + 1.0) / Math.LN2);
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
