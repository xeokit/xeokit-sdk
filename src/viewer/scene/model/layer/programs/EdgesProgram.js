export const EdgesProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, colorUniform) {
    const edgeColorUniform = colorUniform && programVariables.createUniform("vec4", "edgeColor", (set, state) => set(state.legacyFrameCtx.programColor));
    const color = geometry.attributes.color;
    const vColor = (!colorUniform) && programVariables.createVarying("vec4", "vColor", () => `vec4(${color}.rgb * 0.5, ${color}.a)`);
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: colorUniform ? "Edges" : "EdgesColor",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 2,  // EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        appendFragmentOutputs: (src) => src.push(`${outColor} = ${edgeColorUniform || vColor};`)
    };
};
