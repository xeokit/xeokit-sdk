import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const PickMeshShaderSource = function(mesh) {
    return {
        getHash: () => [ mesh._state.hash ],
        programName: "PickMesh",
        setsFrontFace: true,
        usePickView: true,
        dontBillboardAnything: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexDefinitions: (src) => src.push("uniform vec2 pickClipPos;"),
        appendFragmentDefinitions: (src) => {
            src.push("uniform vec4 pickColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("outColor = pickColor;"),
        setupMeshInputs: (getInputSetter) => {
            const pickColor = getInputSetter("pickColor");
            return (mesh) => {
                var pickID = mesh._state.pickID; // Mesh-indexed color
                tmpVec4[0] = pickID       & 0xFF;
                tmpVec4[1] = pickID >>  8 & 0xFF;
                tmpVec4[2] = pickID >> 16 & 0xFF;
                tmpVec4[3] = pickID >> 24 & 0xFF;
                math.mulVec4Scalar(tmpVec4, 1 / 255, tmpVec4);
                pickColor(tmpVec4);
            };
        },
        setupPickClipPosInputs: (getInputSetter) => {
            const pickClipPos = getInputSetter("pickClipPos");
            return (pos) => pickClipPos(pos);
        }
    };
};
