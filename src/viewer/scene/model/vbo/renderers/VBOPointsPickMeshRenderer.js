import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsPickMeshRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const pointsMaterial = scene.pointsMaterial;

        super(scene, instancing, primitive, false, {
            progMode: "pickMeshMode",

            getHash: () => [ pointsMaterial.hash ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec4 vPickColor;");
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: true,
            needGl_Position: pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vPickColor = ${pickColor} / 255.0;`);
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
                src.push("in vec4 vPickColor;");
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
                src.push("outColor = vPickColor;");
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
