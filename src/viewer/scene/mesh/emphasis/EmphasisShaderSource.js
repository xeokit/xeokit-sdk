import {createLightSetup} from "../../webgl/WebGLRenderer.js";

export const EmphasisShaderSource = function(meshHash, programVariables, geometry, scene, isFill) {
    const lightSetup = isFill && createLightSetup(programVariables, scene._lightsState);
    const uColor = programVariables.createUniform("vec3",  "uColor", (set, state) => set(isFill ? state.material.fillColor : state.material.edgeColor));
    const uAlpha = programVariables.createUniform("float", "uAlpha", (set, state) => set(isFill ? state.material.fillAlpha : state.material.edgeAlpha));
    const vColor = programVariables.createVarying("vec4", "vColor", () => {
        const attributes = geometry.attributes;
        const lightComponents = isFill && [
            lightSetup.getAmbientColor()
        ].concat(attributes.normal
                 ? lightSetup.directionalLights.map(
                     light => `(max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()})`)
                 : [ ]);
        // TODO: A blending mode for emphasis materials, to select add/multiply/mix
        // `vec4((mix(reflectedColor, ${uColor}, 0.7)), ${uAlpha})`
        return `vec4(${uColor}${lightComponents ? ` * (${lightComponents.join(" + ")})` : ""}, ${uAlpha})`;
        // `${vColor} = vec4(reflectedColor + ${uColor}, ${uAlpha})`
    });

    const outColor = programVariables.createOutput("vec4", "outColor");
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
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression(vColor) : vColor};`)
    };
};
