export const PickMeshShaderSource = function(mesh) {
    return {
        programName: "PickMesh",
        dontBillboardAnything: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexDefinitions: (src) => src.push("uniform vec2 pickClipPos;"),
        appendFragmentDefinitions: (src) => {
            src.push("uniform vec4 pickColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push("outColor = pickColor;")
    };
};
