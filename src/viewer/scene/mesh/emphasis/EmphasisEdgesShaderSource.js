import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export const EmphasisEdgesShaderSource = function(mesh) {
    return {
        getHash: () => [
            mesh._state.hash,
            mesh.scene.gammaOutput ? "go" : "" // Gamma input not needed
        ],
        programName: "EmphasisEdges",
        setsEdgeWidth: true,
        useGammaOutput: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 edgeColor;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => src.push("vColor = edgeColor;"),
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("vColor") : "vColor"};`),
        setupMaterialInputs: (getInputSetter) => {
            const edgeColor = getInputSetter("edgeColor");
            return (mtl) => {
                tmpVec4.set(mtl.edgeColor);
                tmpVec4[3] = mtl.edgeAlpha;
                edgeColor(tmpVec4);
            };
        }
    };
};
