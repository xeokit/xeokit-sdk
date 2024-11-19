import {VBORenderer, createPickClipTransformSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPickMeshRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const clipTransformSetup = createPickClipTransformSetup(scene.canvas.gl, 1);

        super(scene, instancing, primitive, {
            progMode: "pickMeshMode",

            getHash: () => [ ],
            respectPointsMaterial: true,
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vPickColor;");
                clipTransformSetup.appendDefinitions(src);
            },
            filterIntensityRange: false,
            transformClipPos: clipTransformSetup.transformClipPos,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: true,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vPickColor = ${pickColor} / 255.0;`);
                if (primitive === "points") {
                    src.push("gl_PointSize += 10.0;");
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vPickColor;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vPickColor;");
            },
            setupInputs: program => {
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => setClipTransformState(frameCtx);
            }
        });
    }

}
