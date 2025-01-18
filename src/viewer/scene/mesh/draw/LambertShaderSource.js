import {createGammaOutputSetup, createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const LambertShaderSource = function(mesh) {
    const scene = mesh.scene;
    const geometryState = mesh._geometry._state;
    const primitive = geometryState.primitiveName;
    const lightSetup = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan") && createLightSetup(scene._lightsState);
    const gammaOutputSetup = createGammaOutputSetup(scene);

    return {
        programName: "Lambert",
        canActAsBackground: true,
        discardPoints: true,
        setupPointSize: true,
        setsFrontFace: true,
        setsLineWidth: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 colorize;");
            src.push("uniform vec4 materialColor;");
            src.push("uniform vec3 materialEmissive;");
            lightSetup && lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            lightSetup && lightSetup.getDirectionalLights("viewMatrix2", "viewPosition").forEach(light => {
                src.push(`reflectedColor += max(dot(-${viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
            });
            const ambientComponent = lightSetup ? (lightSetup.getAmbientColor() + " + ") : "";
            src.push(`vColor = colorize * vec4((${ambientComponent}reflectedColor) * materialColor.rgb + materialEmissive.rgb, materialColor.a);`); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            gammaOutputSetup && gammaOutputSetup.appendDefinitions(src);
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push(`outColor = ${gammaOutputSetup ? gammaOutputSetup.getValueExpression("vColor") : "vColor"};`),
        setupInputs: (getInputSetter) => {
            const colorize = getInputSetter("colorize");
            const setGammaOutput = gammaOutputSetup && gammaOutputSetup.setupInputs(getInputSetter);
            return (frameCtx, meshState) => {
                colorize(meshState.colorize);
                setGammaOutput && setGammaOutput();
            };
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
        setupLightInputs: lightSetup && lightSetup.setupInputs
    };
};

LambertShaderSource.getHash = (mesh) => [
    mesh._state.drawHash,
    mesh.scene.gammaOutput ? "go" : "",
    mesh.scene._lightsState.getHash(),
    mesh._material._state.hash
];
