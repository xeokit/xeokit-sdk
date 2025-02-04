export const PickTriangleShaderSource = function(mesh) {
    return {
        getHash: () => [ mesh._state.hash ],
        programName: "PickTriangle",
        setsFrontFace: true,
        usePickView: true,
        trianglePick: true,
        dontBillboardAnything: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec2 pickClipPos;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src, color, pickColor) => src.push(`vColor = ${pickColor};`),
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("outColor = vColor;"),
        setupPickClipPosInputs: (getInputSetter) => {
            const pickClipPos = getInputSetter("pickClipPos");
            return (pos) => pickClipPos(pos);
        }
    };
};
