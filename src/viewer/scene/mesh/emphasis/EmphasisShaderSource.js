import {createLightSetup} from "../MeshRenderer.js";

export const EmphasisShaderSource = function(meshHash, programVariables, geometry, scene, isFill) {
    const lightSetup = isFill && createLightSetup(programVariables, scene._lightsState, false);
    const uColor = programVariables.createUniform("vec3", "uColor");
    const uAlpha = programVariables.createUniform("float", "uAlpha");
    const vColor = programVariables.createVarying("vec4", "vColor");
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
        appendVertexOutputs: (src) => {
            if (lightSetup) {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                const attributes = geometry.attributes;
                attributes.normal && lightSetup.directionalLights.forEach(light => {
                    src.push(`reflectedColor += max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()};`);
                });
                // TODO: A blending mode for emphasis materials, to select add/multiply/mix
                //src.push(`${vColor} = vec4((mix(reflectedColor, ${uColor}, 0.7)), ${uAlpha});`);
                src.push(`${vColor} = vec4((${lightSetup.getAmbientColor()} + reflectedColor) * ${uColor}, ${uAlpha});`);
                //src.push(`${vColor} = vec4(reflectedColor + ${uColor}, ${uAlpha});`);
            } else {
                src.push(`${vColor} = vec4(${uColor}, ${uAlpha});`);
            }
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression(vColor) : vColor};`),
        setupProgramInputs: () => {
            const setColor = uColor.setupInputs();
            const setAlpha = uAlpha.setupInputs();
            return {
                setLightStateValues: lightSetup && lightSetup.setupInputs(),
                setMaterialStateValues: (mtl) => {
                    if (isFill) {
                        setColor(mtl.fillColor);
                        setAlpha(mtl.fillAlpha);
                    } else {
                        setColor(mtl.edgeColor);
                        setAlpha(mtl.edgeAlpha);
                    }
                }
            };
        }
    };
};
