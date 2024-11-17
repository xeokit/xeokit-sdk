import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOOcclusionRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const isPoints = primitive === "points";
        const pointsMaterial = scene.pointsMaterial;

        super(scene, instancing, primitive, {
            progMode: "occlusionMode",

            getHash: isPoints ? (() => [ pointsMaterial.hash ]) : (() => [ ]),
            // Logarithmic depth buffer involves an accuracy tradeoff, sacrificing
            // accuracy at close range to improve accuracy at long range. This can
            // mess up accuracy for occlusion tests, so we'll disable for now.
            getLogDepth: false && scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE // instancing had also COLOR_TRANSPARENT
            // Only opaque objects can be occluders
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                if (isPoints) {
                    src.push("uniform float pointSize;");
                    if (pointsMaterial.perspectivePoints) {
                        src.push("uniform float nearPlaneHeight;");
                    }
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: isPoints && pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                if (isPoints) {
                    if (pointsMaterial.perspectivePoints) {
                        src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                        src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                        src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                    } else {
                        src.push("gl_PointSize = pointSize;");
                    }
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("out vec4 outColor;");
            },
            slicedColorIfClipping: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            needGl_PointCoord: isPoints && pointsMaterial.roundPoints,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix, gl_PointCoord) => {
                if (isPoints && pointsMaterial.roundPoints) {
                    src.push(`  vec2 cxy = 2.0 * ${gl_PointCoord} - 1.0;`);
                    src.push("  float r = dot(cxy, cxy);");
                    src.push("  if (r > 1.0) {");
                    src.push("       discard;");
                    src.push("  }");
                }
                src.push("outColor = vec4(0.0, 0.0, 1.0, 1.0); "); // Occluders are blue
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
