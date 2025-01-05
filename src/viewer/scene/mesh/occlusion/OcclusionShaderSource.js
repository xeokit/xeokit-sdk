export function OcclusionShaderSource() {
    return {
        programName: "Occlusion",
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src) => src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); ")
    };
}
