import {VBORenderer, createPickClipTransformSetup} from "../VBORenderer.js";
import { math } from "../../../math/math.js";

/**
 * @private
 */
export class VBOTrianglesPickNormalsRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, isFlat) {
        const inputs = { };
        const clipTransformSetup = createPickClipTransformSetup(scene.canvas.gl, 3);

        super(scene, instancing, primitive, {
            progMode: isFlat ? "pickNormalsFlatMode" : "pickNormalsMode",

            getHash: () => [ ],
            respectPointsMaterial: false,
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                if (! isFlat) {
                    src.push("out vec3 vWorldNormal;");
                }
                clipTransformSetup.appendDefinitions(src);
            },
            filterIntensityRange: false,
            transformClipPos: clipTransformSetup.transformClipPos,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: ! isFlat,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                if (! isFlat) {
                    src.push(`vWorldNormal = ${worldNormal}.xyz;`);
                }
            },
            appendFragmentDefinitions: (src) => {
                if (! isFlat) {
                    src.push("in vec3 vWorldNormal;");
                }
                src.push("out highp ivec4 outNormal;");
            },
            slicedColorIfClipping: false,
            needvWorldPosition: isFlat,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                const worldNormal = (isFlat
                                     ? `normalize(cross(dFdx(${vWorldPosition}.xyz), dFdy(${vWorldPosition}.xyz)))`
                                     : "vWorldNormal");
                src.push(`outNormal = ivec4(${worldNormal} * float(${math.MAX_INT}), 1.0);`);
            },
            setupInputs: program => { inputs.setClipTransformState = clipTransformSetup.setupInputs(program); },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { inputs.setClipTransformState(frameCtx); }
        });
    }

}
