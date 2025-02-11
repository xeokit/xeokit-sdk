import {math} from "../../../math/math.js";

export const SnapProgram = function(geometryParameters, isSnapInit, isPoints) {
    return {
        programName: isSnapInit ? "SnapInit" : "Snap",
        // Improves occlusion accuracy at distance
        getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        appendVertexDefinitions: (src) => {
            src.push("uniform vec2 snapVectorA;");
            src.push("uniform vec2 snapInvVectorAB;");
            if (isSnapInit) {
                src.push("flat out vec4 vPickColor;");
            }
        },
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - snapVectorA) * snapInvVectorAB * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexOutputs: isSnapInit && ((src) => src.push(`vPickColor = ${geometryParameters.attributes.pickColor};`)),
        appendFragmentDefinitions: (src) => {
            src.push("uniform int uLayerNumber;");
            src.push("uniform vec3 uCoordinateScaler;");
            if (isSnapInit) {
                src.push("flat in vec4 vPickColor;");
                src.push("layout(location = 0) out highp ivec4 outCoords;");
                src.push("layout(location = 1) out highp ivec4 outNormal;");
                src.push("layout(location = 2) out lowp uvec4 outPickColor;");
            } else {
                src.push("out highp ivec4 outCoords;");
            }
        },
        appendFragmentOutputs: (src, vWorldPosition) => {
            src.push(`outCoords = ivec4(${vWorldPosition} * uCoordinateScaler.xyz, ${isSnapInit ? "-" : ""}uLayerNumber);`);
            if (isSnapInit) {
                src.push(`outNormal = ${isPoints ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                src.push("outPickColor = uvec4(vPickColor);");
            }
        },
        setupInputs: (getUniformSetter) => {
            const uSnapVectorA      = getUniformSetter("snapVectorA");
            const uSnapInvVectorAB  = getUniformSetter("snapInvVectorAB");
            const uLayerNumber      = getUniformSetter("uLayerNumber");
            const uCoordinateScaler = getUniformSetter("uCoordinateScaler");
            return (frameCtx, textureSet) => {
                uSnapVectorA(frameCtx.snapVectorA);
                uSnapInvVectorAB(frameCtx.snapInvVectorAB);
                uLayerNumber(frameCtx.snapPickLayerNumber);
                uCoordinateScaler(frameCtx.snapPickCoordinateScale);
            };
        },

        dontCullOnAlphaZero: !isSnapInit
    };
};
