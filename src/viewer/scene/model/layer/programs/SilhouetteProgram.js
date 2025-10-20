export const SilhouetteProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, isPointsOrLines) {
    const silhouetteColor = programVariables.createUniform("vec4", "silhouetteColor", (set, state) => set(state.legacyFrameCtx.programColor));
    const vAlpha = programVariables.createVarying("float", "vAlpha", () => `${geometry.attributes.color}.a`);
    const outColor = programVariables.createOutput("vec4", "outColor");
    return {
        programName: "Silhouette",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 1,  // SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, sliceColorOr) => {
            src.push(`${outColor} = ${isPointsOrLines
                                      ? silhouetteColor
                                      : sliceColorOr(`vec4(${silhouetteColor}.rgb, min(${silhouetteColor}.a, ${vAlpha}))`)};`);
        }
    };
};
