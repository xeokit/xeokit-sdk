export const SilhouetteProgram = function(geometryParameters, logarithmicDepthBufferEnabled, isPointsOrLines) {
    return {
        programName: "Silhouette",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 1,  // SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
        appendVertexDefinitions: (! isPointsOrLines) && ((src) => {
            src.push("out float vAlpha;");
        }),
        appendVertexOutputs: (! isPointsOrLines) && ((src) => src.push(`vAlpha = ${geometryParameters.attributes.color}.a;`)),
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
        setupInputs: (getUniformSetter) => {
            const silhouetteColor = getUniformSetter("silhouetteColor");
            return (frameCtx, textureSet) => silhouetteColor(frameCtx.programColor);
        }
    };
};
