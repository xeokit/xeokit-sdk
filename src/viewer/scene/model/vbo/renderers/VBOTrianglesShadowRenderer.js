import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesShadowRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, false, {
            progMode: "shadowMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform mat4 shadowProjMatrix;");
                src.push("uniform mat4 shadowViewMatrix;");
            },
            transformClipPos: clipPos => clipPos,
            shadowParameters: { projMatrix: "shadowProjMatrix", viewMatrix: "shadowViewMatrix" },
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => { },
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
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                src.push(`outColor = encodeFloat(${gl_FragCoord}.z);`);
            }
        });
    }

}
