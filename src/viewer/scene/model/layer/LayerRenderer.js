import {isPerspectiveMatrix} from "./Layer.js";
import {createRTCViewMat, getPlaneRTCPos, math} from "../../math/index.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

const tempVec2 = math.vec2();
const tempVec3 = math.vec3();
const tempVec3a = math.vec3();
const tempMat4 = math.mat4();
const vec3zero = math.vec3([0,0,0]);

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

export const lazyShaderVariable = function(name) {
    const variable = {
        toString: () => {
            variable.needed = true;
            return name;
        }
    };
    return variable;
};

export class LayerRenderer {

    constructor(scene, primitive, cfg, subGeometry, renderingAttributes, programVariablesState) {

        const isVBO = renderingAttributes.isVBO;
        const pointsMaterial = scene.pointsMaterial;

        const programName               = cfg.programName;
        const incrementDrawState        = cfg.incrementDrawState;
        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = isVBO && cfg.clippingCaps;
        const renderPassFlag            = cfg.renderPassFlag;
        const usePickParams             = cfg.usePickParams;
        const cullOnAlphaZero           = (!isVBO) && (!cfg.dontCullOnAlphaZero);
        const filterIntensityRange      = cfg.filterIntensityRange && (primitive === "points") && pointsMaterial.filterIntensity;
        const transformClipPos          = cfg.transformClipPos;
        const isShadowProgram           = cfg.isShadowProgram;
        const appendFragmentOutputs     = cfg.appendFragmentOutputs;
        const vertexCullX               = cfg.vertexCullX;
        const incPointSizeBy10          = cfg.incPointSizeBy10;

        const testPerspectiveForGl_FragDepth = ((primitive !== "points") && (primitive !== "lines")) || subGeometry;
        const setupPoints = (primitive === "points") && (! subGeometry);

        const sectionPlanesState = scene._sectionPlanesState;

        const getHash = () => [ sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const gl = scene.canvas.gl;
        const clipping = (function() {
            const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();

            return (numAllocatedSectionPlanes > 0) && {
                appendDefinitions: (src) => {
                    for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                        src.push("uniform bool sectionPlaneActive" + i + ";");
                        src.push("uniform vec3 sectionPlanePos" + i + ";");
                        src.push("uniform vec3 sectionPlaneDir" + i + ";");
                    }
                },
                getDistance: (worldPosition) => {
                    return iota(numAllocatedSectionPlanes).map(i => `(sectionPlaneActive${i} ? clamp(dot(-sectionPlaneDir${i}, ${worldPosition} - sectionPlanePos${i}), 0.0, 1000.0) : 0.0)`).join(" + ");
                },
                setupInputs: (getUniformSetter) => {
                    const uSectionPlanes = iota(numAllocatedSectionPlanes).map(i => ({
                        active: getUniformSetter("sectionPlaneActive" + i),
                        pos:    getUniformSetter("sectionPlanePos" + i),
                        dir:    getUniformSetter("sectionPlaneDir" + i)
                    }));
                    return (layerIndex, rtcOrigin, sectionPlanesActivePerLayer) => {
                        const sectionPlanes = sectionPlanesState.sectionPlanes;
                        const numSectionPlanes = sectionPlanes.length;
                        const baseIndex = layerIndex * numSectionPlanes;
                        for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                            const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
                            const active = (sectionPlaneIndex < numSectionPlanes) && sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                            sectionPlaneUniforms.active(active ? 1 : 0);
                            if (active) {
                                const sectionPlane = sectionPlanes[sectionPlaneIndex];
                                sectionPlaneUniforms.dir(sectionPlane.dir);
                                sectionPlaneUniforms.pos(getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcOrigin, tempVec3a));
                            }
                        }
                    };
                }
            };
        })();

        const geoParams = renderingAttributes.geometryParameters;
        const worldPosition = geoParams.attributes.position.world;
        const vHighpWorldPosition = programVariablesState.programVariables.createVarying("highp vec3", "vHighpWorldPosition", () => `${worldPosition}.xyz`);

        const sliceColorOr   = (clipping
                                ? (function() {
                                    const sliceColorOr = color => {
                                        sliceColorOr.needed = true;
                                        return `(sliced ? sliceColor : ${color})`;
                                    };
                                    return sliceColorOr;
                                })()
                                : (color => color));

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, "gl_FragCoord", sliceColorOr);

        const fragmentClippingLines = (function() {
            const src = [ ];

            if (clipping) {
                if (sliceColorOr.needed) {
                    src.push("  bool sliced = false;");
                }
                src.push("  if (vClippable > 0.0) {");
                src.push("      float dist = " + clipping.getDistance(vHighpWorldPosition) + ";");
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

        const colorA = geoParams.attributes.color;

        const vertexOutputs = [ ];
        programVariablesState.appendVertexOutputs(vertexOutputs);

        const flagTest = (isShadowProgram
                          ? `(${renderingAttributes.getFlag(renderPassFlag)} <= 0) || (${colorA}.a < 1.0)`
                          : `${renderingAttributes.getFlag(renderPassFlag)} != renderPass`);

        const afterFlagsColorLines = [
            `if (${flagTest}) {`,
            `   gl_Position = vec4(${vertexCullX || 0.0}, 0.0, 0.0, 0.0);`, // Cull vertex
            "   return;",
            "}"
        ].concat(
            cullOnAlphaZero
                ? [
                    `if (${colorA}.a == 0.0) {`,
                    "   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);", // Cull vertex
                    "   return;",
                    "}"
                ]
                : [ ]
        ).concat(
            filterIntensityRange
                ? [
                    `if ((${colorA}.a < intensityRange[0]) || (${colorA}.a > intensityRange[1])) {`,
                    "   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);", // Cull vertex
                    "   return;",
                    "}"
                ]
                : [ ]);

        const vertexData = [ ];
        renderingAttributes.appendVertexData(vertexData, afterFlagsColorLines);

        const buildVertexShader = () => {
            const gl_Position = transformClipPos ? transformClipPos("clipPos") : "clipPos";

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

            if (setupPoints) {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            }

            if (filterIntensityRange) {
                src.push("uniform vec2 intensityRange;");
            }

            renderingAttributes.appendVertexDefinitions(src);
            programVariablesState.appendVertexDefinitions(src);

            src.push("void main(void) {");

            vertexData.forEach(line => src.push(line));

            src.push(`vec4 viewPosition = ${geoParams.viewMatrix} * ${worldPosition};`);

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (clipping) {
                src.push(`vClippable = ${renderingAttributes.getClippable()};`);
                if (clippingCaps) {
                    src.push("vClipPositionW = clipPos.w;");
                }
            }

            src.push(`gl_Position = ${gl_Position};`);

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

            if (incPointSizeBy10 && (primitive === "points")) {
                src.push("gl_PointSize += 10.0;");
            }

            vertexOutputs.forEach(line => src.push(line));

            src.push("}");
            return src;
        };

        const buildFragmentShader = () => {
            const src = [];

            // CONSTANT DEFINITIONS
            src.push("#define PI 3.14159265359");
            src.push("#define RECIPROCAL_PI 0.31830988618");
            src.push("#define RECIPROCAL_PI2 0.15915494");
            src.push("#define EPSILON 1e-6");
            src.push("#define saturate(a) clamp( a, 0.0, 1.0 )");

            if (getLogDepth) {
                src.push("uniform float logDepthBufFC;");
                src.push("in float vFragDepth;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push("in float isPerspective;");
                }
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

            renderingAttributes.appendFragmentDefinitions(src);
            programVariablesState.appendFragmentDefinitions(src);

            src.push("vec4 sRGBToLinear(in vec4 value) {");
            src.push("  return vec4(mix(pow(value.rgb * 0.9478672986 + 0.0521327014, vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);");
            src.push("}");

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
            "// " + primitive + " " + renderingAttributes.signature + " " + programName + " " + type + " shader",
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

        const getInputSetter = makeInputSetters(gl, program.handle);
        const inputSetters = programVariablesState.setupInputs(getInputSetter);
        const drawCall = renderingAttributes.makeDrawCall(getInputSetter, inputSetters);

        const uRenderPass = (! isShadowProgram) && getInputSetter("renderPass");
        const uLogDepthBufFC = getLogDepth && getInputSetter("logDepthBufFC");
        const setClippingState = clipping && clipping.setupInputs(getInputSetter);
        const uSlice = sliceColorOr.needed && {
            thickness: getInputSetter("sliceThickness"),
            color:     getInputSetter("sliceColor")
        };
        const uPoint = setupPoints && {
            pointSize:       getInputSetter("pointSize"),
            nearPlaneHeight: pointsMaterial.perspectivePoints && getInputSetter("nearPlaneHeight")
        };
        const uIntensityRange = filterIntensityRange && getInputSetter("intensityRange");

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            const origin = layer.origin;
            const model = layer.model;
            const camera = scene.camera;
            const rtcOrigin = tempVec3;
            math.transformPoint3(model.matrix, origin, rtcOrigin);

            uRenderPass && uRenderPass(renderPass);

            if (setClippingState) {
                setClippingState(layer.layerIndex, rtcOrigin, model.renderFlags.sectionPlanesActivePerLayer);
                const crossSections = uSlice && scene.crossSections;
                if (crossSections) {
                    uSlice.thickness(crossSections.sliceThickness);
                    uSlice.color(crossSections.sliceColor);
                }
            }

            if (uPoint) {
                uPoint.pointSize(pointsMaterial.pointSize);
                if (uPoint.nearPlaneHeight) {
                    const nearPlaneHeight = (camera.projection === "ortho") ?
                          1.0
                          : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * camera.perspective.fov * Math.PI / 180.0)));
                    uPoint.nearPlaneHeight(nearPlaneHeight);
                }
            }

            if (uIntensityRange) {
                tempVec2[0] = pointsMaterial.minIntensity;
                tempVec2[1] = pointsMaterial.maxIntensity;
                uIntensityRange(tempVec2);
            }

            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;
            const eye        = (usePickParams && frameCtx.pickOrigin) || camera.eye;
            const far        = (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far;

            uLogDepthBufFC && uLogDepthBufFC(2.0 / (Math.log(far + 1.0) / Math.LN2));

            const rtcViewMatrix = (math.compareVec3(rtcOrigin, vec3zero)
                                   ? viewMatrix
                                   : createRTCViewMat(viewMatrix, rtcOrigin, tempMat4));

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            const layerDrawState = layer.layerDrawState;

            inputSetters.setUniforms({
                legacyFrameCtx: frameCtx,
                layerDrawState: layerDrawState
            });

            drawCall(frameCtx, layerDrawState, model.rotationMatrix, rtcViewMatrix, projMatrix, rtcOrigin, eye);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
