export const FlatColorProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, lightSetup, sao) {
    const attributes = geometry.attributes;
    const vViewPosition = programVariables.createVarying("vec3", "vViewPosition", () => `${attributes.position.view}.xyz`);
    const vColor = programVariables.createVarying("vec4", "vColor", () => attributes.color);
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: "FlatColor",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao"],
        cleanerEdges: true,
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, sliceColorOr) => {
            src.push(`vec3 viewNormal = normalize(cross(dFdx(${vViewPosition}), dFdy(${vViewPosition})));`);
            const lightComponents = [
                lightSetup.getAmbientColor()
            ].concat(
                lightSetup.directionalLights.map(
                    light => `max(dot(viewNormal, ${light.getDirection(geometry.viewMatrix, vViewPosition)}), 0.0) * ${light.getColor()}`));

            src.push(`vec4 fragColor = vec4(${lightComponents.join(" + ")}, 1) * ${sliceColorOr(vColor)};`);
            src.push(`${outColor} = ${sao ? `vec4(fragColor.rgb * ${sao.getAmbient(gl_FragCoord)}, fragColor.a)` : "fragColor"};`);
        }
    };
};
