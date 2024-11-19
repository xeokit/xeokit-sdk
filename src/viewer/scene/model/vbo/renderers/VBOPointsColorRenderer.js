import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, {
            progMode: "colorMode", incrementDrawState: true,

            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => src.push("out vec4 vColor;"),
            filterIntensityRange: true,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vColor = vec4(${color}.rgb / 255.0, 1.0);`);
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
