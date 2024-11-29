import {math} from "../../../math/math.js";

export const SnapProgram = function(gl, isSnapInit, isPoints) {
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
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            if (isSnapInit) {
                src.push(`vPickColor = ${pickColor};`);
            }
        },
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
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push(`outCoords = ivec4(${vWorldPosition} * uCoordinateScaler.xyz, ${isSnapInit ? "-" : ""}uLayerNumber);`);
            if (isSnapInit) {
                src.push(`outNormal = ${isPoints ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                src.push("outPickColor = uvec4(vPickColor);");
            }
        },
        setupInputs: (program) => {
            const uSnapVectorA      = program.getLocation("snapVectorA");
            const uSnapInvVectorAB  = program.getLocation("snapInvVectorAB");
            const uLayerNumber      = program.getLocation("uLayerNumber");
            const uCoordinateScaler = program.getLocation("uCoordinateScaler");
            return (frameCtx, textureSet) => {
                gl.uniform2fv(uSnapVectorA,      frameCtx.snapVectorA);
                gl.uniform2fv(uSnapInvVectorAB,  frameCtx.snapInvVectorAB);
                gl.uniform1i(uLayerNumber,       frameCtx.snapPickLayerNumber);
                gl.uniform3fv(uCoordinateScaler, frameCtx.snapPickCoordinateScale);
            };
        },

        dontCullOnAlphaZero: !isSnapInit
    };
};
