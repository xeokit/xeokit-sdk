import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsPickDepthRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const pointsMaterial = scene.pointsMaterial;

        super(scene, instancing, primitive, false, {
            progMode: "pickDepthMode",

            getHash: () => [ pointsMaterial.hash ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vViewPosition;");
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: pointsMaterial.perspectivePoints,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                if (pointsMaterial.perspectivePoints) {
                    src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
                src.push("gl_PointSize += 10.0;");
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
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            needGl_PointCoord: pointsMaterial.roundPoints,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                if (pointsMaterial.roundPoints) {
                    src.push(`  vec2 cxy = 2.0 * ${gl_PointCoord} - 1.0;`);
                    src.push("  float r = dot(cxy, cxy);");
                    src.push("  if (r > 1.0) {");
                    src.push("       discard;");
                    src.push("  }");
                }
                src.push("float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (pickZFar - pickZNear));");
                src.push("outColor = packDepth(zNormalizedDepth);"); // Must be linear depth
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
