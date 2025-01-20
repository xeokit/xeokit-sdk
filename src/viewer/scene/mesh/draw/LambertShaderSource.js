import {createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const LambertShaderSource = function(mesh) {
    const geometryState = mesh._geometry._state;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const lightSetup = createLightSetup(mesh.scene._lightsState);

    return {
        programName: "Lambert",
        canActAsBackground: true,
        discardPoints: true,
        setupPointSize: true,
        setsFrontFace: true,
        setsLineWidth: true,
        useGammaOutput: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 colorize;");
            src.push("uniform vec4 materialColor;");
            src.push("uniform vec3 materialEmissive;");
            lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            normals && lightSetup.directionalLights.forEach(light => {
                src.push(`reflectedColor += max(dot(${viewNormal}, ${light.getDirection("viewMatrix2", "viewPosition")}), 0.0) * ${light.getColor()};`);
            });
            src.push(`vColor = colorize * vec4((${lightSetup.getAmbientColor()} + reflectedColor) * materialColor.rgb + materialEmissive.rgb, materialColor.a);`); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("vColor") : "vColor"};`),
        setupMeshInputs: (getInputSetter) => {
            const colorize = getInputSetter("colorize");
            return (mesh) => colorize(mesh.colorize);
        },
        setupMaterialInputs: (getInputSetter) => {
            const materialColor = getInputSetter("materialColor");
            const materialEmissive = getInputSetter("materialEmissive");
            return (mtl) => {
                tmpVec4.set(mtl.color);
                tmpVec4[3] = mtl.alpha;
                materialColor(tmpVec4);
                materialEmissive(mtl.emissive);
            };
        },
        setupLightInputs: lightSetup.setupInputs
    };
};

LambertShaderSource.getHash = (mesh) => [
    mesh._state.drawHash,
    mesh.scene.gammaOutput ? "go" : "",
    mesh.scene._lightsState.getHash(),
    mesh._material._state.hash
];
