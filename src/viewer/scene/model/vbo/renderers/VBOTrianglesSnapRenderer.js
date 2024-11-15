import {VBORenderer} from "../VBORenderer.js";
import {math} from "../../../math/math.js";

/**
 * @private
 */
export class VBOTrianglesSnapRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, isSnapInit) {
        super(scene, instancing, primitive, false, {
            progMode: isSnapInit ? "snapInitMode" : "snapMode",

            getHash: () => [ ],
            // Improves occlusion accuracy at distance
            getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
            clippingCaps: false,
            // pickFlag = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 snapVectorA;");
                src.push("uniform vec2 snapInvVectorAB;");
                src.push("out highp vec3 relativeToOriginPosition;");
                if (isSnapInit) {
                    src.push("flat out vec4 vPickColor;");
                }
            },
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - snapVectorA) * snapInvVectorAB * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: isSnapInit,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => {
                src.push("relativeToOriginPosition = worldPosition.xyz;");
                if (isSnapInit) {
                    src.push(`vPickColor = ${pickColor};`);
                } else {
                    src.push("gl_PointSize = 1.0;"); // Windows needs this?
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("uniform int layerNumber;");
                src.push("uniform vec3 coordinateScaler;");
                src.push("in highp vec3 relativeToOriginPosition;");
                if (isSnapInit) {
                    src.push("flat in vec4 vPickColor;");
                    src.push("layout(location = 0) out highp ivec4 outCoords;");
                    src.push("layout(location = 1) out highp ivec4 outNormal;");
                    src.push("layout(location = 2) out lowp uvec4 outPickColor;");
                } else {
                    src.push("out highp ivec4 outCoords;");
                }
            },
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: isSnapInit,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                src.push("outCoords = ivec4(relativeToOriginPosition.xyz * coordinateScaler.xyz, " + (isSnapInit ? "-" : "") + "layerNumber);");

                if (isSnapInit) {
                    src.push(`vec3 xTangent = dFdx(${vWorldPosition}.xyz);`);
                    src.push(`vec3 yTangent = dFdy(${vWorldPosition}.xyz);`);
                    src.push("vec3 worldNormal = normalize(cross(xTangent, yTangent));");
                    src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
                    src.push("outPickColor = uvec4(vPickColor);");
                }
            }
        });
    }

}
