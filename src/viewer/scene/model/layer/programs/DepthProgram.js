export const DepthProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled) {
    const vHighPrecisionZW = programVariables.createVarying("highp vec2", "vHighPrecisionZW", () => `${geometry.attributes.position.clip}.zw`);
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: "Depth",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,  // COLOR_OPAQUE | COLOR_TRANSPARENT
        // isn't it the same as vec4(vec3(1.0 - gl_FragCoord.z), 1.0) ?
        appendFragmentOutputs: (src) => src.push(`${outColor} = vec4(vec3((1.0 - ${vHighPrecisionZW}[0] / ${vHighPrecisionZW}[1]) / 2.0), 1.0);`)
    };
};
