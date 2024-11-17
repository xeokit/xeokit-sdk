import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPointsColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const filterPointsIntensity = scene.pointsMaterial.filterIntensity;

        super(scene, instancing, primitive, {
            progMode: "colorMode", incrementDrawState: true,

            getHash: () => [ ],
            respectPointsMaterial: true,
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                if (filterPointsIntensity) {
                    src.push("uniform vec2 intensityRange;");
                }
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: filterPointsIntensity && "intensityRange",
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vColor = vec4(${color}.rgb / 255.0, 1.0);`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            slicedColorIfClipping: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vColor;");
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
