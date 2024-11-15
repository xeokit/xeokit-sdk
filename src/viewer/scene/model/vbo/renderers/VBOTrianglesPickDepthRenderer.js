import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesPickDepthRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, false, {
            progMode: "pickDepthMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vViewPosition;");
            },
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => src.push(`vViewPosition = ${view.viewPosition};`),
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
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                src.push("float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (pickZFar - pickZNear));");
                src.push("outColor = packDepth(zNormalizedDepth);"); // Must be linear depth
            }
        });
    }

}
