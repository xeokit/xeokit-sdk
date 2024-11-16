import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsShadowRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
        // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
        const pointsMaterial = scene.pointsMaterial._state;

        super(scene, instancing, primitive, false, {
            progMode: "shadowMode",

            getHash: () => [ pointsMaterial.hash ],
            getLogDepth: instancing && scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform float pointSize;");
                if (pointsMaterial.perspectivePoints) {
                    src.push("uniform float nearPlaneHeight;");
                }
                src.push("uniform mat4 shadowProjMatrix;");
                src.push("uniform mat4 shadowViewMatrix;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: { projMatrix: "shadowProjMatrix", viewMatrix: "shadowViewMatrix" },
            needVertexColor: false,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                if (pointsMaterial.perspectivePoints) {
                    src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                    src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                    src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                } else {
                    src.push("gl_PointSize = pointSize;");
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("vec4 encodeFloat( const in float v ) {");
                src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
                src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
                src.push("  vec4 comp = fract(v * bitShift);");
                src.push("  comp -= comp.xxyz * bitMask;");
                src.push("  return comp;");
                src.push("}");
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: true,
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
                src.push(`outColor = encodeFloat(${gl_FragCoord}.z);`);
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
