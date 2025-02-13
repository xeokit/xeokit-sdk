import {createLightSetup} from "../MeshRenderer.js";

export const LambertShaderSource = function(meshDrawHash, programVariables, geometry, material, scene) {
    const lightSetup       = createLightSetup(programVariables, scene._lightsState, false);
    const colorize         = programVariables.createUniform("vec4", "colorize");
    const materialAlpha    = programVariables.createUniform("float", "materialAlpha");
    const materialColor    = programVariables.createUniform("vec3", "materialColor");
    const materialEmissive = programVariables.createUniform("vec3", "materialEmissive");
    const vColor           = programVariables.createVarying("vec4", "vColor");
    const outColor         = programVariables.createOutput("vec4", "outColor");

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
        appendVertexOutputs: (src) => {
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            const attributes = geometry.attributes;
            attributes.normal && lightSetup.directionalLights.forEach(light => {
                src.push(`reflectedColor += max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()};`);
            });
            src.push(`${vColor} = ${colorize} * vec4((${lightSetup.getAmbientColor()} + reflectedColor) * ${materialColor} + ${materialEmissive}, ${materialAlpha});`); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression(vColor) : vColor};`),
        setupProgramInputs: () => {
            const setColorize = colorize.setupInputs();
            const setMaterialAlpha = materialAlpha.setupInputs();
            const setMaterialColor = materialColor.setupInputs();
            const setMaterialEmissive = materialEmissive.setupInputs();
            return {
                setLightStateValues: lightSetup.setupInputs(),
                setMeshStateValues: (mesh) => setColorize(mesh.colorize),
                setMaterialStateValues: (mtl) => {
                    setMaterialAlpha(mtl.alpha);
                    setMaterialColor(mtl.color);
                    setMaterialEmissive(mtl.emissive);
                }
            };
        }
    };
};
