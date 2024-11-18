import {VBORenderer, createPickClipTransformSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOPickMeshRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const inputs = { };
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
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
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
            slicedColorIfClipping: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outColor = vPickColor;");
            },
            setupInputs: program => { inputs.setClipTransformState = clipTransformSetup.setupInputs(program); },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { inputs.setClipTransformState(frameCtx); }
        });
    }

}
