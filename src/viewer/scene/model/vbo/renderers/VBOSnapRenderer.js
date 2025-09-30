import {VBORenderer} from "../VBORenderer.js";
import {math} from "../../../math/math.js";

const tempVec3c = math.vec3();

/**
 * @private
 */
export class VBOSnapRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, isSnapInit) {
        const inputs = { };
        const gl = scene.canvas.gl;

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
                if ((primitive === "points") && (! instancing) && isSnapInit) {
                    src.push("uniform float pointSize;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - snapVectorA) * snapInvVectorAB * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: isSnapInit,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: true,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`relativeToOriginPosition = ${worldPosition}.xyz;`);
                if (isSnapInit) {
                    src.push(`vPickColor = ${pickColor};`);
                }
                if (primitive === "points") {
                    src.push("gl_PointSize = " + (((! instancing) && isSnapInit) ? "pointSize" : "1.0") + ";"); // Windows needs this?
                } else if (!isSnapInit) {
                    src.push("gl_PointSize = 1.0;"); // Windows needs this?
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("uniform int uLayerNumber;");
                src.push("uniform vec3 uCoordinateScaler;");
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
            needvWorldPosition: (primitive !== "points") && isSnapInit,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            vertexCullX: (!isSnapInit) && "2.0",
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                src.push("outCoords = ivec4(relativeToOriginPosition.xyz * uCoordinateScaler.xyz, " + (isSnapInit ? "-" : "") + "uLayerNumber);");

                if (isSnapInit) {
                    if (primitive === "points") {
                        src.push(`outNormal = ivec4(1.0, 1.0, 1.0, 1.0);`);
                    } else {
                        src.push(`vec3 xTangent = dFdx(${vWorldPosition}.xyz);`);
                        src.push(`vec3 yTangent = dFdy(${vWorldPosition}.xyz);`);
                        src.push("vec3 worldNormal = normalize(cross(xTangent, yTangent));");
                        src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
                    }
                    src.push("outPickColor = uvec4(vPickColor);");
                }
            },
            setupInputs: (program) => {
                inputs.uSnapVectorA = program.getLocation("snapVectorA");
                inputs.uSnapInvVectorAB = program.getLocation("snapInvVectorAB");
                inputs.uLayerNumber = program.getLocation("uLayerNumber");
                inputs.uCoordinateScaler = program.getLocation("uCoordinateScaler");
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                const aabb = layer.aabb; // Per-layer AABB for best RTC accuracy
                const coordinateScaler = tempVec3c;
                coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
                coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
                coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;
                frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
                frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
                frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
                gl.uniform2fv(inputs.uSnapVectorA, frameCtx.snapVectorA);
                gl.uniform2fv(inputs.uSnapInvVectorAB, frameCtx.snapInvVectorAB);
                gl.uniform1i(inputs.uLayerNumber, frameCtx.snapPickLayerNumber);
                gl.uniform3fv(inputs.uCoordinateScaler, coordinateScaler);
            }
        });
    }

}
