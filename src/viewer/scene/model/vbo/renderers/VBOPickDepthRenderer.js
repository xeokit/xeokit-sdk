import {VBORenderer, createPickClipTransformSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPickDepthRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const gl = scene.canvas.gl;
        const clipTransformSetup = createPickClipTransformSetup(gl, 1);

        super(scene, instancing, primitive, {
            progMode: "pickDepthMode",

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vViewPosition;");
                clipTransformSetup.appendDefinitions(src);
            },
            transformClipPos: clipTransformSetup.transformClipPos,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                if (primitive === "points") {
                    src.push("gl_PointSize += 10.0;");
                }
            },
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
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (pickZFar - pickZNear));");
                src.push("outColor = packDepth(zNormalizedDepth);"); // Must be linear depth
            },
            setupInputs: (program) => {
                const uPickZNear = program.getLocation("pickZNear");
                const uPickZFar  = program.getLocation("pickZFar");
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    gl.uniform1f(uPickZNear, frameCtx.pickZNear);
                    gl.uniform1f(uPickZFar,  frameCtx.pickZFar);
                    setClipTransformState(frameCtx);
                };
            }
        });
    }

}
