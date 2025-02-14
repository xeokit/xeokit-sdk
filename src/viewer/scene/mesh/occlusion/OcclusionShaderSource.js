export const OcclusionShaderSource = function(meshPickOcclusionHash, programVariables) {
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        getHash: () => [ meshPickOcclusionHash ],
        programName: "Occlusion",
        skipIfTransparent: true,
        appendFragmentOutputs: (src) => src.push(`${outColor} = vec4(0.0, 0.0, 1.0, 1.0);`)
    };
};
