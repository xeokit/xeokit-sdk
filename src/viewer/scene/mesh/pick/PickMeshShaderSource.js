import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const PickMeshShaderSource = function(meshHash, programVariables) {
    const pickColor = programVariables.createUniform("vec4", "pickColor");
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        getHash: () => [ meshHash ],
        programName: "PickMesh",
        isPick: true,
        dontBillboardAnything: true,
        appendFragmentOutputs: (src) => src.push(`${outColor} = ${pickColor};`),
        setupProgramInputs: () => {
            const setPickColor = pickColor.setupInputs();
            return {
                setMeshStateValues: (mesh) => {
                    var pickID = mesh._state.pickID; // Mesh-indexed color
                    tmpVec4[0] = pickID       & 0xFF;
                    tmpVec4[1] = pickID >>  8 & 0xFF;
                    tmpVec4[2] = pickID >> 16 & 0xFF;
                    tmpVec4[3] = pickID >> 24 & 0xFF;
                    math.mulVec4Scalar(tmpVec4, 1 / 255, tmpVec4);
                    setPickColor(tmpVec4);
                }
            };
        }
    };
};
