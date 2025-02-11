import {lazyShaderUniform} from "../LayerRenderer.js";

export const EdgesProgram = function(geometryParameters, logarithmicDepthBufferEnabled, colorUniform) {
    const edgeColorUniform = colorUniform && lazyShaderUniform("edgeColor", "vec4");
    return {
        programName: colorUniform ? "Edges" : "EdgesColor",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 2,  // EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        appendVertexDefinitions: (src) => {
            if (! edgeColorUniform) {
                src.push("out vec4 vColor;");
            }
        },
        appendVertexOutputs: (src) => {
            if (! edgeColorUniform) {
                const color = geometryParameters.attributes.color;
                src.push(`vColor = vec4(${color}.rgb * 0.5, ${color}.a);`);
            }
        },
        appendFragmentDefinitions: (src) => {
            if (edgeColorUniform) {
                edgeColorUniform.appendDefinitions(src);
            } else {
                src.push("in vec4 vColor;");
            }
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("outColor = " + (edgeColorUniform || "vColor") + ";"),
        setupInputs: edgeColorUniform && ((getUniformSetter) => {
            const setEdgeColor = edgeColorUniform.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => setEdgeColor(frameCtx.programColor);
        })
    };
};
