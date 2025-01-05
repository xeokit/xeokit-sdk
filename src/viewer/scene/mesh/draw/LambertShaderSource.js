export const LambertShaderSource = function(mesh) {
    const billboard = mesh._state.billboard;
    const geometryState = mesh._geometry._state;
    const quantizedGeometry = !!geometryState.compressGeometry;
    const lightsState = mesh.scene._lightsState;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const gammaOutput = mesh.scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
    return {
        programName: "Lambert",
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 colorize;");
            src.push("uniform vec4 lightAmbient;");
            src.push("uniform vec4 materialColor;");
            src.push("uniform vec3 materialEmissive;");
            if (normals) {
                src.push("in vec3 normal;");
                src.push("uniform mat4 modelNormalMatrix;");
                src.push("uniform mat4 viewNormalMatrix;");
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
                if (quantizedGeometry) {
                    src.push("vec3 octDecode(vec2 oct) {");
                    src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                    src.push("    if (v.z < 0.0) {");
                    src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                    src.push("    }");
                    src.push("    return normalize(v);");
                    src.push("}");
                }
            }
            src.push("out vec4 vColor;");
            if (geometryState.primitiveName === "points") {
                src.push("uniform float pointSize;");
            }
        },
        appendVertexOutputs: (src) => {
            if (normals) {
                if (quantizedGeometry) {
                    src.push("vec4 localNormal = vec4(octDecode(normal.xy), 0.0); ");
                } else {
                    src.push("vec4 localNormal = vec4(normal, 0.0); ");
                }
                src.push("mat4 modelNormalMatrix2 = modelNormalMatrix;");
                src.push("mat4 viewNormalMatrix2 = viewNormalMatrix;");
                if (billboard === "spherical" || billboard === "cylindrical") {
                    src.push("mat4 modelViewNormalMatrix =  viewNormalMatrix2 * modelNormalMatrix2;");
                    src.push("billboard(modelNormalMatrix2);");
                    src.push("billboard(viewNormalMatrix2);");
                    src.push("billboard(modelViewNormalMatrix);");
                }
                src.push("vec3 viewNormal = normalize((viewNormalMatrix2 * modelNormalMatrix2 * localNormal).xyz);");
            }
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
            src.push("float lambertian = 1.0;");
            if (normals) {
                for (let i = 0, len = lightsState.lights.length; i < len; i++) {
                    const light = lightsState.lights[i];
                    if (light.type === "ambient") {
                        continue;
                    }
                    if (light.type === "dir") {
                        if (light.space === "view") {
                            src.push("viewLightDir = normalize(lightDir" + i + ");");
                        } else {
                            src.push("viewLightDir = normalize((viewMatrix2 * vec4(lightDir" + i + ", 0.0)).xyz);");
                        }
                    } else if (light.type === "point") {
                        if (light.space === "view") {
                            src.push("viewLightDir = -normalize(lightPos" + i + " - viewPosition.xyz);");
                        } else {
                            src.push("viewLightDir = -normalize((viewMatrix2 * vec4(lightPos" + i + ", 0.0)).xyz);");
                        }
                    } else if (light.type === "spot") {
                        if (light.space === "view") {
                            src.push("viewLightDir = normalize(lightDir" + i + ");");
                        } else {
                            src.push("viewLightDir = normalize((viewMatrix2 * vec4(lightDir" + i + ", 0.0)).xyz);");
                        }
                    } else {
                        continue;
                    }
                    src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
                    src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
                }
            }
            src.push("vColor = vec4((lightAmbient.rgb * lightAmbient.a * materialColor.rgb) + materialEmissive.rgb + (reflectedColor * materialColor.rgb), materialColor.a) * colorize;"); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
            if (geometryState.primitiveName === "points") {
                src.push("gl_PointSize = pointSize;");
            }
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            if (gammaOutput) {
                src.push("uniform float gammaFactor;");
                src.push("    vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                src.push("    return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                src.push("}");
            }
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => {
            if (geometryState.primitiveName === "points") {
                src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
                src.push("float r = dot(cxy, cxy);");
                src.push("if (r > 1.0) {");
                src.push("   discard;");
                src.push("}");

            }
            src.push(`outColor = ${gammaOutput ? "linearToGamma(vColor, gammaFactor)" : "vColor"};`);
        }
    };
};
