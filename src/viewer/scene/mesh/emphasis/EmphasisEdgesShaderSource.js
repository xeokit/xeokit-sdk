export function EmphasisEdgesShaderSource(mesh) {
    const gammaOutput = mesh.scene.gammaOutput;
    return {
        programName: "EmphasisEdges",
        appendVertexDefinitions: (src) => {
            src.push("uniform vec4 edgeColor;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => src.push("vColor = edgeColor;"),
        appendFragmentDefinitions: (src) => {
            if (gammaOutput) {
                src.push("uniform float gammaFactor;");
                src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                src.push("}");
            }
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src) => src.push(`outColor = ${gammaOutput ? "linearToGamma(vColor, gammaFactor)" : "vColor"};`)
    };
}
