export const DTXTrianglesColorRenderer = function(logarithmicDepthBufferEnabled, lightSetup, sao) {
        return {
            programName: "Color",
            getHash: () => [lightSetup.getHash(), (sao ? "sao" : "nosao")],
            getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                lightSetup.appendDefinitions(src);
                src.push("out vec4 vColor;");
            },
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(view.viewMatrix, view.viewPosition).forEach(light => {
                    src.push(`reflectedColor += max(dot(-${view.viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
                });
                src.push(`vColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${color} / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                sao && sao.appendDefinitions(src);
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = " + (sao ? ("vec4(vColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", vColor.a)") : "vColor") + ";");
            },
            setupInputs: (program) => {
                const setLightsRenderState = lightSetup.setupInputs(program);
                const setSAORenderState    = sao && sao.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    setLightsRenderState(frameCtx);
                    setSAORenderState && setSAORenderState(frameCtx, 10);
                };
            }
        };
};
