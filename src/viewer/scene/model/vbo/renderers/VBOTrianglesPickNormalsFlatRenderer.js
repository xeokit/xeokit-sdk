import {VBORenderer} from "../VBORenderer.js";
import { math } from "../../../math/math.js";

/**
 * @private
 */
export class VBOTrianglesPickNormalsFlatRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, false, {
            progMode: "pickNormalsFlatMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
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
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => { },
            appendFragmentDefinitions: (src) => src.push("out highp ivec4 outNormal;"),
            slicedColorIfClipping: false,
            needvWorldPosition: true,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix, gl_PointCoord) => {
                src.push(`vec3 xTangent = dFdx(${vWorldPosition}.xyz);`);
                src.push(`vec3 yTangent = dFdy(${vWorldPosition}.xyz);`);
                src.push("vec3 worldNormal = normalize(cross(xTangent, yTangent));");
                src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
