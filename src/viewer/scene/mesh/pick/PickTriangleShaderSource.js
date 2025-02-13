export const PickTriangleShaderSource = function(meshHash, programVariables, geometry) {
    const vColor = programVariables.createVarying("vec4", "vColor", () => geometry.attributes.pickColor);
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        getHash: () => [ meshHash ],
        programName: "PickTriangle",
        isPick: true,
        trianglePick: true,
        dontBillboardAnything: true,
        appendFragmentOutputs: (src) => src.push(`${outColor} = ${vColor};`)
    };
};
