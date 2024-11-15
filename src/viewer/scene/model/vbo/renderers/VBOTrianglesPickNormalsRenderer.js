import {VBORenderer} from "../VBORenderer.js";
import { math } from "../../../math/math.js";

/**
 * @private
 */
export class VBOTrianglesPickNormalsRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        super(scene, instancing, primitive, false, {
            progMode: "pickNormalsMode",

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 pickClipPos;");
                src.push("uniform vec2 drawingBufferSize;");
                src.push("out vec3 vWorldNormal;");
            },
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - pickClipPos) * drawingBufferSize / 3.0 * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: true,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => src.push(`vWorldNormal = ${worldNormal}.xyz;`),
            appendFragmentDefinitions: (src) => {
                src.push("in vec3 vWorldNormal;");
                src.push("out highp ivec4 outNormal;");
            },
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                src.push(`outNormal = ivec4(vWorldNormal * float(${math.MAX_INT}), 1.0);`);
            }
        });
    }

}
