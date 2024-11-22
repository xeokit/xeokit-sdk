import {VBORenderer} from "../VBORenderer.js";
import {RENDER_PASSES} from "../../RENDER_PASSES.js";

/**
 * @private
 */
export class VBOSilhouetteRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const gl = scene.canvas.gl;
        const defaultSilhouetteColor = new Float32Array([1, 1, 1, 1]);
        const isPoints = primitive === "points";

        super(scene, instancing, primitive, {
            programName: "Silhouette",

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // silhouetteFlag = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            renderPassFlag: 1,
            appendVertexDefinitions: (src) => {
                if (isPoints) {
                    // likely something wrong here that instancing differs from batching, as the mode seems to rely on silhouetteColor instead
                    if (instancing) {
                        src.push("uniform vec4 silhouetteColor;");
                        src.push("out vec4 vColor;");
                    }
                } else if (primitive !== "lines") {
                    src.push("uniform vec4 silhouetteColor;");
                    src.push("out vec4 vColor;");
                }
            },
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                if (isPoints) {
                    if (instancing) {
                        src.push(`vColor = silhouetteColor;`);
                    }
                } else if (primitive !== "lines") {
                    src.push(`vColor = vec4(silhouetteColor.rgb, min(silhouetteColor.a, ${color}.a / 255.0));`);
                }
            },
            appendFragmentDefinitions: (src) => {
                if (isPoints) {
                    if (instancing) {
                        src.push("in vec4 vColor;");
                    } else {
                        src.push("uniform vec4 silhouetteColor;");
                    }
                } else if (primitive === "lines") {
                    src.push("uniform vec4 silhouetteColor;");
                } else {
                    src.push("in vec4 vColor;");
                }
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                if (isPoints) {
                    src.push("outColor = " + (instancing ? "vColor" : "silhouetteColor") + ";");
                } else if (primitive === "lines") {
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
        });
    }

}
