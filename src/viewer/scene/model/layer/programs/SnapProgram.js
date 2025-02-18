import {math} from "../../../math/math.js";

export const SnapProgram = function(programVariables, geometry, isSnapInit, isPoints) {
    const snapVectorA      = programVariables.createUniform("vec2", "snapVectorA",      (set, state) => set(state.legacyFrameCtx.snapVectorA));
    const snapInvVectorAB  = programVariables.createUniform("vec2", "snapInvVectorAB",  (set, state) => set(state.legacyFrameCtx.snapInvVectorAB));
    const layerNumber      = programVariables.createUniform("int",  "layerNumber",      (set, state) => set(state.legacyFrameCtx.snapPickLayerNumber));
    const coordinateScaler = programVariables.createUniform("vec3", "coordinateScaler", (set, state) => set(state.legacyFrameCtx.snapPickCoordinateScale));

    const vPickColor = programVariables.createVarying("vec4", "vPickColor", () => geometry.attributes.pickColor, "flat");

    const outCoords    = programVariables.createOutput("highp ivec4", "outCoords", 0);
    const outNormal    = programVariables.createOutput("highp ivec4", "outNormal", 1);
    const outPickColor = programVariables.createOutput("lowp uvec4", "outPickColor", 2);

    return {
        programName: isSnapInit ? "SnapInit" : "Snap",
        // Improves occlusion accuracy at distance
        getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - ${snapVectorA}) * ${snapInvVectorAB} * ${clipPos}.w, ${clipPos}.zw)`,
        dontCullOnAlphaZero: !isSnapInit,
        appendFragmentOutputs: (src, vWorldPosition) => {
            src.push(`${outCoords} = ivec4(${vWorldPosition} * ${coordinateScaler}.xyz, ${isSnapInit ? "-" : ""}${layerNumber});`);
            if (isSnapInit) {
                src.push(`${outNormal} = ${isPoints ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                src.push(`${outPickColor} = uvec4(${vPickColor});`);
            }
        }
    };
};
