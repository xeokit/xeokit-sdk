import {createGammaOutputSetup} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tmpVec4 = math.vec4();

export function EmphasisEdgesShaderSource(mesh) {
    const scene = mesh.scene;
    const gammaOutputSetup = createGammaOutputSetup(scene);

    return {
        programName: "EmphasisEdges",
        setsEdgeWidth: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 edgeColor;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => src.push("vColor = edgeColor;"),
        appendFragmentDefinitions: (src) => {
            gammaOutputSetup && gammaOutputSetup.appendDefinitions(src);
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push(`outColor = ${gammaOutputSetup ? gammaOutputSetup.getValueExpression("vColor") : "vColor"};`),
        setupInputs: gammaOutputSetup && gammaOutputSetup.setupInputs,
        setupMaterialInputs: (getInputSetter) => {
            const edgeColor = getInputSetter("edgeColor");
            return (mtl) => {
                tmpVec4.set(mtl.edgeColor);
                tmpVec4[3] = mtl.edgeAlpha;
                edgeColor(tmpVec4);
            };
        }
    };
}
