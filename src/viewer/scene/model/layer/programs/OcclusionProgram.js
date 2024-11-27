export const OcclusionProgram = function(logarithmicDepthBufferEnabled) {
    return {
        programName: "Occlusion",
        // Logarithmic depth buffer involves an accuracy tradeoff, sacrificing
        // accuracy at close range to improve accuracy at long range. This can
        // mess up accuracy for occlusion tests, so we'll disable for now.
        getLogDepth: false && logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,  // COLOR_OPAQUE // Only opaque objects can be occluders
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0);"); // Occluders are blue
        }
    };
};
