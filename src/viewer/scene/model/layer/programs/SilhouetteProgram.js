import {RENDER_PASSES} from "../../RENDER_PASSES.js";
const defaultSilhouetteColor = new Float32Array([1, 1, 1, 1]);

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
                src.push(`vAlpha = ${color}.a / 255.0;`);
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
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    const setSceneMaterial = material => {
                        const fillColor = material._state.fillColor;
                        const fillAlpha = material._state.fillAlpha;
                        gl.uniform4f(silhouetteColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
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
            },

            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            })
        };
};
