import {createRTCViewMat, getPlaneRTCPos, math} from "../../../math/index.js";
import {Program} from "../../../webgl/Program.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class DTXTrianglesDrawable {

    constructor(scene, cfg) {

        const getHash = () => [ scene._sectionPlanesState.getHash() ].concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;

        const programName                  = cfg.programName;
        const getLogDepth                  = cfg.getLogDepth;
        const getViewParams                = cfg.getViewParams;
        const renderPassFlag               = cfg.renderPassFlag;
        const cullOnAlphaZero              = !cfg.dontCullOnAlphaZero;
        const appendVertexDefinitions      = cfg.appendVertexDefinitions;
        const transformClipPos             = cfg.transformClipPos;
        const appendVertexOutputs          = cfg.appendVertexOutputs;
        const appendFragmentDefinitions    = cfg.appendFragmentDefinitions;
        const appendFragmentOutputs        = cfg.appendFragmentOutputs;
        const setupInputs                  = cfg.setupInputs;
        const getGlMode                    = cfg.getGlMode;
        const isTriangle = ! getGlMode;


        const sectionPlanesState = scene._sectionPlanesState;
        const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();
        const clipping = numAllocatedSectionPlanes > 0;

        const lazyShaderVariable = function(name) {
            const variable = {
                toString: () => {
                    variable.needed = true;
                    return name;
                }
            };
            return variable;
        };

        const vWorldPosition = lazyShaderVariable("vWorldPosition");

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord");

        const fragmentClippingLines = (function() {
            const src = [ ];

            if (clipping) {
                src.push("  bool clippable = vFlags2 > 0u;");
                src.push("  if (clippable) {");
                src.push("      float dist = 0.0;");
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    src.push("      if (sectionPlaneActive" + i + ") {");
                    src.push(`          dist += clamp(dot(-sectionPlaneDir${i}.xyz, ${vWorldPosition} - sectionPlanePos${i}.xyz), 0.0, 1000.0);`);
                    src.push("      }");
                }
                src.push("      if (dist > 0.0) { discard; }");
                src.push("  }");
            }

            return src;
        })();

        const colorA             = lazyShaderVariable("color");
        const pickColorA         = lazyShaderVariable("pickColor");
        const viewParams = {
            viewPosition: "viewPosition",
            viewMatrix:   "viewMatrix",
            viewNormal:   lazyShaderVariable("viewNormal")
        };

        const vertexOutputs = [ ];
        appendVertexOutputs && appendVertexOutputs(vertexOutputs, colorA, pickColorA, "gl_Position", viewParams);


        const buildVertexShader = () => {
            const src = [];
            src.push("#version 300 es");
            src.push("// " + programName + " vertex shader");
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
            if (isTriangle) {
                src.push("uniform vec3 uCameraEyeRtc;");
            }

            if (getLogDepth) {
                src.push("uniform float logDepthBufFC;");
                src.push("out float vFragDepth;");
                src.push("out float isPerspective;");
            }

            if (vWorldPosition.needed || clipping) {
                src.push("out " + (vWorldPosition.needed ? "highp " : "") + "vec3 vWorldPosition;");
            }
            if (clipping) {
                src.push("flat out uint vFlags2;");
            }

            appendVertexDefinitions && appendVertexDefinitions(src);

            src.push("void main(void) {");

            // constants
            src.push("int primitiveIndex = gl_VertexID / " + (isTriangle ? 3 : 2) + ";");

            // get packed object-id
            src.push("int h_packed_object_id_index = (primitiveIndex >> 3) & 4095;");
            src.push("int v_packed_object_id_index = (primitiveIndex >> 3) >> 12;");

            src.push("int objectIndex = int(texelFetch(uTexturePerPrimitiveIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");
            src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

            // get flags & flags2
            src.push("uvec4 flags = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
            src.push("uvec4 flags2 = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

            src.push("if (int(flags[" + renderPassFlag + "]) != renderPass) {");
            src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
            src.push("   return;"); // Cull vertex
            src.push("}");

            if (cullOnAlphaZero || colorA.needed) {
                src.push("uvec4 color = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0);");
            }
            if (cullOnAlphaZero) {
                src.push(`if (color.a == 0u) {`);
                src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
                src.push("   return;");
                src.push("}");
            }

            src.push("{");

            src.push("mat4 objectInstanceMatrix = mat4 (texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");
            src.push("mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4 (texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

            src.push("ivec4 packedVertexBase = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
            src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+" + (isTriangle ? 5 : 6) + ", objectIndexCoords.y), 0));");
            src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

            src.push("int h_index = (primitiveIndex - indexBaseOffset) & 4095;");
            src.push("int v_index = (primitiveIndex - indexBaseOffset) >> 12;");

            src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPrimitiveIdIndices, ivec2(h_index, v_index), 0));");
            src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;");

            if (isTriangle) {
                src.push("ivec3 indexPositionH = uniqueVertexIndexes & 4095;");
                src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 12;");
                src.push("uint solid = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+7, objectIndexCoords.y), 0).r;");
                src.push("vec3 positions[] = vec3[](");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0)),");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0)),");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0)));");
                src.push("vec3 normal = normalize(cross(positions[2] - positions[0], positions[1] - positions[0]));");
                src.push("vec3 position = positions[gl_VertexID % 3];");
                if (viewParams.viewNormal.needed) {
                    src.push("vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
                }
                // when the geometry is not solid, if needed, flip the triangle winding
                src.push("if (solid != 1u) {");
                src.push(`  if (${isPerspectiveMatrix("projMatrix")}) {`);
                src.push("      vec3 uCameraEyeRtcInQuantizedSpace = (inverse(sceneModelMatrix * objectDecodeAndInstanceMatrix) * vec4(uCameraEyeRtc, 1)).xyz;");
                src.push("      if (dot(position.xyz - uCameraEyeRtcInQuantizedSpace, normal) < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (viewParams.viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  } else {");
                if (!viewParams.viewNormal.needed) {
                    src.push("      vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
                }
                src.push("      if (viewNormal.z < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (viewParams.viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  }");
                src.push("}");
            } else {
                src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;");
                src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;");
                src.push("vec3 position = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH, indexPositionV), 0));");
            }

            src.push("vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));");
            src.push("vec4 viewPosition = viewMatrix * worldPosition;");

            if (vWorldPosition.needed || clipping) {
                src.push("vWorldPosition = worldPosition.xyz;");
            }
            if (clipping) {
                src.push("vFlags2 = flags2.r;");
            }

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
            }

            src.push("gl_Position = " + (transformClipPos ? transformClipPos("clipPos") : "clipPos") + ";");

            if (pickColorA.needed) {
                // TODO: Normalize color "/ 255.0"?
                src.push("vec4 pickColor = vec4(texelFetch(uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+1, objectIndexCoords.y), 0));");
            }

            vertexOutputs.forEach(line => src.push(line));

            src.push("  }");
            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const src = [];
            src.push('#version 300 es');
            src.push("// " + programName + " fragment shader");
            src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
            src.push("precision highp float;");
            src.push("precision highp int;");
            src.push("#else");
            src.push("precision mediump float;");
            src.push("precision mediump int;");
            src.push("#endif");

            if (getLogDepth) {
                src.push("in float isPerspective;");
                src.push("uniform float logDepthBufFC;");
                src.push("in float vFragDepth;");
            }

            if (vWorldPosition.needed || clipping) {
                src.push("in " + (vWorldPosition.needed ? "highp " : "") + "vec3 vWorldPosition;");
            }
            if (clipping) {
                src.push("flat in uint vFlags2;");
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    src.push("uniform bool sectionPlaneActive" + i + ";");
                    src.push("uniform vec3 sectionPlanePos" + i + ";");
                    src.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
            }

            appendFragmentDefinitions(src);

            src.push("void main(void) {");

            fragmentClippingLines.forEach(line => src.push(line));

            if (getLogDepth) {
                src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
            }

            fragmentOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };


        const program = new Program(gl, {
            vertex:   buildVertexShader(),
            fragment: buildFragmentShader()
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        const uRenderPass = program.getLocation("renderPass");
        const uSceneModelMatrix = program.getLocation("sceneModelMatrix");
        const uViewMatrix = program.getLocation("viewMatrix");
        const uProjMatrix = program.getLocation("projMatrix");
        const uCameraEyeRtc = isTriangle && program.getLocation("uCameraEyeRtc");

        const uSectionPlanes = [];
        for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
            uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos:    program.getLocation("sectionPlanePos" + i),
                dir:    program.getLocation("sectionPlaneDir" + i)
            });
        }

        const uLogDepthBufFC = getLogDepth && program.getLocation("logDepthBufFC");

        const uTexturePerObjectPositionsDecodeMatrix = "uObjectPerObjectPositionsDecodeMatrix";
        const uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates";
        const uTexturePerObjectColorsAndFlags = "uObjectPerObjectColorsAndFlags";
        const uTexturePerObjectMatrix = "uTexturePerObjectMatrix";
        const uTexturePerPrimitiveIdPortionIds = "uTexturePerPrimitiveIdPortionIds";
        const uTexturePerPrimitiveIdIndices = "uTexturePerPrimitiveIdIndices";

        const setInputsState = setupInputs && setupInputs(program);

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            const model = layer.model;
            const state = layer._state;
            const origin = layer._state.origin;
            const {position, rotationMatrix} = model;
            const viewParams = getViewParams(frameCtx, scene.camera);

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

            gl.uniformMatrix4fv(uSceneModelMatrix, false, rotationMatrix);
            gl.uniformMatrix4fv(uViewMatrix, false, rtcViewMatrix);
            gl.uniformMatrix4fv(uProjMatrix, false, viewParams.projMatrix);
            gl.uniform1i(uRenderPass, renderPass);
            if (isTriangle) {
                gl.uniform3fv(uCameraEyeRtc, math.subVec3(viewParams.eye, rtcOrigin, tempVec3b));
            }

            setInputsState && setInputsState(frameCtx, layer, renderPass, rtcOrigin);

            if (getLogDepth) {
                const logDepthBufFC = 2.0 / (Math.log(viewParams.far + 1.0) / Math.LN2);
                gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
            }

            if (clipping) {
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                const numSectionPlanes = sectionPlanes.length;
                const baseIndex = layer.layerIndex * numSectionPlanes;
                const renderFlags = model.renderFlags;
                for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                    const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
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

            (isTriangle ? layer.drawTriangles : layer.drawEdges)(
                program,
                uTexturePerObjectPositionsDecodeMatrix,
                uTexturePerVertexIdCoordinates,
                uTexturePerObjectColorsAndFlags,
                uTexturePerObjectMatrix,
                uTexturePerPrimitiveIdPortionIds,
                uTexturePerPrimitiveIdIndices,
                getGlMode ? getGlMode(frameCtx) : gl.TRIANGLES);

            frameCtx.drawElements++;
        };
    }
}
