export const PickTriangleShaderSource = function(meshHash, attributes) {
    return {
        getHash: () => [ meshHash ],
        programName: "PickTriangle",
        isPick: true,
        trianglePick: true,
        dontBillboardAnything: true,
        appendVertexDefinitions: (src) => src.push("out vec4 vColor;"),
        appendVertexOutputs: (src) => src.push(`vColor = ${attributes.pickColor};`),
        appendFragmentDefinitions: (src) => {
            src.push("out vec4 outColor;");
            src.push("in vec4 vColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, viewMatrix) => src.push(`outColor = vColor;`)
    };
};
