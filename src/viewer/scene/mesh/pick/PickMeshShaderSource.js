import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const PickMeshShaderSource = function(meshHash, programVariables) {
    const pickColor = programVariables.createUniform("vec4", "pickColor", (set, state) => {
        var pickID = state.meshPickID; // Mesh-indexed color
        tmpVec4[0] = pickID       & 0xFF;
        tmpVec4[1] = pickID >>  8 & 0xFF;
        tmpVec4[2] = pickID >> 16 & 0xFF;
        tmpVec4[3] = pickID >> 24 & 0xFF;
        math.mulVec4Scalar(tmpVec4, 1 / 255, tmpVec4);
        set(tmpVec4);
    });
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        getHash: () => [ meshHash ],
        programName: "PickMesh",
        isPick: true,
        dontBillboardAnything: true,
        appendFragmentOutputs: (src) => src.push(`${outColor} = ${pickColor};`)
    };
};
