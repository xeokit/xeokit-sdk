import {DTXTrianglesTrianglesDrawable} from "./DTXTrianglesTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesOcclusionRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesTrianglesDrawable("DTXTrianglesOcclusionRenderer", scene, {
            getHash: () => [ ],
            // Logarithmic depth buffer involves an accuracy tradeoff, sacrificing
            // accuracy at close range to improve accuracy at long range. This can
            // mess up accuracy for occlusion tests, so we'll disable for now.
            getLogDepth: false && scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: "x",
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => { },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => clipPos,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => { },
            appendFragmentDefinitions: (src) => src.push("out vec4 outColor;"),
            needvWorldPosition: false,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0);"), // Occluders are blue
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
