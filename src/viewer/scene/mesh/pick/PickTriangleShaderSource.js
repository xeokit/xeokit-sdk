export const PickTriangleShaderSource = function(meshHash) {
    return {
        getHash: () => [ meshHash ],
        programName: "PickTriangle",
        isPick: true,
        trianglePick: true,
        dontBillboardAnything: true,
        appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, viewMatrix, attributes) => src.push(`outColor = ${attributes.pickColor};`)
    };
};
