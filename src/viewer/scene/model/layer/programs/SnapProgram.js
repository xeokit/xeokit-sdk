import {math} from "../../../math/math.js";

export const SnapProgram = function(programVariables, geometry, isSnapInit, isPoints) {
    const layerNumber      = programVariables.createUniform("int",  "layerNumber",      (set, state) => set(state.legacyFrameCtx.snapPickLayerParams.length));
    const coordinateScaler = programVariables.createUniform("vec3", "coordinateScaler", (set, state) => set(state.legacyFrameCtx.snapPickCoordinateScale));

    const vWorldPosition = programVariables.createVarying("vec3", "vWorldPosition", () => `${geometry.attributes.position.world}.xyz`);
    const vPickColor = programVariables.createVarying("vec4", "vPickColor", () => geometry.attributes.pickColor, "flat");

    const outCoords    = programVariables.createOutput("highp ivec4", "outCoords", 0);
    const outNormal    = programVariables.createOutput("highp ivec4", "outNormal", 1);
    const outPickColor = programVariables.createOutput("lowp uvec4", "outPickColor", 2);

    return {
        programName: isSnapInit ? "SnapInit" : "Snap",
        // Improves occlusion accuracy at distance
        getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
        renderPassFlag: 3,  // PICK
        vertexCullX: (!isSnapInit) && "2.0",
        dontCullOnAlphaZero: !isSnapInit,
        appendFragmentOutputs: (src) => {
            src.push(`${outCoords} = ivec4(${vWorldPosition} * ${coordinateScaler}.xyz, ${isSnapInit ? "-" : ""}${layerNumber});`);
            if (isSnapInit) {
                src.push(`${outNormal} = ${isPoints ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                src.push(`${outPickColor} = uvec4(${vPickColor});`);
            }
        }
    };
};
