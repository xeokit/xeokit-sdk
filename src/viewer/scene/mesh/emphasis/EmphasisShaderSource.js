import {createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const EmphasisShaderSource = function(meshHash, geometryState, scene, isFill) {
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const lightSetup = isFill && createLightSetup(scene._lightsState);
    return {
        getHash: () => [
            meshHash,
            scene.gammaOutput ? "go" : "", // Gamma input not needed
            lightSetup && lightSetup.getHash()
        ],
        programName: isFill ? "EmphasisFill" : "EmphasisEdges",
        dontSetFrontFace: true,
        discardPoints: isFill,
        drawEdges: ! isFill,
        useGammaOutput: true,
        appendVertexDefinitions: (src) => {
            lightSetup && lightSetup.appendDefinitions(src);
            src.push("uniform vec4 uColor;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, world, view) => {
            if (lightSetup) {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                normals && lightSetup.directionalLights.forEach(light => {
                    src.push(`reflectedColor += max(dot(${view.viewNormal}, ${light.getDirection(view.viewMatrix, view.viewPosition)}), 0.0) * ${light.getColor()};`);
                });
                // TODO: A blending mode for emphasis materials, to select add/multiply/mix
                //src.push("vColor = vec4((mix(reflectedColor, uColor.rgb, 0.7)), uColor.a);");
                src.push(`vColor = vec4((${lightSetup.getAmbientColor()} + reflectedColor) * uColor.rgb, uColor.a);`);
                //src.push("vColor = vec4(reflectedColor + uColor.rgb, uColor.a);");
            } else {
                src.push("vColor = uColor;");
            }
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("vColor") : "vColor"};`),
        setupMaterialInputs: (getInputSetter) => {
            const uColor = getInputSetter("uColor");
            return (mtl) => {
                if (isFill) {
                    tmpVec4.set(mtl.fillColor);
                    tmpVec4[3] = mtl.fillAlpha;
                } else {
                    tmpVec4.set(mtl.edgeColor);
                    tmpVec4[3] = mtl.edgeAlpha;
                }
                uColor(tmpVec4);
            };
        },
        setupLightInputs: lightSetup && lightSetup.setupInputs
    };
};
