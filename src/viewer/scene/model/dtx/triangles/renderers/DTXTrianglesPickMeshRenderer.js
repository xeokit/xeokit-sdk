import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesPickMeshRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesPickMeshRenderer", scene, {
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            }),
            // flags.w = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            dontCullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vPickColor;");
            },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vPickColor = ${pickColor} / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
                src.push("out vec4 outPickColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outPickColor = vPickColor;"),
            setupInputs: (program) => {
                const uPickClipPos = program.getLocation("pickClipPos");
                const uDrawingBufferSize = program.getLocation("drawingBufferSize");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    gl.uniform2fv(uPickClipPos, frameCtx.pickClipPos);
                    gl.uniform2f(uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
                };
            }
        });
    }
}
