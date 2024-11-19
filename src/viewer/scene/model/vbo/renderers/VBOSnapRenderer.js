import {VBORenderer} from "../VBORenderer.js";
import {math} from "../../../math/math.js";

const tempVec3c = math.vec3();

/**
 * @private
 */
export class VBOSnapRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, isSnapInit) {
        const gl = scene.canvas.gl;

        super(scene, instancing, primitive, {
            progMode: isSnapInit ? "snapInitMode" : "snapMode",

            getHash: () => [ ],
            respectPointsMaterial: false,
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
            filterIntensityRange: false,
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - snapVectorA) * snapInvVectorAB * ${clipPos}.w, ${clipPos}.zw)`,
            shadowParameters: null,
            needVertexColor: false,
            needPickColor: isSnapInit,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`relativeToOriginPosition = ${worldPosition};`);
                if (isSnapInit) {
                    src.push(`vPickColor = ${pickColor};`);
                }
                if ((primitive === "points") || (!isSnapInit)) {
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
            vertexCullX: (!isSnapInit) && "2.0",
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("outCoords = ivec4(relativeToOriginPosition.xyz * uCoordinateScaler.xyz, " + (isSnapInit ? "-" : "") + "uLayerNumber);");

                if (isSnapInit) {
                    src.push(`outNormal = ${(primitive === "points") ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                    src.push("outPickColor = uvec4(vPickColor);");
                }
            },
            setupInputs: (program) => {
                const uSnapVectorA      = program.getLocation("snapVectorA");
                const uSnapInvVectorAB  = program.getLocation("snapInvVectorAB");
                const uLayerNumber      = program.getLocation("uLayerNumber");
                const uCoordinateScaler = program.getLocation("uCoordinateScaler");

                return (frameCtx, layer, renderPass, rtcOrigin) => {
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

                    gl.uniform2fv(uSnapVectorA,      frameCtx.snapVectorA);
                    gl.uniform2fv(uSnapInvVectorAB,  frameCtx.snapInvVectorAB);
                    gl.uniform1i(uLayerNumber,       frameCtx.snapPickLayerNumber);
                    gl.uniform3fv(uCoordinateScaler, coordinateScaler);
                };
            }
        });
    }

}
