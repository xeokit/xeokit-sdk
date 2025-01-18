export const OcclusionShaderSource = function() {
    return {
        programName: "Occlusion",
        setsFrontFace: true,
        skipIfTransparent: true,
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src) => src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); ")
    };
};

OcclusionShaderSource.getHash = (mesh) => [
    mesh._geometry._state.hash,
    mesh._state.pickOcclusionHash
];
