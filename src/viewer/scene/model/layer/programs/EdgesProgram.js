export const EdgesProgram = function(scene, colorUniform) {
    const gl = scene.canvas.gl;
    return {
        programName: colorUniform ? "Edges" : "EdgesColor",
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 2,  // EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        appendVertexDefinitions: (src) => {
            if (! colorUniform) {
                src.push("out vec4 vColor;");
            }
        },
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            if (! colorUniform) {
                src.push(`vColor = vec4(${color}.rgb * 0.5, ${color}.a) / 255.0;`);
            }
        },
        appendFragmentDefinitions: (src) => {
            if (colorUniform) {
                src.push("uniform vec4 edgeColor;");
            } else {
                src.push("in vec4 vColor;");
            }
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push("outColor = " + (colorUniform ? "edgeColor" : "vColor") + ";");
        },
        setupInputs: colorUniform && ((program) => {
            const edgeColor = program.getLocation("edgeColor");
            return (frameCtx, layer) => gl.uniform4fv(edgeColor, frameCtx.programColor);
        }),

        getViewParams: (frameCtx, camera) => ({
            viewMatrix: camera.viewMatrix,
            projMatrix: camera.projMatrix,
            eye: camera.eye,
            far: camera.project.far
        })
    };
};
