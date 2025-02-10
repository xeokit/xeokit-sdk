export const PickTriangleShaderSource = function(meshHash, geometry) {
    return {
        getHash: () => [ meshHash ],
        programName: "PickTriangle",
        isPick: true,
        trianglePick: true,
        dontBillboardAnything: true,
        appendVertexDefinitions: (src) => src.push("out vec4 vColor;"),
        appendVertexOutputs: (src) => src.push(`vColor = ${geometry.attributes.pickColor};`),
        appendFragmentDefinitions: (src) => {
            src.push("out vec4 outColor;");
            src.push("in vec4 vColor;");
        },
        appendFragmentOutputs: (src) => src.push(`outColor = vColor;`)
    };
};
