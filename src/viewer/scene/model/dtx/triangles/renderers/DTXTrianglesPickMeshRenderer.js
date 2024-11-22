export const DTXTrianglesPickMeshRenderer = function(scene, clipTransformSetup) {
        const gl = scene.canvas.gl;
        return {
            programName: "PickMesh",
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            }),
            // flags.w = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            dontCullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vPickColor;");
                clipTransformSetup.appendDefinitions(src);
            },
            transformClipPos: clipTransformSetup.transformClipPos,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vPickColor = ${pickColor} / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
                src.push("out vec4 outPickColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outPickColor = vPickColor;"),
            setupInputs: (program) => {
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    setClipTransformState(frameCtx);
                };
            }
        };
};
