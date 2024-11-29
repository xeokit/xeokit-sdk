export const SilhouetteProgram = function(scene, isPointsOrLines) {
    const gl = scene.canvas.gl;
    return {
        programName: "Silhouette",
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 1,  // SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
        appendVertexDefinitions: (! isPointsOrLines) && ((src) => {
            src.push("out float vAlpha;");
        }),
        appendVertexOutputs: (! isPointsOrLines) && ((src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            src.push(`vAlpha = ${color}.a;`);
        }),
        appendFragmentDefinitions: (src) => {
            if (! isPointsOrLines) {
                src.push("in float vAlpha;");
            }
            src.push("uniform vec4 silhouetteColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            if (isPointsOrLines) {
                src.push("outColor = silhouetteColor;");
            } else {
                src.push("vec4 fragColor = vec4(silhouetteColor.rgb, min(silhouetteColor.a, vAlpha));");
                src.push(`outColor = ${sliceColorOr("fragColor")};`);
            }
        },
        setupInputs: (program) => {
            const silhouetteColor = program.getLocation("silhouetteColor");
            return (frameCtx, textureSet) => gl.uniform4fv(silhouetteColor, frameCtx.programColor);
        }
    };
};
