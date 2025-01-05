export const LambertShaderSource = function(mesh) {
    const geometryState = mesh._geometry._state;
    const lightsState = mesh.scene._lightsState;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const gammaOutput = mesh.scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
    return {
        programName: "Lambert",
        discardPoints: true,
        setupPointSize: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 colorize;");
            src.push("uniform vec4 lightAmbient;");
            src.push("uniform vec4 materialColor;");
            src.push("uniform vec3 materialEmissive;");
            if (normals) {
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
            }
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
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
                    src.push(`lambertian = max(dot(-${viewNormal}, viewLightDir), 0.0);`);
                    src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
                }
            }
            src.push("vColor = vec4((lightAmbient.rgb * lightAmbient.a * materialColor.rgb) + materialEmissive.rgb + (reflectedColor * materialColor.rgb), materialColor.a) * colorize;"); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
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
        appendFragmentOutputs: (src) => src.push(`outColor = ${gammaOutput ? "linearToGamma(vColor, gammaFactor)" : "vColor"};`)
    };
};
