import {RENDER_PASSES} from "../../RENDER_PASSES.js";

export const VBOSilhouetteRenderer = function(scene, instancing, isPointsOrLines) {
        const gl = scene.canvas.gl;
        const defaultSilhouetteColor = new Float32Array([1, 1, 1, 1]);

        return {
            programName: "Silhouette",

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // silhouetteFlag = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            renderPassFlag: 1,
            appendVertexDefinitions: (! isPointsOrLines) && ((src) => {
                src.push("uniform vec4 silhouetteColor;");
                src.push("out vec4 vColor;");
            }),
            appendVertexOutputs: (! isPointsOrLines) && ((src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vColor = vec4(silhouetteColor.rgb, min(silhouetteColor.a, ${color}.a / 255.0));`);
            }),
            appendFragmentDefinitions: (src) => {
                if (isPointsOrLines) {
                    src.push("uniform vec4 silhouetteColor;");
                } else {
                    src.push("in vec4 vColor;");
                }
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                if (isPointsOrLines) {
                    src.push("outColor = silhouetteColor;");
                } else {
                    src.push(`outColor = ${sliceColorOr("vColor")};`);
                }
            },
            setupInputs: (program) => {
                const silhouetteColor = program.getLocation("silhouetteColor");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    const setSceneMaterial = material => {
                        const color = material._state.fillColor;
                        const alpha = material._state.fillAlpha;
                        gl.uniform4f(silhouetteColor, color[0], color[1], color[2], alpha);
                    };

                    if (renderPass === RENDER_PASSES.SILHOUETTE_XRAYED) {
                        setSceneMaterial(scene.xrayMaterial);
                    } else if (renderPass === RENDER_PASSES.SILHOUETTE_HIGHLIGHTED) {
                        setSceneMaterial(scene.highlightMaterial);
                    } else if (renderPass === RENDER_PASSES.SILHOUETTE_SELECTED) {
                        setSceneMaterial(scene.selectedMaterial);
                    } else {
                        gl.uniform4fv(silhouetteColor, defaultSilhouetteColor);
                    }
                };
            }
        };
};
