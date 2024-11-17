import {VBORenderer} from "../VBORenderer.js";
import { math } from "../../../math/math.js";

/**
 * @private
 */
export class VBOTrianglesPickNormalsRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, isFlat) {
        super(scene, instancing, primitive, {
            progMode: isFlat ? "pickNormalsFlatMode" : "pickNormalsMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                if (! isFlat) {
                    src.push("out vec3 vWorldNormal;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / 3.0 * ${clipPos}.w, ${clipPos}.zw)`,
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
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix, gl_PointCoord) => {
                const worldNormal = (isFlat
                                     ? `normalize(cross(dFdx(${vWorldPosition}.xyz), dFdy(${vWorldPosition}.xyz)))`
                                     : "vWorldNormal");
                src.push(`outNormal = ivec4(${worldNormal} * float(${math.MAX_INT}), 1.0);`);
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
