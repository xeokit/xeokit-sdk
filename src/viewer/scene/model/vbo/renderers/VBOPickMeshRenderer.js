export const VBOPickMeshRenderer = function(scene, clipTransformSetup, isPoints) {
        return {
            programName: "PickMesh",

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
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
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vPickColor;");
            },
            setupInputs: program => {
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => setClipTransformState(frameCtx);
            }
        };
};
