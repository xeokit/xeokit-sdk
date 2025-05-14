export const PickDepthProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled) {
    const far  = programVariables.createUniform("float", "far",  (set, state) => set(state.legacyFrameCtx.viewParams.far));
    const near = programVariables.createUniform("float", "near", (set, state) => set(state.legacyFrameCtx.viewParams.near));
    const vViewPosition = programVariables.createVarying("vec3", "vViewPosition", () => `${geometry.attributes.position.view}.xyz`);
    const outPackedDepth = programVariables.createOutput("vec4", "outPackedDepth");
    const packDepth = programVariables.createFragmentDefinition(
        "packDepth",
        (name, src) => {
            src.push(`vec4 ${name}(const in float depth) {`);
            src.push("  const vec4 bitShift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);");
            src.push("  const vec4 bitMask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);");
            src.push("  vec4 res = fract(depth * bitShift);");
            src.push("  res -= res.xxyz * bitMask;");
            src.push("  return res;");
            src.push("}");
        });

    return {
        programName: "PickDepth",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        incPointSizeBy10: true,
        appendFragmentOutputs: (src) => {
            src.push(`float zNormalizedDepth = abs((${near} + ${vViewPosition}.z) / (${far} - ${near}));`);
            // isn't zNormalizedDepth the same as gl_FragDepth or gl_FragCoord.z?
            src.push(`${outPackedDepth} = ${packDepth}(zNormalizedDepth);`); // Must be linear depth
            // try: src.push("    outPackedDepth = vec4(zNormalizedDepth, fract(zNormalizedDepth * vec3(256.0, 256.0*256.0, 256.0*256.0*256.0)));");
        }
    };
};
