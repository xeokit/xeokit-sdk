import {RENDER_PASSES} from "../../../RENDER_PASSES.js";
const defaultColor = new Float32Array([1, 1, 1]);

export const DTXTrianglesSilhouetteRenderer = function(scene) {
        const gl = scene.canvas.gl;
        return {
            programName: "Silhouette",
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.y = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | | SILHOUETTE_XRAYED
            renderPassFlag: 1,
            appendVertexDefinitions: (src) => src.push("out float vAlpha;"),
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vAlpha = float(${color}.a) / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in float vAlpha;");
                src.push("uniform vec4 color;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outColor = vec4(color.rgb, min(color.a, vAlpha));"),
            setupInputs: (program) => {
                const uColor = program.getLocation("color");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    const setSceneMaterial = material => {
                        const fillColor = material._state.fillColor;
                        const fillAlpha = material._state.fillAlpha;
                        gl.uniform4f(uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
                    };

                    if (renderPass === RENDER_PASSES.SILHOUETTE_XRAYED) {
                        setSceneMaterial(scene.xrayMaterial);
                    } else if (renderPass === RENDER_PASSES.SILHOUETTE_HIGHLIGHTED) {
                        setSceneMaterial(scene.highlightMaterial);
                    } else if (renderPass === RENDER_PASSES.SILHOUETTE_SELECTED) {
                        setSceneMaterial(scene.selectedMaterial);
                    } else {
                        gl.uniform4fv(uColor, defaultColor);
                    }
                };
            }
        };
};
