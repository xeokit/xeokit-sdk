import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPickMeshRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const isPoints = primitive === "points";
        const pointsMaterial = scene.pointsMaterial;

        super(scene, instancing, primitive, {
            progMode: "pickMeshMode",

            getHash: isPoints ? (() => [ pointsMaterial.hash ]) : (() => [ ]),
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vPickColor;");
                if (isPoints) {
                    src.push("uniform float pointSize;");
                    if (pointsMaterial.perspectivePoints) {
                        src.push("uniform float nearPlaneHeight;");
                    }
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: true,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: isPoints && pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vPickColor = ${pickColor} / 255.0;`);
                if (isPoints) {
                    if (pointsMaterial.perspectivePoints) {
                        src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                        src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                        src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                    } else {
                        src.push("gl_PointSize = pointSize;");
                    }
                    src.push("gl_PointSize += 10.0;");
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
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
                src.push("outColor = vPickColor;");
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
