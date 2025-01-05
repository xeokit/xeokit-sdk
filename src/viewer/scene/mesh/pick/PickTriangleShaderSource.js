export const PickTriangleShaderSource = function(mesh) {
    return {
        programName: "PickTriangle",
        dontBillboardAnything: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexDefinitions: (src) => {
            src.push("in vec4 color;");
            src.push("uniform vec2 pickClipPos;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => src.push("vColor = color;"),
        appendFragmentDefinitions: (src) => {
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("   outColor = vColor;")
    };
};
