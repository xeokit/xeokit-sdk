import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOLinesColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, {
            progMode: "colorMode", incrementDrawState: true,

            getHash: () => [ ],
            respectPointsMaterial: false,
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vColor = ${color} / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vColor;");
            }
        });
    }

}
