export const ColorProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, lightSetup, sao, primitive) {
    const vColor = programVariables.createVarying("vec4", "vColor", () => {
        const attributes = geometry.attributes;
        const color = (primitive === "points") ? `vec4(${attributes.color}.rgb, 1.0)` : `${attributes.color}`;
        if (lightSetup) {
            const lightComponents = [
                lightSetup.getAmbientColor()
            ].concat(
                lightSetup.directionalLights.map(
                    light => `max(dot(${attributes.normal.view}, ${light.getDirection(geometry.viewMatrix, attributes.position.view)}), 0.0) * ${light.getColor()}`));
            return `vec4(${lightComponents.join(" + ")}, 1) * ${color}`;
        } else {
            return color;
        }
    });
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: "Color",
        getHash: () => [lightSetup ? lightSetup.getHash() : "-", sao ? "sao" : "nosao"],
        cleanerEdges: true,
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => ((primitive !== "points") && (primitive !== "lines")) ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth),
        renderPassFlag: 0,  // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, sliceColorOr) => {
            if ((primitive === "points") || (primitive === "lines")) {
                src.push(`${outColor} = ${vColor};`);
            } else {
                src.push(`vec4 fragColor = ${sliceColorOr(vColor)};`);
                src.push(`${outColor} = ${(sao ? (`vec4(fragColor.rgb * ${sao.getAmbient(gl_FragCoord)}, fragColor.a)`) : "fragColor")};`);
            }
        },

        filterIntensityRange: true,
        incrementDrawState: true
    };
};
