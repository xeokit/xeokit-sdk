export const ColorProgram = function(logarithmicDepthBufferEnabled, lightSetup, sao, primitive, saoTextureUnit = undefined) {
    return {
        programName: "Color",
        getHash: () => [lightSetup ? lightSetup.getHash() : "-", sao ? "sao" : "nosao"],
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => ((primitive !== "points") && (primitive !== "lines")) ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth),
        renderPassFlag: 0,  // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => {
            lightSetup && lightSetup.appendDefinitions(src);
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            const vColor = (primitive === "points") ? `vec4(${color}.rgb / 255.0, 1.0)` : `${color} / 255.0`;
            if (lightSetup) {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(view.viewMatrix, view.viewPosition).forEach(light => {
                    src.push(`reflectedColor += max(dot(-${view.viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
                });
                src.push(`vColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${vColor};`);
            } else {
                src.push(`vColor = ${vColor};`);
            }
        },
        appendFragmentDefinitions: (src) => {
            sao && sao.appendDefinitions(src);
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            if ((primitive === "points") || (primitive === "lines")) {
                src.push("outColor = vColor;");
            } else {
                src.push(`vec4 fragColor = ${sliceColorOr("vColor")};`);
                src.push("outColor = " + (sao ? ("vec4(fragColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", fragColor.a)") : "fragColor") + ";");
            }
        },
        setupInputs: (program) => {
            const setLightsRenderState = lightSetup && lightSetup.setupInputs(program);
            const setSAORenderState = sao && sao.setupInputs(program);
            return (frameCtx, textureSet) => {
                setLightsRenderState && setLightsRenderState(frameCtx);
                setSAORenderState && setSAORenderState(frameCtx, saoTextureUnit);
            };
        },

        filterIntensityRange: true,
        incrementDrawState: true,

        getViewParams: (frameCtx, camera) => ({
            viewMatrix: camera.viewMatrix,
            projMatrix: camera.projMatrix,
            eye: camera.eye,
            far: camera.project.far
        })
    };
};
