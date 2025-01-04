import {isPerspectiveMatrix} from "./Layer.js";
import {createRTCViewMat, getPlaneRTCPos, math} from "../../math/index.js";
import {Program} from "../../webgl/Program.js";

const tempVec2 = math.vec2();
const tempVec3 = math.vec3();
const tempMat4 = math.mat4();
const vec3zero = math.vec3([0,0,0]);

const iota = function(n) {
    const ret = [ ];
    for (let i = 0; i < n; ++i) ret.push(i);
    return ret;
};

export class LayerRenderer {

    constructor(scene, primitive, cfg, subGeometry, renderingAttributes) {

        const isVBO = renderingAttributes.isVBO;
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
                    return iota(numAllocatedSectionPlanes).map(i => `(sectionPlaneActive${i} ? clamp(dot(-sectionPlaneDir${i}.xyz, ${worldPosition} - sectionPlanePos${i}.xyz), 0.0, 1000.0) : 0.0)`).join(" + ");
                },
                setupInputs: (getUniformSetter) => {
                    const uSectionPlanes = iota(numAllocatedSectionPlanes).map(i => ({
                        active: getUniformSetter("sectionPlaneActive" + i),
                        pos:    getUniformSetter("sectionPlanePos" + i),
                        dir:    getUniformSetter("sectionPlaneDir" + i)
                    }));
                    return (layerIndex, layerOrigin, modelMatrix, sectionPlanesActivePerLayer) => {
                        const sectionPlanes = sectionPlanesState.sectionPlanes;
                        const numSectionPlanes = sectionPlanes.length;
                        const baseIndex = layerIndex * numSectionPlanes;
                        for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                            const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
                            if (sectionPlaneUniforms) {
                                const active = (sectionPlaneIndex < numSectionPlanes) && sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                                sectionPlaneUniforms.active(active ? 1 : 0);
                                if (active) {
                                    const sectionPlane = sectionPlanes[sectionPlaneIndex];
                                    sectionPlaneUniforms.dir(sectionPlane.dir);
                                    sectionPlaneUniforms.pos(layerOrigin
                                                             ? getPlaneRTCPos(
                                                                 sectionPlane.dist, sectionPlane.dir, layerOrigin, tempVec3, modelMatrix)
                                                             : sectionPlane.pos);
                                }
                            }
                        }
                    };
                }
            };
        })();

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
        const sliceColorOr   = (clipping
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
        appendFragmentOutputs(fragmentOutputs, vWorldPosition, "gl_FragCoord", sliceColorOr, geoParams.viewMatrix);

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

        const vertexData = [ ];
        renderingAttributes.appendVertexData(vertexData, afterFlagsColorLines);

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

            vertexData.forEach(line => src.push(line));

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

        const getInputSetter = (function() {
            const activeInputs = { };
            const handle = program.handle;

            const numAttributes = gl.getProgramParameter(handle, gl.ACTIVE_ATTRIBUTES);
            for (let i = 0; i < numAttributes; ++i) {
                const attribute = gl.getActiveAttrib(handle, i);
                const location = gl.getAttribLocation(handle, attribute.name);
                activeInputs[attribute.name] = function(arrayBuf, divisor) {
                    arrayBuf.bindAtLocation(location);
                    gl.enableVertexAttribArray(location);
                    if (divisor) {
                        gl.vertexAttribDivisor(location, divisor);
                    }
                };
                activeInputs[attribute.name].attributeHash = `${attribute.name}:${location}`;
            }

            const numBlocks = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORM_BLOCKS);
            for (let i = 0; i < numBlocks; ++i) {
                const blockName = gl.getActiveUniformBlockName(handle, i);
                const uniformBlockIndex = gl.getUniformBlockIndex(handle, blockName);
                const uniformBlockBinding = i;
                gl.uniformBlockBinding(handle, uniformBlockIndex, uniformBlockBinding);
                const buffer = gl.createBuffer();
                activeInputs[blockName] = function(data) {
                    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
                    gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
                    gl.bindBufferBase(gl.UNIFORM_BUFFER, uniformBlockBinding, buffer);
                };
            }

            const numUniforms = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < numUniforms; ++i) {
                const u = gl.getActiveUniform(handle, i);
                let uName = u.name;
                if (uName[uName.length - 1] === "\u0000") {
                    uName = uName.substr(0, uName.length - 1);
                }
                const location = gl.getUniformLocation(handle, uName);
                const type = (function() {
                    for (let k in gl) {
                        if (u.type === gl[k])
                            return k;
                    }
                    return null;
                })();

                if ((u.type === gl.SAMPLER_2D)
                    ||
                    (u.type === gl.SAMPLER_CUBE)
                    ||
                    (u.type === gl.SAMPLER_2D_SHADOW)
                    ||
                    ((gl instanceof window.WebGL2RenderingContext)
                     &&
                     ((u.type === gl.UNSIGNED_INT_SAMPLER_2D)
                      ||
                      (u.type === gl.INT_SAMPLER_2D)))) {
                    activeInputs[uName] = function(texture, unit) {
                        const bound = texture.bind(unit);
                        if (bound) {
                            gl.uniform1i(location, unit);
                        }
                        return bound;
                    };
                } else {
                    activeInputs[uName] = (function() {
                        if (u.size === 1) {
                            switch (u.type) {
                            case gl.BOOL:       return value => gl.uniform1i(location, value);
                            case gl.INT:        return value => gl.uniform1i(location, value);
                            case gl.FLOAT:      return value => gl.uniform1f(location, value);
                            case gl.FLOAT_VEC2: return value => gl.uniform2fv(location, value);
                            case gl.FLOAT_VEC3: return value => gl.uniform3fv(location, value);
                            case gl.FLOAT_VEC4: return value => gl.uniform4fv(location, value);
                            case gl.FLOAT_MAT3: return value => gl.uniformMatrix3fv(location, false, value);
                            case gl.FLOAT_MAT4: return value => gl.uniformMatrix4fv(location, false, value);
                            }
                        }
                        throw `Unhandled uniform ${uName}`;
                    })();
                }
            }

            return function(name) {
                const u = activeInputs[name];
                if (! u) {
                    throw `Missing input "${name}"`;
                }
                return u;
            };
        })();

        const drawCall = renderingAttributes.makeDrawCall(getInputSetter);

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

        const setInputsState = setupInputs && setupInputs(getInputSetter);

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            const origin = layer.origin;
            const model = layer.model;
            const modelMatrix = model.matrix;

            uRenderPass && uRenderPass(renderPass);

            if (setClippingState) {
                setClippingState(layer.layerIndex, origin, modelMatrix, model.renderFlags.sectionPlanesActivePerLayer);
                const crossSections = uSlice && scene.crossSections;
                if (crossSections) {
                    uSlice.thickness(crossSections.sliceThickness);
                    uSlice.color(crossSections.sliceColor);
                }
            }

            if (uPoint) {
                uPoint.pointSize(pointsMaterial.pointSize);
                if (uPoint.nearPlaneHeight) {
                    const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                          1.0
                          : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                    uPoint.nearPlaneHeight(nearPlaneHeight);
                }
            }

            if (uIntensityRange) {
                tempVec2[0] = pointsMaterial.minIntensity;
                tempVec2[1] = pointsMaterial.maxIntensity;
                uIntensityRange(tempVec2);
            }

            const layerDrawState = layer.layerDrawState;
            setInputsState && setInputsState(frameCtx, layerDrawState.textureSet);

            const {position, rotationMatrix} = model;
            const camera = scene.camera;
            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;
            const eye        = (usePickParams && frameCtx.pickOrigin) || scene.camera.eye;
            const far        = (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far;

            uLogDepthBufFC && uLogDepthBufFC(2.0 / (Math.log(far + 1.0) / Math.LN2));

            const rtcOrigin = tempVec3;
            math.transformPoint3(modelMatrix, origin, rtcOrigin);
            const rtcViewMatrix = (math.compareVec3(rtcOrigin, vec3zero)
                                   ? viewMatrix
                                   : createRTCViewMat(viewMatrix, rtcOrigin, tempMat4));

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            drawCall(frameCtx, layer.layerDrawState, rotationMatrix, rtcViewMatrix, projMatrix, rtcOrigin, eye);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
