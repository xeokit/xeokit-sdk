import {createClippingSetup, isPerspectiveMatrix} from "./Layer.js";
import {createRTCViewMat, math} from "../../math/index.js";
import {Program} from "../../webgl/Program.js";

const tempVec3 = math.vec3();
const tempMat4 = math.mat4();

export class LayerRenderer {

    constructor(scene, primitive, cfg, subGeometry, renderingAttributes) {

        const isVBO = renderingAttributes.isVBO;
        const sliceColorEnabled = isVBO;
        const pointsMaterial = scene.pointsMaterial;

        const programName               = cfg.programName;
        const incrementDrawState        = cfg.incrementDrawState;
        const getLogDepth               = cfg.getLogDepth;
        const clippingCaps              = isVBO && cfg.clippingCaps;
        const renderPassFlag            = cfg.renderPassFlag;
        const usePickParams             = cfg.usePickParams;
        const cullOnAlphaZero           = (!isVBO) && (!cfg.dontCullOnAlphaZero);
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

        const vWorldPosition = lazyShaderVariable("vWorldPosition");
        const sliceColorOr   = ((sliceColorEnabled && clipping)
                                ? (function() {
                                    const sliceColorOr = color => {
                                        sliceColorOr.needed = true;
                                        return `(sliced ? sliceColor : ${color})`;
                                    };
                                    return sliceColorOr;
                                })()
                                : (color => color));

        const geoParams = renderingAttributes.parameters;

        const fragmentOutputs = [ ];
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord", sliceColorOr, geoParams.fragViewMatrix);

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

        const colorA = geoParams.colorA;
        const viewParams = {
            viewPosition: "viewPosition",
            viewMatrix:   geoParams.viewMatrix,
            viewNormal:   geoParams.viewNormal
        };
        const worldPosition = geoParams.worldPosition;

        const vertexOutputs = [ ];
        appendVertexOutputs && appendVertexOutputs(vertexOutputs, colorA, geoParams.pickColorA, geoParams.uvA, geoParams.metallicRoughnessA, "gl_Position", viewParams, geoParams.worldNormal, worldPosition); // worldPosition not used by appendVertexOutputs?

        const flagTest = (isShadowProgram
                          ? `(${geoParams.getFlag(renderPassFlag)} <= 0) || (${colorA}.a < 1.0)`
                          : `${geoParams.getFlag(renderPassFlag)} != renderPass`);

        const afterFlagsColorLines = [
            `if (${flagTest}) {`,
            "   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);", // Cull vertex
            "   return;",
            "}"
        ].concat(
            cullOnAlphaZero
                ? [
                    `if (${colorA}.a == 0.0) {`,
                    "   gl_Position = vec4(0.0, 0.0, 0.0, 1.0);", // Cull vertex
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

            if (filterIntensityRange) {
                src.push("uniform vec2 intensityRange;");
            }

            appendVertexDefinitions && appendVertexDefinitions(src);

            renderingAttributes.appendVertexDefinitions(src);

            src.push("void main(void) {");

            renderingAttributes.appendVertexData(src, afterFlagsColorLines);

            src.push(`vec4 viewPosition = ${viewParams.viewMatrix} * ${worldPosition};`);

            src.push("vec4 clipPos = projMatrix * viewPosition;");
            if (getLogDepth) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
                if (testPerspectiveForGl_FragDepth) {
                    src.push(`isPerspective = float (${isPerspectiveMatrix("projMatrix")});`);
                }
            }

            if (vWorldPosition.needed) {
                src.push(`${vWorldPosition} = ${worldPosition}.xyz;`);
            }
            if (clipping) {
                src.push(`vClippable = ${renderingAttributes.getClippable()};`);
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

            renderingAttributes.appendFragmentDefinitions(src);

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

        const drawCall = renderingAttributes.makeDrawCall(program);

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
        const uIntensityRange = filterIntensityRange && program.getLocation("intensityRange");

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

            if (uIntensityRange) {
                gl.uniform2f(uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
            }

            setInputsState && setInputsState(frameCtx, layer._state.textureSet);

            const model = layer.model;
            const origin = layer._state.origin;
            const {position, rotationMatrix} = model;

            const camera = scene.camera;
            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;
            const eye        = (usePickParams && frameCtx.pickOrigin) || scene.camera.eye;
            const far        = (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far;

            if (uLogDepthBufFC) {
                gl.uniform1f(uLogDepthBufFC, 2.0 / (Math.log(far + 1.0) / Math.LN2));
            }

            let rtcViewMatrix;
            const rtcOrigin = tempVec3;
            rtcOrigin.set([0, 0, 0]);

            const gotOrigin = (origin[0] !== 0 || origin[1] !== 0 || origin[2] !== 0);
            const gotPosition = (position[0] !== 0 || position[1] !== 0 || position[2] !== 0);
            if (gotOrigin || gotPosition) {
                if (gotOrigin) {
                    math.transformPoint3(rotationMatrix, origin, rtcOrigin);
                }
                math.addVec3(rtcOrigin, position, rtcOrigin);
                rtcViewMatrix = createRTCViewMat(viewMatrix, rtcOrigin, tempMat4);
            } else {
                rtcViewMatrix = viewMatrix;
            }

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            drawCall(frameCtx, layer, rotationMatrix, rtcViewMatrix, projMatrix, rtcOrigin, eye);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
