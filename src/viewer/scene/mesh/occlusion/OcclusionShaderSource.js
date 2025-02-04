export const OcclusionShaderSource = function(mesh) {
    return {
        getHash: () => [ mesh._state.pickOcclusionHash ],
        programName: "Occlusion",
        setsFrontFace: true,
        skipIfTransparent: true,
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src) => src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); ")
    };
};
