export const DepthProgram = function(logarithmicDepthBufferEnabled) {
    return {
        programName: "Depth",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,  // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => src.push("out highp vec2 vHighPrecisionZW;"),
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => src.push(`vHighPrecisionZW = ${gl_Position}.zw;`),
        appendFragmentDefinitions: (src) => {
            src.push("in highp vec2 vHighPrecisionZW;");
            src.push("out vec4 outColor;");
        },
        // isn't it the same as vec4(vec3(1.0 - gl_FragCoord.z), 1.0) ?
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => src.push("outColor = vec4(vec3((1.0 - vHighPrecisionZW[0] / vHighPrecisionZW[1]) / 2.0), 1.0);")
    };
};
