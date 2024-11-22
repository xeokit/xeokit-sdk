import {VBORenderer} from "../VBORenderer.js";
import {RENDER_PASSES} from "../../RENDER_PASSES.js";

/**
 * @private
 */
export class VBOTrianglesEdgesRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, colorUniform) {
        const gl = scene.canvas.gl;
        const edgesDefaultColor = new Float32Array([0, 0, 0, 1]);

        super(scene, instancing, primitive, {
            programName: "Edges",
            edges: true,

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // edgeFlag = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            renderPassFlag: 2,
            appendVertexDefinitions: (src) => {
                if (colorUniform) {
                    src.push("uniform vec4 edgeColor;");
                }
                src.push("out vec4 vColor;");
            },
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push("vColor = " + (colorUniform ? "edgeColor" : `vec4(${color}.rgb * 0.5, ${color}.a) / 255.0`) + ";");
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vColor;");
            },
            setupInputs: (program) => {
                const edgeColor = colorUniform && program.getLocation("edgeColor");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    if (colorUniform) {
                        const setSceneMaterial = material => {
                            const color = material._state.edgeColor;
                            const alpha = material._state.edgeAlpha;
                            gl.uniform4f(edgeColor, color[0], color[1], color[2], alpha);
                        };

                        if (renderPass === RENDER_PASSES.EDGES_XRAYED) {
                            setSceneMaterial(scene.xrayMaterial);
                        } else if (renderPass === RENDER_PASSES.EDGES_HIGHLIGHTED) {
                            setSceneMaterial(scene.highlightMaterial);
                        } else if (renderPass === RENDER_PASSES.EDGES_SELECTED) {
                            setSceneMaterial(scene.selectedMaterial);
                        } else {
                            gl.uniform4fv(edgeColor, edgesDefaultColor);
                        }
                    }
                };
            }
        });
    }

}
