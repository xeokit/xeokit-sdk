import {createGammaOutputSetup, createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const EmphasisFillShaderSource = function(mesh) {
    const scene = mesh.scene;
    const geometryState = mesh._geometry._state;
    const primitive = geometryState.primitiveName;
    const lightSetup = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan") && createLightSetup(scene._lightsState);
    const gammaOutputSetup = createGammaOutputSetup(scene);

    return {
        programName: "EmphasisFill",
        discardPoints: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 fillColor;");
            lightSetup && lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            lightSetup && lightSetup.getDirectionalLights("viewMatrix2", "viewPosition").forEach(light => {
                src.push(`reflectedColor += max(dot(-${viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
            });
            // TODO: A blending mode for emphasis materials, to select add/multiply/mix
            //src.push("vColor = vec4((mix(reflectedColor, fillColor.rgb, 0.7)), fillColor.a);");
            const ambientComponent = lightSetup ? (lightSetup.getAmbientColor() + " + ") : "";
            src.push(`vColor = vec4((${ambientComponent}reflectedColor) * fillColor.rgb, fillColor.a);`);
            //src.push("vColor = vec4(reflectedColor + fillColor.rgb, fillColor.a);");
        },
        appendFragmentDefinitions: (src) => {
            gammaOutputSetup && gammaOutputSetup.appendDefinitions(src);
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push(`outColor = ${gammaOutputSetup ? gammaOutputSetup.getValueExpression("vColor") : "vColor"};`),
        setupInputs: gammaOutputSetup && gammaOutputSetup.setupInputs,
        setupMaterialInputs: (getInputSetter) => {
            const fillColor = getInputSetter("fillColor");
            return (mtl) => {
                tmpVec4.set(mtl.fillColor);
                tmpVec4[3] = mtl.fillAlpha;
                fillColor(tmpVec4);
            };
        },
        setupLightInputs: lightSetup && lightSetup.setupInputs
    };
};

EmphasisFillShaderSource.getHash = (mesh) => [
    mesh._state.hash,
    mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
    mesh.scene._lightsState.getHash(),
    mesh._geometry._state.normalsBuf ? "n" : "",
    mesh._geometry._state.compressGeometry ? "cp" : ""
];
