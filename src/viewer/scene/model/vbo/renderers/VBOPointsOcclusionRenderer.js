import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsOcclusionRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const pointsMaterial = scene.pointsMaterial;

        super(scene, instancing, primitive, false, {
            progMode: "occlusionMode",

            getHash: () => [ pointsMaterial.hash ],
            // Logarithmic depth buffer involves an accuracy tradeoff, sacrificing
            // accuracy at close range to improve accuracy at long range. This can
            // mess up accuracy for occlusion tests, so we'll disable for now.
            getLogDepth: false && scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            // Only opaque objects can be occluders
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                if (pointsMaterial.perspectivePoints) {
                    src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
            },
            appendFragmentDefinitions: (src) => {
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
                src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); "); // Occluders are blue
            }
        });
    }

}
