export const EdgesProgram = function(geometryParameters, logarithmicDepthBufferEnabled, colorUniform) {
    return {
        programName: colorUniform ? "Edges" : "EdgesColor",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 2,  // EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        appendVertexDefinitions: (src) => {
            if (! colorUniform) {
                src.push("out vec4 vColor;");
            }
        },
        appendVertexOutputs: (src) => {
            if (! colorUniform) {
                const color = geometryParameters.attributes.color;
                src.push(`vColor = vec4(${color}.rgb * 0.5, ${color}.a);`);
            }
        },
        appendFragmentDefinitions: (src) => {
            if (colorUniform) {
                src.push("uniform vec4 edgeColor;");
            } else {
                src.push("in vec4 vColor;");
            }
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("outColor = " + (colorUniform ? "edgeColor" : "vColor") + ";"),
        setupInputs: colorUniform && ((getUniformSetter) => {
            const edgeColor = getUniformSetter("edgeColor");
            return (frameCtx, textureSet) => edgeColor(frameCtx.programColor);
        })
    };
};
