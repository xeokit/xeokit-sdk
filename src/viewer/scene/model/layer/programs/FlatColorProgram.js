export const FlatColorProgram = function(geometryParameters, logarithmicDepthBufferEnabled, lightSetup, sao) {
    return {
        programName: "FlatColor",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao"],
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => {
            src.push("out vec4 vViewPosition;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => {
            src.push(`vViewPosition = ${geometryParameters.attributes.position.view};`);
            src.push(`vColor = ${geometryParameters.attributes.color};`);
        },
        appendFragmentDefinitions: (src) => {
            lightSetup.appendDefinitions(src);
            sao && sao.appendDefinitions(src);
            src.push("in vec4 vViewPosition;");
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr) => {
            src.push("vec3 viewNormal = normalize(cross(dFdx(vViewPosition.xyz), dFdy(vViewPosition.xyz)));");
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            lightSetup.getDirectionalLights(geometryParameters.viewMatrix, "vViewPosition").forEach(light => {
                src.push(`reflectedColor += max(dot(-viewNormal, ${light.direction}), 0.0) * ${light.color};`);
            });

            src.push(`vec4 fragColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${sliceColorOr("vColor")};`);
            src.push("outColor = " + (sao ? ("vec4(fragColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", fragColor.a)") : "fragColor") + ";");
        },
        setupInputs: (getUniformSetter) => {
            const setLightsRenderState = lightSetup.setupInputs(getUniformSetter);
            const setSAOState = sao && sao.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => {
                setLightsRenderState(frameCtx);
                setSAOState && setSAOState(frameCtx);
            };
        }
    };
};
