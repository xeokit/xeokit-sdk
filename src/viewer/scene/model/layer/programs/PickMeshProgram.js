export const PickMeshProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled) {
    const vPickColor = programVariables.createVarying("vec4", "vPickColor", () => `${geometry.attributes.pickColor} / 255.0`);
    const outPickColor = programVariables.createOutput("vec4", "outPickColor");
    return {
        programName: "PickMesh",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        incPointSizeBy10: true,
        dontCullOnAlphaZero: true, // should be false?
        appendFragmentOutputs: (src) => src.push(`${outPickColor} = ${vPickColor};`)
    };
};
