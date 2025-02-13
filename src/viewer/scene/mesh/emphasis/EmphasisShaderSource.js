import {createLightSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const EmphasisShaderSource = function(meshHash, programVariables, geometry, scene, isFill) {
    const lightSetup = isFill && createLightSetup(programVariables, scene._lightsState, false);
    const uColor = programVariables.createUniform("vec4", "uColor");
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
                //src.push(`${vColor} = vec4((mix(reflectedColor, ${uColor}.rgb, 0.7)), ${uColor}.a);`);
                src.push(`${vColor} = vec4((${lightSetup.getAmbientColor()} + reflectedColor) * ${uColor}.rgb, ${uColor}.a);`);
                //src.push(`${vColor} = vec4(reflectedColor + ${uColor}.rgb, ${uColor}.a);`);
            } else {
                src.push(`${vColor} = ${uColor};`);
            }
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression(vColor) : vColor};`),
        setupProgramInputs: () => {
            const setColor = uColor.setupInputs();
            return {
                setLightStateValues: lightSetup && lightSetup.setupInputs(),
                setMaterialStateValues: (mtl) => {
                    if (isFill) {
                        tmpVec4.set(mtl.fillColor);
                        tmpVec4[3] = mtl.fillAlpha;
                    } else {
                        tmpVec4.set(mtl.edgeColor);
                        tmpVec4[3] = mtl.edgeAlpha;
                    }
                    setColor(tmpVec4);
                }
            };
        }
    };
};
