import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesPickNormalsFlatRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesPickNormalsFlatRenderer", scene, true, {
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
            renderPassFlag: 3,
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
            },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / 3.0 * ${clipPos}.w, ${clipPos}.zw)`,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => { },
            appendFragmentDefinitions: (src) => src.push("out highp ivec4 outNormal;"),
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                // normalize(cross(xTangent, yTangent))
                src.push(`vec3 worldNormal = normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition})));`);
                src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
            },
            setupInputs: (program) => {
                const uPickClipPos = program.getLocation("pickClipPos");
                const uDrawingBufferSize = program.getLocation("drawingBufferSize");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    gl.uniform2fv(uPickClipPos, frameCtx.pickClipPos);
                    gl.uniform2f(uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
                };
            },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
