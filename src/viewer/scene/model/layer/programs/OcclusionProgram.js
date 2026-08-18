export const OcclusionProgram = function(programVariables) {
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: "Occlusion",
        renderPassFlag: 0,  // COLOR_OPAQUE // Only opaque objects can be occluders
        appendFragmentOutputs: (src) => src.push(`${outColor} = vec4(0.0, 0.0, 1.0, 1.0);`) // Occluders are blue
    };
};
