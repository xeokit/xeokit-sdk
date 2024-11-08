import {DTXTrianglesTrianglesDrawable} from "./DTXTrianglesTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesPickMeshRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesTrianglesDrawable("DTXTrianglesPickMeshRenderer", scene, {
            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            }),
            // flags.w = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: "w",
            cullOnAlphaZero: false,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vPickColor;");
            },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            needVertexColor: false,
            needPickColor: true,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vPickColor = ${pickColor} / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
                src.push("out vec4 outPickColor;");
            },
            needvWorldPosition: false,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outPickColor = vPickColor;"),
            setupInputs: (program) => {
                inputs.uPickClipPos = program.getLocation("pickClipPos");
                inputs.uDrawingBufferSize = program.getLocation("drawingBufferSize");
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                gl.uniform2fv(inputs.uPickClipPos, frameCtx.pickClipPos);
                gl.uniform2f(inputs.uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
            },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
