export const ShadowProgram = function(logarithmicDepthBufferEnabled) {
    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
    return {
        programName: "Shadow",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,
        appendFragmentDefinitions: (src) => {
            src.push("vec4 encodeFloat( const in float v ) {");
            src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
            src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
            src.push("  vec4 comp = fract(v * bitShift);");
            src.push("  comp -= comp.xxyz * bitMask;");
            src.push("  return comp;");
            src.push("}");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push(`outColor = encodeFloat(${gl_FragCoord}.z);`);
        },

        isShadowProgram: true
    };
};
