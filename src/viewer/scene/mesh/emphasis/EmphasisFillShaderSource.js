import {createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const EmphasisFillShaderSource = function(mesh) {
    const geometryState = mesh._geometry._state;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const lightSetup = createLightSetup(mesh.scene._lightsState);

    return {
        programName: "EmphasisFill",
        discardPoints: true,
        useGammaOutput: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 fillColor;");
            lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            normals && lightSetup.directionalLights.forEach(light => {
                src.push(`reflectedColor += max(dot(${viewNormal}, ${light.getDirection("viewMatrix2", "viewPosition")}), 0.0) * ${light.getColor()};`);
            });
            // TODO: A blending mode for emphasis materials, to select add/multiply/mix
            //src.push("vColor = vec4((mix(reflectedColor, fillColor.rgb, 0.7)), fillColor.a);");
            src.push(`vColor = vec4((${lightSetup.getAmbientColor()} + reflectedColor) * fillColor.rgb, fillColor.a);`);
            //src.push("vColor = vec4(reflectedColor + fillColor.rgb, fillColor.a);");
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("vColor") : "vColor"};`),
        setupMaterialInputs: (getInputSetter) => {
            const fillColor = getInputSetter("fillColor");
            return (mtl) => {
                tmpVec4.set(mtl.fillColor);
                tmpVec4[3] = mtl.fillAlpha;
                fillColor(tmpVec4);
            };
        },
        setupLightInputs: lightSetup.setupInputs
    };
};

EmphasisFillShaderSource.getHash = (mesh) => [
    mesh._state.hash,
    mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
    mesh.scene._lightsState.getHash()
];
