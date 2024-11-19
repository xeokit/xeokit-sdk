import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesDepthRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, {
            progMode: "depthMode",

            getHash: () => [ ],
            respectPointsMaterial: false,
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => src.push("out vec2 vHighPrecisionZW;"),
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: true,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vHighPrecisionZW = ${gl_Position}.zw;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec2 vHighPrecisionZW;");
                src.push("out vec4 outColor;");
            },
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vec4(vec3((1.0 - vHighPrecisionZW[0] / vHighPrecisionZW[1]) / 2.0), 1.0);");
            }
        });
    }

}
