export const ShadowProgram = function(scene) {
    // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
    // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
    const gl = scene.canvas.gl;
    return {
        programName: "Shadow",
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,
        appendVertexDefinitions: (src) => {
            src.push("uniform mat4 shadowProjMatrix;");
            src.push("uniform mat4 shadowViewMatrix;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => { },
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
        setupInputs: (program) => {
            const uShadowProjMatrix = program.getLocation("shadowProjMatrix");
            const uShadowViewMatrix = program.getLocation("shadowViewMatrix");
            return (frameCtx, layer, rtcOrigin) => {
                gl.uniformMatrix4fv(uShadowProjMatrix, false, frameCtx.shadowProjMatrix); // Not tested
                gl.uniformMatrix4fv(uShadowViewMatrix, false, frameCtx.shadowViewMatrix); // Not tested
            };
        },

        shadowParameters: { projMatrix: "shadowProjMatrix", viewMatrix: "shadowViewMatrix" }
    };
};
