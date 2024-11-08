import {DTXTrianglesTrianglesDrawable} from "./DTXTrianglesTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesPickNormalsFlatRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesTrianglesDrawable("DTXTrianglesPickNormalsFlatRenderer", scene, {
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
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
            },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / 3.0 * ${clipPos}.w, ${clipPos}.zw)`,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => { },
            appendFragmentDefinitions: (src) => src.push("out highp ivec4 outNormal;"),
            needvWorldPosition: true,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                // normalize(cross(xTangent, yTangent))
                src.push(`vec3 worldNormal = normalize(cross(dFdx(${vWorldPosition}.xyz), dFdy(${vWorldPosition}.xyz)));`);
                src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
            },
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
