import {createLightSetup, lazyShaderUniform} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const LambertShaderSource = function(meshDrawHash, geometry, material, scene) {
    const lightSetup = createLightSetup(scene._lightsState);
    const colorize         = lazyShaderUniform("colorize",         "vec4");
    const materialColor    = lazyShaderUniform("materialColor",    "vec4");
    const materialEmissive = lazyShaderUniform("materialEmissive", "vec3");

    return {
        getHash: () => [
            meshDrawHash,
            scene.gammaOutput ? "go" : "",
            lightSetup.getHash(),
            material._state.hash
        ],
        programName: "Lambert",
        canActAsBackground: true,
        discardPoints: true,
        setupPointSize: true,
        setsLineWidth: true,
        useGammaOutput: true,
        appendVertexDefinitions: (src) => {
            colorize.appendDefinitions(src);
            materialColor.appendDefinitions(src);
            materialEmissive.appendDefinitions(src);
            lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            const attributes = geometry.attributes;
            attributes.normal && lightSetup.directionalLights.forEach(light => {
                src.push(`reflectedColor += max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()};`);
            });
            src.push(`vColor = ${colorize} * vec4((${lightSetup.getAmbientColor()} + reflectedColor) * ${materialColor}.rgb + ${materialEmissive}, ${materialColor}.a);`); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
        },
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("vColor") : "vColor"};`),
        setupMeshInputs: (getInputSetter) => {
            const setColorize = colorize.setupInputs(getInputSetter);
            return (mesh) => setColorize(mesh.colorize);
        },
        setupMaterialInputs: (getInputSetter) => {
            const setMaterialColor = materialColor.setupInputs(getInputSetter);
            const setMaterialEmissive = materialEmissive.setupInputs(getInputSetter);
            return (mtl) => {
                tmpVec4.set(mtl.color);
                tmpVec4[3] = mtl.alpha;
                setMaterialColor(tmpVec4);
                setMaterialEmissive(mtl.emissive);
            };
        },
        setupLightInputs: lightSetup.setupInputs
    };
};
