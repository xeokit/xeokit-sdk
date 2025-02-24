import {createLightSetup} from "../../webgl/WebGLRenderer.js";

export const LambertShaderSource = function(meshDrawHash, programVariables, geometry, material, scene) {
    const lightSetup       = createLightSetup(programVariables, scene._lightsState);
    const colorize         = programVariables.createUniform("vec4",  "colorize",         (set, state) => set(state.meshColorize));
    const materialAlpha    = programVariables.createUniform("float", "materialAlpha",    (set, state) => set(state.material.alpha));
    const materialColor    = programVariables.createUniform("vec3",  "materialColor",    (set, state) => set(state.material.color));
    const materialEmissive = programVariables.createUniform("vec3",  "materialEmissive", (set, state) => set(state.material.emissive));
    const vColor           = programVariables.createVarying("vec4", "vColor", () => {
        const attributes = geometry.attributes;
        const lightComponents = [
            lightSetup.getAmbientColor()
        ].concat(attributes.normal
                 ? lightSetup.directionalLights.map(
                     light => `(max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()})`)
                 : [ ]);
        return `${colorize} * vec4((${lightComponents.join(" + ")}) * ${materialColor} + ${materialEmissive}, ${materialAlpha});`; // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
    });
    const outColor = programVariables.createOutput("vec4", "outColor");

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
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression(vColor) : vColor};`)
    };
};
