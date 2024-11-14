import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesDepthRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, false, {
            progMode: "depthMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => src.push("out vec2 vHighPrecisionZW;"),
            transformClipPos: clipPos => clipPos,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: true,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => {
                src.push(`vHighPrecisionZW = ${gl_Position}.zw;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec2 vHighPrecisionZW;");
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                src.push("outColor = vec4(vec3((1.0 - vHighPrecisionZW[0] / vHighPrecisionZW[1]) / 2.0), 1.0);");
            }
        });
    }

}
