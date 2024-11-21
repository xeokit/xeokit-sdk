import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesPickDepthRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesPickDepthRenderer", scene, {
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
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vViewPosition;");
            },
            // divide by w to get into NDC, and after transformation multiply by w to get back into clip space
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vViewPosition = ${view.viewPosition};`),
            appendFragmentDefinitions: (src) => {
                src.push("uniform float pickZNear;");
                src.push("uniform float pickZFar;");
                src.push("in vec4 vViewPosition;");
                src.push("vec4 packDepth(const in float depth) {");
                src.push("  const vec4 bitShift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);");
                src.push("  const vec4 bitMask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);");
                src.push("  vec4 res = fract(depth * bitShift);");
                src.push("  res -= res.xxyz * bitMask;");
                src.push("  return res;");
                src.push("}");
                src.push("out vec4 outPackedDepth;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                src.push("    float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (pickZFar - pickZNear));");
                src.push("    outPackedDepth = packDepth(zNormalizedDepth);");  // Must be linear depth
                // TRY: src.push("    outPackedDepth = vec4(zNormalizedDepth, fract(zNormalizedDepth * vec3(256.0, 256.0*256.0, 256.0*256.0*256.0)));");
            },
            setupInputs: (program) => {
                const uPickClipPos = program.getLocation("pickClipPos");
                const uDrawingBufferSize = program.getLocation("drawingBufferSize");
                const uPickZNear = program.getLocation("pickZNear");
                const uPickZFar = program.getLocation("pickZFar");
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    gl.uniform2fv(uPickClipPos, frameCtx.pickClipPos);
                    gl.uniform2f(uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
                    gl.uniform1f(uPickZNear, frameCtx.pickZNear);
                    gl.uniform1f(uPickZFar, frameCtx.pickZFar);
                };
            }
        });
    }
}
