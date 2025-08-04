import {createClippingSetup} from "../../layer/Layer.js";
import {createRTCViewMat, math} from "../../../math/index.js";
import {Program} from "../../../webgl/Program.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempMat4a = math.mat4();

const isPerspectiveMatrix = (m) => `(${m}[2][3] == - 1.0)`;

/**
 * @private
 */
export class DTXTrianglesDrawable {

    constructor(scene, primitive, cfg, subGeometry) {

        const methodName = "DTX";

        const pointsMaterial = scene.pointsMaterial;

        const programName               = cfg.programName;
        const incrementDrawState        = cfg.incrementDrawState;
        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = false && cfg.clippingCaps; // not used by DTX
        const renderPassFlag            = cfg.renderPassFlag;
        const usePickParams             = cfg.usePickParams;
        const cullOnAlphaZero           = !cfg.dontCullOnAlphaZero;
        const appendVertexDefinitions   = cfg.appendVertexDefinitions;
        const filterIntensityRange      = cfg.filterIntensityRange && (primitive === "points") && pointsMaterial.filterIntensity;
        const transformClipPos          = cfg.transformClipPos;
        const isShadowProgram           = cfg.isShadowProgram;
        const appendVertexOutputs       = cfg.appendVertexOutputs;
        const appendFragmentDefinitions = cfg.appendFragmentDefinitions;
        const appendFragmentOutputs     = cfg.appendFragmentOutputs;
        const setupInputs               = cfg.setupInputs;

        const testPerspectiveForGl_FragDepth = ((primitive !== "points") && (primitive !== "lines")) || subGeometry;
        const setupPoints = (primitive === "points") && (! subGeometry);

        const sectionPlanesState = scene._sectionPlanesState;

        const getHash = () => [ sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;
        const clipping = createClippingSetup(gl, sectionPlanesState);

        const lazyShaderVariable = function(name) {
            const variable = {
                toString: () => {
                    variable.needed = true;
                    return name;
                }
            };
            return variable;
        };

        const geometry = (function() {
            const isTriangle = ! subGeometry;
            return {
                getClippable: () => "float(flags2.r)",

                appendVertexDefinitions: (src) => {
                    src.push("uniform mat4 sceneModelMatrix;");
                    src.push("uniform mat4 viewMatrix;");
                    src.push("uniform mat4 projMatrix;");

                    src.push("uniform highp   sampler2D  uObjectPerObjectPositionsDecodeMatrix;");
                    src.push("uniform highp   sampler2D  uTexturePerObjectMatrix;");
                    src.push("uniform lowp    usampler2D uObjectPerObjectColorsAndFlags;");
                    src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;");
                    src.push("uniform highp   usampler2D uTexturePerPrimitiveIdIndices;");
                    src.push("uniform mediump usampler2D uTexturePerPrimitiveIdPortionIds;");
                    if (isTriangle) {
                        src.push("uniform vec3 uCameraEyeRtc;");
                    }
                },

                appendVertexData: (src) => {
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

                    if (colorA.needed || isShadowProgram || cullOnAlphaZero) {
                        src.push("uvec4 color = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0);");
                    }
                    if (cullOnAlphaZero) {
                        src.push(`if (color.a == 0u) {`);
                        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
                        src.push("   return;");
                        src.push("}");
                    }
                    if (colorA.needed) {
                        src.push("vec4 aColor = vec4(color);");
                    }

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

                    if (pickColorA.needed) {
                        // TODO: Normalize color "/ 255.0"?
                        src.push("vec4 pickColor = vec4(texelFetch(uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+1, objectIndexCoords.y), 0));");
                    }

                    src.push("vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));");
                },

                appendFragmentDefinitions: (src) => { },

                makeDrawCall: function(program) {
                    const uSceneModelMatrix = program.getLocation("sceneModelMatrix");
                    const uViewMatrix = program.getLocation("viewMatrix");
                    const uProjMatrix = program.getLocation("projMatrix");
                    const uCameraEyeRtc = isTriangle && program.getLocation("uCameraEyeRtc");

                    const uTexturePerObjectPositionsDecodeMatrix = "uObjectPerObjectPositionsDecodeMatrix";
                    const uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates";
                    const uTexturePerObjectColorsAndFlags = "uObjectPerObjectColorsAndFlags";
                    const uTexturePerObjectMatrix = "uTexturePerObjectMatrix";
                    const uTexturePerPrimitiveIdPortionIds = "uTexturePerPrimitiveIdPortionIds";
                    const uTexturePerPrimitiveIdIndices = "uTexturePerPrimitiveIdIndices";

                    return function(frameCtx, layer, sceneModelMat, viewMatrix, projMatrix, rtcOrigin) {
                        gl.uniformMatrix4fv(uSceneModelMatrix, false, sceneModelMat);
                        gl.uniformMatrix4fv(uViewMatrix,       false, viewMatrix);
                        gl.uniformMatrix4fv(uProjMatrix,       false, projMatrix);
                        if (isTriangle) {
                            const eye = (usePickParams && frameCtx.pickOrigin) || scene.camera.eye;
                            gl.uniform3fv(uCameraEyeRtc, math.subVec3(eye, rtcOrigin, tempVec3b));
                        }

                        (subGeometry ? layer.drawEdges : layer.drawTriangles)(
                            program,
                            uTexturePerObjectPositionsDecodeMatrix,
                            uTexturePerVertexIdCoordinates,
                            uTexturePerObjectColorsAndFlags,
                            uTexturePerObjectMatrix,
                            uTexturePerPrimitiveIdPortionIds,
                            uTexturePerPrimitiveIdIndices,
                            subGeometry ? (subGeometry.vertices ? gl.POINTS : gl.LINES) : gl.TRIANGLES);
                    };
                }
            };
        })();

        const vWorldPosition = lazyShaderVariable("vWorldPosition");
        const fragViewMatrix = null;
        const sliceColorOr = color => color; // TODO: should DTX handle sliceColorOr?

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord", sliceColorOr, fragViewMatrix);

        const fragmentClippingLines = (function() {
            const src = [ ];

            if (clipping) {
                if (sliceColorOr.needed) {
                    src.push("  bool sliced = false;");
                }
                src.push("  if (vClippable > 0.0) {");
                src.push("      float dist = " + clipping.getDistance(vWorldPosition) + ";");
                if (clippingCaps) {
                    src.push("  if (dist > (0.002 * vClipPositionW)) { discard; }");
                    src.push("  if (dist > 0.0) { ");
                    src.push("      " + clippingCaps + " = vec4(1.0, 0.0, 0.0, 1.0);");
                    if (getLogDepth) {
                        src.push("  gl_FragDepth = log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
                    }
                    src.push("  return;");
                    src.push("  }");
                } else {
                    src.push("  if (dist > " + (sliceColorOr.needed ? "sliceThickness" : "0.0") + ") {  discard; }");
                }
                if (sliceColorOr.needed) {
                    src.push("  sliced = dist > 0.0;");
                }
                src.push("}");
            }

            return src;
        })();

        const colorA             = lazyShaderVariable("aColor");
        const pickColorA         = lazyShaderVariable("pickColor");
        const uvA                = null;
        const metallicRoughnessA = null;
        const viewParams = {
            viewPosition: "viewPosition",
            viewMatrix:   "viewMatrix",
            viewNormal:   lazyShaderVariable("viewNormal")
        };
        const worldNormal = null;
        const worldPosition = null;

        const vertexOutputs = [ ];
        appendVertexOutputs && appendVertexOutputs(vertexOutputs, colorA, pickColorA, uvA, metallicRoughnessA, "gl_Position", viewParams, worldNormal, worldPosition);

        const buildVertexShader = () => {
            const src = [];

            if (! isShadowProgram) {
                src.push("uniform int renderPass;");
            }

            if (getLogDepth) {
                src.push("out float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("out float isPerspective;");
                }
            }

            if (clipping) {
                src.push("flat out float vClippable;");
                if (clippingCaps) {
                    src.push("out float vClipPositionW;");
                }
            }

            if (vWorldPosition.needed) {
                src.push(`out highp vec3 ${vWorldPosition};`);
            }

            if (setupPoints) {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            }

            appendVertexDefinitions && appendVertexDefinitions(src);

            geometry.appendVertexDefinitions(src);

            src.push("void main(void) {");

            geometry.appendVertexData(src);

            src.push("vec4 viewPosition = viewMatrix * worldPosition;");

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (vWorldPosition.needed) {
                src.push(`${vWorldPosition} = worldPosition.xyz;`);
            }
            if (clipping) {
                src.push(`vClippable = ${geometry.getClippable()};`);
                if (clippingCaps) {
                    src.push("vClipPositionW = clipPos.w;");
                }
            }

            src.push("gl_Position = " + (transformClipPos ? transformClipPos("clipPos") : "clipPos") + ";");

            if (setupPoints) {
                if (pointsMaterial.perspectivePoints) {
                    src.push("gl_PointSize = (nearPlaneHeight * pointSize) / gl_Position.w;");
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
            } else if (subGeometry && subGeometry.vertices) {
                src.push("gl_PointSize = 1.0;");
            }

            vertexOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const src = [];

            if (getLogDepth) {
                src.push("uniform float logDepthBufFC;");
                src.push("in float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("in float isPerspective;");
                }
            }

            if (vWorldPosition.needed) {
                src.push(`in highp vec3 ${vWorldPosition};`);
            }
            if (clipping) {
                src.push("flat in float vClippable;");
                if (clippingCaps) {
                    src.push("in float vClipPositionW;");
                }
                clipping.appendDefinitions(src);
                if (sliceColorOr.needed) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
            }

            geometry.appendFragmentDefinitions(src);

            appendFragmentDefinitions(src);

            src.push("void main(void) {");

            if (setupPoints && pointsMaterial.roundPoints) {
                src.push(`  vec2 cxy = 2.0 * gl_PointCoord - 1.0;`);
                src.push("  float r = dot(cxy, cxy);");
                src.push("  if (r > 1.0) {");
                src.push("       discard;");
                src.push("  }");
            }

            fragmentClippingLines.forEach(line => src.push(line));

            if (getLogDepth) {
                src.push("gl_FragDepth = " + (testPerspectiveForGl_FragDepth ? "isPerspective == 0.0 ? gl_FragCoord.z : " : "") + "log2( " + getLogDepth("vFragDepth") + " ) * logDepthBufFC * 0.5;");
            }

            fragmentOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };

        const preamble = (type) => [
            "#version 300 es",
            "// " + primitive + " " + methodName + " " + programName + " " + type + " shader",
            "#ifdef GL_FRAGMENT_PRECISION_HIGH",
            "precision highp float;",
            "precision highp int;",
            "precision highp usampler2D;",
            "precision highp isampler2D;",
            "precision highp sampler2D;",
            "#else",
            "precision mediump float;",
            "precision mediump int;",
            "precision mediump usampler2D;",
            "precision mediump isampler2D;",
            "precision mediump sampler2D;",
            "#endif",
        ];

        const program = new Program(gl, {
            vertex:   preamble("vertex"  ).concat(buildVertexShader()),
            fragment: preamble("fragment").concat(buildFragmentShader())
        });

        const errors = program.errors;
        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        const drawCall = geometry.makeDrawCall(program);

        const uRenderPass = (! isShadowProgram) && program.getLocation("renderPass");
        const uLogDepthBufFC = getLogDepth && program.getLocation("logDepthBufFC");
        const setClippingState = clipping && clipping.setupInputs(program);
        const uSlice = sliceColorOr.needed && {
            thickness: program.getLocation("sliceThickness"),
            color:     program.getLocation("sliceColor")
        };
        const uPoint = setupPoints && {
            pointSize:       program.getLocation("pointSize"),
            nearPlaneHeight: pointsMaterial.perspectivePoints && program.getLocation("nearPlaneHeight")
        };

        const setInputsState = setupInputs && setupInputs(program);

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            if (uRenderPass) {
                gl.uniform1i(uRenderPass, renderPass);
            }

            setInputsState && setInputsState(frameCtx, layer._state.textureSet);

            if (setClippingState) {
                setClippingState(layer);
                const crossSections = uSlice && scene.crossSections;
                if (crossSections) {
                    gl.uniform1f(uSlice.thickness, crossSections.sliceThickness);
                    gl.uniform4fv(uSlice.color,    crossSections.sliceColor);
                }
            }

            if (uPoint) {
                gl.uniform1f(uPoint.pointSize, pointsMaterial.pointSize);
                if (uPoint.nearPlaneHeight) {
                    const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                          1.0
                          : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                    gl.uniform1f(uPoint.nearPlaneHeight, nearPlaneHeight);
                }
            }

            const model = layer.model;
            const origin = layer._state.origin;
            const {position, rotationMatrix} = model;

            const camera = scene.camera;
            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;
            const far        = (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far;

            if (uLogDepthBufFC) {
                gl.uniform1f(uLogDepthBufFC, 2.0 / (Math.log(far + 1.0) / Math.LN2));
            }

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

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            drawCall(frameCtx, layer, rotationMatrix, rtcViewMatrix, projMatrix, rtcOrigin);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
