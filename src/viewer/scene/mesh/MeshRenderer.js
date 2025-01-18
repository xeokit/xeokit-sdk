import {math} from "../math/math.js";
import {getPlaneRTCPos} from "../math/rtcCoords.js";

const tempVec3a = math.vec3();
const tempVec4 = math.vec4();

export function MeshRenderer(programSetup, mesh) {

    const scene = mesh.scene;
    const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
    const clipping = numAllocatedSectionPlanes > 0;
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const geometryState = mesh._geometry._state;
    const quantizedGeometry = geometryState.compressGeometry;
    const isPoints = geometryState.primitiveName === "points";
    const setupPointSize = programSetup.setupPointSize && isPoints;

    const lazyShaderAttribute = function(name, type) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            },
            definition: `in ${type} ${name};`
        };
        return variable;
    };

    const attributes = {
        position:  lazyShaderAttribute("position",  "vec3"),
        color:     lazyShaderAttribute("color",     "vec4"),
        pickColor: lazyShaderAttribute("pickColor", "vec4"),
        uv:        lazyShaderAttribute("uv",        "vec2"),
        normal:    lazyShaderAttribute("normal",    "vec3")
    };

    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const uvDecoded   = lazyShaderVariable("uvDecoded");
    const worldNormal = lazyShaderVariable("worldNormal");
    const viewNormal  = lazyShaderVariable("viewNormal");

    const programFragmentOutputs = [ ];
    programSetup.appendFragmentOutputs(programFragmentOutputs, "vWorldPosition", "gl_FragCoord");

    const programVertexOutputs = [ ];
    programSetup.appendVertexOutputs && programSetup.appendVertexOutputs(programVertexOutputs, attributes.color, attributes.pickColor, uvDecoded, worldNormal, viewNormal);

    const buildVertexShader = () => {
        const billboard = mesh._state.billboard;
        const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
        const stationary = mesh._state.stationary;

        const viewNormalLines = viewNormal.needed && [
            "mat4 viewNormalMatrix2 = viewNormalMatrix;",
            isBillboard && "billboard(viewNormalMatrix2);",
            `vec3 ${viewNormal} = normalize((viewNormalMatrix2 * vec4(${worldNormal}, 0.0)).xyz);`
        ].filter(line => line);

        const mainVertexOutputs = (function() {
            const src = [ ];
            src.push(`vec4 localPosition = vec4(${attributes.position}, 1.0);`);
            if (quantizedGeometry) {
                src.push("localPosition = positionsDecodeMatrix * localPosition;");
            }
            if (programSetup.dontBillboardAnything) {
                src.push("vec4 worldPosition = modelMatrix * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                src.push("vec4 viewPosition = viewMatrix * worldPosition;");
            } else {
                src.push("mat4 viewMatrix2 = viewMatrix;");
                src.push("mat4 modelMatrix2 = modelMatrix;");
                if (stationary) {
                    src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;");
                } else if (programSetup.meshStateBackground) {
                    src.push("viewMatrix2[3] = vec4(0.0, 0.0, 0.0 ,1.0);");
                }
                if (isBillboard) {
                    src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
                    src.push("billboard(modelMatrix2);");
                    src.push("billboard(viewMatrix2);");
                }
                src.push("vec4 worldPosition = modelMatrix2 * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                if (isBillboard) {
                    src.push("billboard(modelViewMatrix);");
                    src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
                } else {
                    src.push("vec4 viewPosition = viewMatrix2 * worldPosition;");
                }
            }
            if (uvDecoded.needed) {
                src.push(`vec2 uvDecoded = ${quantizedGeometry ? `(uvDecodeMatrix * vec3(${attributes.uv}, 1.0)).xy` : attributes.uv};`);
            }
            if (worldNormal.needed) {
                src.push(`vec3 localNormal = ${quantizedGeometry ? `octDecode(${attributes.normal}.xy)` : attributes.normal};`);
                src.push("mat4 modelNormalMatrix2 = modelNormalMatrix;");
                isBillboard && src.push("billboard(modelNormalMatrix2);");
                src.push(`vec3 ${worldNormal} = (modelNormalMatrix2 * vec4(localNormal, 0.0)).xyz;`);
            }
            viewNormalLines && viewNormalLines.forEach(line => src.push(line));
            return src;
        })();

        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " vertex shader");
        Object.values(attributes).forEach(a => a.needed && src.push(a.definition));
        src.push("uniform mat4 modelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        src.push("uniform vec3 offset;");
        src.push("uniform vec3 scale;");
        if (quantizedGeometry) {
            src.push("uniform mat4 positionsDecodeMatrix;");
            if (uvDecoded.needed) {
                src.push("uniform mat3 uvDecodeMatrix;");
            }
            if (worldNormal.needed) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
            }
        }
        if (getLogDepth) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
        }
        if (isBillboard) {
            src.push("void billboard(inout mat4 mat) {");
            src.push("   mat[0][0] = scale[0];");
            src.push("   mat[0][1] = 0.0;");
            src.push("   mat[0][2] = 0.0;");
            if (billboard === "spherical") {
                src.push("   mat[1][0] = 0.0;");
                src.push("   mat[1][1] = scale[1];");
                src.push("   mat[1][2] = 0.0;");
            }
            src.push("   mat[2][0] = 0.0;");
            src.push("   mat[2][1] = 0.0;");
            src.push("   mat[2][2] =1.0;");
            src.push("}");
        }
        if (setupPointSize) {
            src.push("uniform float pointSize;");
        }
        if (worldNormal.needed) {
            src.push("uniform mat4 modelNormalMatrix;");
        }
        if (viewNormal.needed) {
            src.push("uniform mat4 viewNormalMatrix;");
        }
        programSetup.appendVertexDefinitions && programSetup.appendVertexDefinitions(src);
        src.push("void main(void) {");
        mainVertexOutputs.forEach(line => src.push(line));
        programVertexOutputs.forEach(line => src.push(line));
        if (setupPointSize) {
            src.push("gl_PointSize = pointSize;");
        }
        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (getLogDepth) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = " + (programSetup.transformClipPos ? programSetup.transformClipPos("clipPos") : "clipPos") + ";");
        src.push("}");
        return src;
    };

    const buildFragmentShader = () => {
        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " fragment shader");
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
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("uniform bool clippable;");
            for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        programSetup.appendFragmentDefinitions(src);
        src.push("void main(void) {");
        if (clipping) {
            src.push("if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (isPoints && programSetup.discardPoints) {
            src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
            src.push("float r = dot(cxy, cxy);");
            src.push("if (r > 1.0) {");
            src.push("   discard;");
            src.push("}");
        }
        programFragmentOutputs.forEach(line => src.push(line));
        if (getLogDepth) {
            src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("}");
        return src;
    };

    const binder = (arrayBuf, onBindAttribute) => ({ // see ArrayBuf.js and Attribute.js
        bindAtLocation: location => {
            arrayBuf.bind();
            arrayBuf._gl.vertexAttribPointer(location, arrayBuf.itemSize, arrayBuf.itemType, arrayBuf.normalized, 0, 0);
            onBindAttribute();
        }
    });

    return {
        vertex:   buildVertexShader(),
        fragment: buildFragmentShader(),
        setupGeometryInputs: (getInputSetter) => {
            const uPositionsDecodeMatrix = quantizedGeometry && getInputSetter("positionsDecodeMatrix");
            const uvDecodeMatrix = uvDecoded.needed && quantizedGeometry && getInputSetter("uvDecodeMatrix");
            const aPosition = getInputSetter("position");
            const aNormal = attributes.normal.needed && getInputSetter("normal");
            const aUV = attributes.uv.needed && getInputSetter("uv");
            const aColor = attributes.color.needed && getInputSetter("color");
            const aPickColor = attributes.pickColor.needed && getInputSetter("pickColor");

            return (geometryState, onBindAttribute, triangleGeometry) => {
                uPositionsDecodeMatrix && uPositionsDecodeMatrix(geometryState.positionsDecodeMatrix);
                uvDecodeMatrix && uvDecodeMatrix(geometryState.uvDecodeMatrix);

                aPosition(binder((triangleGeometry || geometryState).positionsBuf, onBindAttribute));
                aNormal && aNormal(binder(geometryState.normalsBuf, onBindAttribute));
                aUV && aUV(binder(geometryState.uvBuf, onBindAttribute));
                aColor && aColor(binder(geometryState.colorsBuf, onBindAttribute));
                aPickColor && aPickColor(binder(triangleGeometry.pickColorsBuf, onBindAttribute));
            };
        },
        setupGeneralMaterialInputs: setupPointSize && function(getInputSetter) {
            const pointSize = getInputSetter("pointSize");
            return (mtl) => pointSize(mtl.pointSize);
        },
        setupSectionPlanesInputs: (getInputSetter) => {
            return clipping && (function() {
                const uClippable = getInputSetter("clippable");
                const uSectionPlanes = [];
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    uSectionPlanes.push({
                        active: getInputSetter("sectionPlaneActive" + i),
                        pos:    getInputSetter("sectionPlanePos" + i),
                        dir:    getInputSetter("sectionPlaneDir" + i)
                    });
                }

                return (origin, renderFlags, clippable, sectionPlanesState) => {
                    uClippable(clippable);

                    if (clippable) {
                        const numAllocatedSectionPlanes = sectionPlanesState.getNumAllocatedSectionPlanes();
                        const sectionPlanes = sectionPlanesState.sectionPlanes;
                        const numSectionPlanes = sectionPlanes.length;
                        if (numAllocatedSectionPlanes > 0) {
                            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                                const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
                                if (sectionPlaneUniforms) {
                                    const active = (sectionPlaneIndex < numSectionPlanes) && renderFlags.sectionPlanesActivePerLayer[sectionPlaneIndex];
                                    sectionPlaneUniforms.active(active ? 1 : 0);
                                    if (active) {
                                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                                        if (origin) {
                                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a);
                                            sectionPlaneUniforms.pos(rtcSectionPlanePos);
                                        } else {
                                            sectionPlaneUniforms.pos(sectionPlane.pos);
                                        }
                                        sectionPlaneUniforms.dir(sectionPlane.dir);
                                    }
                                }
                            }
                        }
                    }
                };
            })();
        }
    };
};

