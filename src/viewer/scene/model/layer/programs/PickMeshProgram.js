export const PickMeshProgram = function(logarithmicDepthBufferEnabled, clipTransformSetup, isPoints) {
    return {
        programName: "PickMesh",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
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
        setupInputs: (getUniformSetter) => {
            const setClipTransformState = clipTransformSetup.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => setClipTransformState(frameCtx);
        },

        dontCullOnAlphaZero: true // should be false?
    };
};
