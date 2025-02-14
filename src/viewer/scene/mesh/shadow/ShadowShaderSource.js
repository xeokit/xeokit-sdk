export const ShadowShaderSource = function(meshHash, programVariables) {
    const encodeFloat = programVariables.createFragmentDefinition(
        "encodeFloat",
        (name, src) => {
            src.push(`vec4 ${name}( const in float depth ) {`);
            src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
            src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
            src.push("  vec4 comp = fract(depth * bitShift);");
            src.push("  comp -= comp.xxyz * bitMask;");
            src.push("  return comp;");
            src.push("}");
        });
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        getHash: () => [ meshHash ],
        programName: "Shadow",
        setsLineWidth: true,
        useShadowView: true,
        dontBillboardAnything: true,
        dontGetLogDepth: true,
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord) => src.push(`${outColor} = ${encodeFloat}(${gl_FragCoord}.z);`)
    };
};
