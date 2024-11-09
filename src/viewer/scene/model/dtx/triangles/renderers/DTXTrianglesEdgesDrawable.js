import {createRTCViewMat, getPlaneRTCPos, math} from "../../../../math/index.js";
import {Program} from "../../../../webgl/Program.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class DTXTrianglesEdgesDrawable {

    constructor(programName, scene, cfg) {

        const getHash = () => [ scene._sectionPlanesState.getHash() ].concat(cfg.getHash()).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;

        const getLogDepth                  = cfg.getLogDepth;
        const getViewParams                = cfg.getViewParams;
        const renderPassFlag               = cfg.renderPassFlag;
        const cullOnAlphaZero              = cfg.cullOnAlphaZero;
        const appendVertexDefinitions      = cfg.appendVertexDefinitions;
        const transformClipPos             = cfg.transformClipPos;
        const needVertexColor              = cfg.needVertexColor;
        const needPickColor                = cfg.needPickColor;
        const needGl_Position              = cfg.needGl_Position;
        const needViewMatrixPositionNormal = cfg.needViewMatrixPositionNormal;
        const appendVertexOutputs          = cfg.appendVertexOutputs;
        const appendFragmentDefinitions    = cfg.appendFragmentDefinitions;
        const needvWorldPosition           = cfg.needvWorldPosition;
        const needGl_FragCoord             = cfg.needGl_FragCoord;
        const appendFragmentOutputs        = cfg.appendFragmentOutputs;
        const setupInputs                  = cfg.setupInputs;
        const setRenderState               = cfg.setRenderState;
        const getGlMode                    = cfg.getGlMode;

        const buildVertexShader = () => {
            const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
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

            if (getLogDepth) {
                src.push("uniform float logDepthBufFC;");
                src.push("out float vFragDepth;");
                src.push("out float isPerspective;");
            }

            if (needvWorldPosition || clipping) {
                src.push("out " + (needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
            }
            if (clipping) {
                src.push("flat out uint vFlags2;");
            }

            appendVertexDefinitions(src);

            src.push("void main(void) {");

            // constants
            src.push("int primitiveIndex = gl_VertexID / 2;");

            // get packed object-id
            src.push("int h_packed_object_id_index = (primitiveIndex >> 3) & 4095;");
            src.push("int v_packed_object_id_index = (primitiveIndex >> 3) >> 12;");

            src.push("int objectIndex = int(texelFetch(uTexturePerPrimitiveIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");
            src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

            // get flags & flags2
            src.push("uvec4 flags = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
            src.push("uvec4 flags2 = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

            src.push("if (int(flags." + renderPassFlag + ") != renderPass) {");
            src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
            src.push("   return;"); // Cull vertex
            src.push("}");

            if (cullOnAlphaZero || needVertexColor) {
                src.push("uvec4 color = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0);");
            }
            if (cullOnAlphaZero) {
                src.push(`if (color.a == 0u) {`);
                src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
                src.push("   return;");
                src.push("}");
            }

            src.push("{");

            src.push("ivec4 packedVertexBase = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
            src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+6, objectIndexCoords.y), 0));");
            src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

            src.push("int h_index = (primitiveIndex - indexBaseOffset) & 4095;");
            src.push("int v_index = (primitiveIndex - indexBaseOffset) >> 12;");

            src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPrimitiveIdIndices, ivec2(h_index, v_index), 0));");
            src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;");

            src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;");
            src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;");

            src.push("mat4 objectInstanceMatrix = mat4 (texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

            src.push("mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4 (texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

            src.push("vec3 position = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH, indexPositionV), 0));");

            src.push("vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));");
            src.push("vec4 viewPosition = viewMatrix * worldPosition;");

            if (needvWorldPosition || clipping) {
                src.push("vWorldPosition = worldPosition;");
            }
            if (clipping) {
                src.push("vFlags2 = flags2.r;");
            }

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
            }

            src.push("gl_Position = " + transformClipPos("clipPos") + ";");

            if (needPickColor) {
                // TODO: Normalize color "/ 255.0"?
                src.push("vec4 pickColor = vec4(texelFetch(uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+1, objectIndexCoords.y), 0));");
            }
            appendVertexOutputs(src, needVertexColor && "color", needPickColor && "pickColor", needGl_Position && "gl_Position", needViewMatrixPositionNormal && null);

            src.push("  }");
            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const sectionPlanesState = scene._sectionPlanesState;
            const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
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

            if (needvWorldPosition || clipping) {
                src.push("in " + (needvWorldPosition ? "highp " : "") + "vec4 vWorldPosition;");
            }
            if (clipping) {
                src.push("flat in uint vFlags2;");
                for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                    src.push("uniform bool sectionPlaneActive" + i + ";");
                    src.push("uniform vec3 sectionPlanePos" + i + ";");
                    src.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
            }

            appendFragmentDefinitions(src);

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

            if (getLogDepth) {
                src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
            }

            appendFragmentOutputs(src, needvWorldPosition && "vWorldPosition", needGl_FragCoord && "gl_FragCoord");

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

        const uSectionPlanes = [];
        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
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

        setupInputs(program);

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

            setRenderState(frameCtx, layer, renderPass, rtcOrigin);

            if (getLogDepth) {
                const logDepthBufFC = 2.0 / (Math.log(viewParams.far + 1.0) / Math.LN2);
                gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
            }

            const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
            const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
            if (numAllocatedSectionPlanes > 0) {
                const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
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

            dataTextureLayer.drawEdges(
                program,
                uTexturePerObjectPositionsDecodeMatrix,
                uTexturePerVertexIdCoordinates,
                uTexturePerObjectColorsAndFlags,
                uTexturePerObjectMatrix,
                uTexturePerPrimitiveIdPortionIds,
                uTexturePerPrimitiveIdIndices,
                getGlMode(frameCtx));

            frameCtx.drawElements++;
        };
    }
}
