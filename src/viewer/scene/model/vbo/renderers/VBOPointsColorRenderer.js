import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const pointsMaterial = scene.pointsMaterial._state;

        super(scene, instancing, primitive, false, {
            progMode: "colorMode", incrementDrawState: true,

            getHash: () => [ pointsMaterial.hash ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
                if (pointsMaterial.filterIntensity) {
                    src.push("uniform vec2 intensityRange;");
                }
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: pointsMaterial.filterIntensity && "intensityRange",
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vColor = vec4(${color}.rgb / 255.0, 1.0);`);
                if (pointsMaterial.perspectivePoints) {
                    src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
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
                src.push("outColor = vColor;");
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
