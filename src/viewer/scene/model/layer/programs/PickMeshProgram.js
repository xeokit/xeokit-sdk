export const PickMeshProgram = function(scene, clipTransformSetup, isPoints) {
        const gl = scene.canvas.gl;
        return {
            programName: "PickMesh",
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            renderPassFlag: 3,  // PICK
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vPickColor;");
                clipTransformSetup.appendDefinitions(src);
            },
            transformClipPos: clipTransformSetup.transformClipPos,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vPickColor = ${pickColor} / 255.0;`);
                if (isPoints) {
                    src.push("gl_PointSize += 10.0;");
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
                src.push("out vec4 outPickColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outPickColor = vPickColor;");
            },
            setupInputs: (program) => {
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => setClipTransformState(frameCtx);
            },

            dontCullOnAlphaZero: true, // should be false?
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            })
        };
};
