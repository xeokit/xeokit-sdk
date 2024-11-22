export const VBOOcclusionRenderer = function(logarithmicDepthBufferEnabled) {
        return {
            programName: "Occlusion",

            // Logarithmic depth buffer involves an accuracy tradeoff, sacrificing
            // accuracy at close range to improve accuracy at long range. This can
            // mess up accuracy for occlusion tests, so we'll disable for now.
            getLogDepth: false && logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE // instancing had also COLOR_TRANSPARENT
            // Only opaque objects can be occluders
            renderPassFlag: 0,
            appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); "); // Occluders are blue
            }
        };
};
