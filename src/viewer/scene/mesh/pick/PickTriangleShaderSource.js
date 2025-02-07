export const PickTriangleShaderSource = function(mesh) {
    return {
        getHash: () => [ mesh._state.hash ],
        programName: "PickTriangle",
        usePickView: true,
        trianglePick: true,
        dontBillboardAnything: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexDefinitions: (src) => src.push("uniform vec2 pickClipPos;"),
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, viewMatrix, attributes) => src.push(`outColor = ${attributes.pickColor};`),
        setupPickClipPosInputs: (getInputSetter) => {
            const pickClipPos = getInputSetter("pickClipPos");
            return (pos) => pickClipPos(pos);
        }
    };
};