export const createGammaOutputSetup = function(scene) {
    return scene.gammaOutput && {
        appendDefinitions: (src) => {
            src.push("uniform float gammaFactor;");
            src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
            src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
            src.push("}");
        },
        getValueExpression: (color) => `linearToGamma(${color}, gammaFactor)`,
        setupInputs: (getInputSetter) => {
            const gammaFactor = getInputSetter("gammaFactor");
            return () => gammaFactor(scene.gammaFactor);
        }
    };
};

export const createLightSetup = function(lightsState) {
    const lights = lightsState.lights;
    return {
        appendDefinitions: (src) => {
            src.push("uniform vec4 lightAmbient;");
            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
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
                if (light.type === "spot") { // not used
                    src.push("uniform vec3 lightPos" + i + ";");
                    src.push("uniform vec3 lightDir" + i + ";");
                }
            }
        },
        getAmbientColor: () => "lightAmbient.rgb * lightAmbient.a",
        getDirectionalLights: (viewMatrix, viewPosition) => {
            return lights.map((light, i) => {
                const withViewLightDir = direction => ({
                    color: `lightColor${i}.rgb * lightColor${i}.a`,
                    direction: `normalize(${direction})`
                });
                if (light.type === "dir") {
                    if (light.space === "view") {
                        return withViewLightDir(`lightDir${i}`);
                    } else {
                        return withViewLightDir(`(${viewMatrix} * vec4(lightDir${i}, 0.0)).xyz`);
                    }
                } else if (light.type === "point") {
                    if (light.space === "view") {
                        return withViewLightDir(`lightPos${i} - ${viewPosition}.xyz`);
                    } else {
                        return withViewLightDir(`(${viewMatrix} * vec4(lightPos${i}, 0.0)).xyz)`);
                    }
                } else {
                    return null;
                }
            }).filter(v => v);
        },
        setupInputs: (getUniformSetter) => {
            const uLightAmbient = getUniformSetter("lightAmbient");

            const uLightColor = [];
            const uLightDir = [];
            const uLightPos = [];

            const uShadowViewMatrix = [];
            const uShadowProjMatrix = [];
            const uShadowMap        = [];

            for (let i = 0, len = lights.length; i < len; i++) {
                const light = lights[i];
                switch (light.type) {
                case "dir":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = null;
                    uLightDir[i] = getUniformSetter("lightDir" + i);
                    break;
                case "point":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = getUniformSetter("lightPos" + i);
                    uLightDir[i] = null;
                    break;
                case "spot":
                    uLightColor[i] = getUniformSetter("lightColor" + i);
                    uLightPos[i] = getUniformSetter("lightPos" + i);
                    uLightDir[i] = getUniformSetter("lightDir" + i);
                    break;
                }

                if (light.castsShadow) {
                    uShadowViewMatrix[i] = getUniformSetter("shadowViewMatrix" + i);
                    uShadowProjMatrix[i] = getUniformSetter("shadowProjMatrix" + i);
                    uShadowMap[i]        = getUniformSetter("shadowMap" + i);
                }
            }

            return () => {
                uLightAmbient(lightsState.getAmbientColorAndIntensity());
                for (let i = 0, len = lights.length; i < len; i++) {
                    const light = lights[i];
                    if (uLightColor[i]) {
                        tempVec4[0] = light.color[0];
                        tempVec4[1] = light.color[1];
                        tempVec4[2] = light.color[2];
                        tempVec4[3] = light.intensity;
                        uLightColor[i](tempVec4);
                    }
                    if (uLightPos[i]) {
                        uLightPos[i](light.pos);
                    }
                    if (uLightDir[i]) {
                        uLightDir[i](light.dir);
                    }
                    if (light.castsShadow) {
                        if (uShadowViewMatrix[i]) {
                            uShadowViewMatrix[i](light.getShadowViewMatrix());
                        }
                        if (uShadowProjMatrix[i]) {
                            uShadowProjMatrix[i](light.getShadowProjMatrix());
                        }
                        const shadowRenderBuf = uShadowMap[i] && light.getShadowRenderBuf();
                        if (shadowRenderBuf) {
                            uShadowMap[i](shadowRenderBuf.getTexture());
                        }
                    }
                }
            };
        }
    };
};
