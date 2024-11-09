import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";
import {RENDER_PASSES} from "../../../RENDER_PASSES.js";

const defaultColor = new Float32Array([1, 1, 1]);

/**
 * @private
 */
export class DTXTrianglesSilhouetteRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesSilhouetteRenderer", scene, true, {
            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.y = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | | SILHOUETTE_XRAYED
            renderPassFlag: "y",
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => src.push("out float vAlpha;"),
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vAlpha = float(${color}.a) / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in float vAlpha;");
                src.push("uniform vec4 color;");
                src.push("out vec4 outColor;");
            },
            needvWorldPosition: false,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outColor = vec4(color.rgb, min(color.a, vAlpha));"),
            setupInputs: (program) => { inputs.uColor = program.getLocation("color"); },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                if (renderPass === RENDER_PASSES.SILHOUETTE_XRAYED) {
                    const material = scene.xrayMaterial._state;
                    const fillColor = material.fillColor;
                    const fillAlpha = material.fillAlpha;
                    gl.uniform4f(inputs.uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
                } else if (renderPass === RENDER_PASSES.SILHOUETTE_HIGHLIGHTED) {
                    const material = scene.highlightMaterial._state;
                    const fillColor = material.fillColor;
                    const fillAlpha = material.fillAlpha;
                    gl.uniform4f(inputs.uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
                } else if (renderPass === RENDER_PASSES.SILHOUETTE_SELECTED) {
                    const material = scene.selectedMaterial._state;
                    const fillColor = material.fillColor;
                    const fillAlpha = material.fillAlpha;
                    gl.uniform4f(inputs.uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
                } else {
                    gl.uniform4fv(inputs.uColor, defaultColor);
                }
            },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
