import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export function EmphasisFillShaderSource(mesh) {
    const scene = mesh.scene;
    const lightsState = scene._lightsState;
    const primitive = mesh._geometry._state.primitiveName;
    const normals = (mesh._geometry._state.autoVertexNormals || mesh._geometry._state.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const billboard = mesh._state.billboard;
    const gammaOutput = scene.gammaOutput;

    return {
        programName: "EmphasisFill",
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 fillColor;");
            if (normals) {
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
                    }
                }
            }
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, normal) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
            src.push("float lambertian = 1.0;");
            if (normals) {
                src.push("mat4 modelNormalMatrix2 = modelNormalMatrix;");
                src.push("mat4 viewNormalMatrix2 = viewNormalMatrix;");
                if (billboard === "spherical" || billboard === "cylindrical") {
                    src.push("mat4 modelViewNormalMatrix =  viewNormalMatrix2 * modelNormalMatrix2;");
                    src.push("billboard(modelNormalMatrix2);");
                    src.push("billboard(viewNormalMatrix2);");
                    src.push("billboard(modelViewNormalMatrix);");
                }
                src.push(`vec3 viewNormal = normalize((viewNormalMatrix2 * modelNormalMatrix2 * vec4(${normal}, 0.0)).xyz);`);
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
                            src.push("viewLightDir = normalize(lightPos" + i + " - viewPosition.xyz);");
                        } else {
                            src.push("viewLightDir = normalize((viewMatrix2 * vec4(lightPos" + i + ", 0.0)).xyz);");
                        }
                    } else {
                        continue;
                    }
                    src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
                    src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
                }
            }
            // TODO: A blending mode for emphasis materials, to select add/multiply/mix
            //src.push("vColor = vec4((mix(reflectedColor, fillColor.rgb, 0.7)), fillColor.a);");
            src.push("vColor = vec4(reflectedColor * fillColor.rgb, fillColor.a);");
            //src.push("vColor = vec4(reflectedColor + fillColor.rgb, fillColor.a);");
        },
        appendFragmentDefinitions: (src) => {
            if (gammaOutput) {
                src.push("uniform float gammaFactor;");
                src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                src.push("}");
            }
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => {
            if (mesh._geometry._state.primitiveName === "points") {
                src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
                src.push("float r = dot(cxy, cxy);");
                src.push("if (r > 1.0) {");
                src.push("   discard;");
                src.push("}");
            }
            src.push(`outColor = ${gammaOutput ? "linearToGamma(vColor, gammaFactor)" : "vColor"};`);
        },
        setupInputs: gammaOutput && ((getInputSetter) => {
            const gammaFactor = getInputSetter("gammaFactor");
            return () => gammaFactor(scene.gammaFactor);
        }),
        setupMaterialInputs: (getInputSetter) => {
            const fillColor = getInputSetter("fillColor");
            return (mtl) => {
                tmpVec4.set(mtl.fillColor);
                tmpVec4[3] = mtl.fillAlpha;
                fillColor(tmpVec4);
            };
        }
    };
}
