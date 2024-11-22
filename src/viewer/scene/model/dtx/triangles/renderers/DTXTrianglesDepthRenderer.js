export const DTXTrianglesDepthRenderer = function(logarithmicDepthBufferEnabled) {
        return {
            programName: "Depth",
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
            appendVertexDefinitions: (src) => src.push("out highp vec2 vHighPrecisionZW;"),
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vHighPrecisionZW = ${gl_Position}.zw;`),
            appendFragmentDefinitions: (src) => {
                src.push("in highp vec2 vHighPrecisionZW;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outColor = vec4(vec3((1.0 - vHighPrecisionZW[0] / vHighPrecisionZW[1]) / 2.0), 1.0);"),
        };
};
