import {math} from "../../../math/math.js";

export const PickNormalsProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, clipTransformSetup, isFlat) {
    const vWorldNormal = programVariables.createVarying("vec3", "vWorldNormal", () => geometry.attributes.normal.world);
    const outNormal = programVariables.createOutput("highp ivec4", "outNormal");
    return {
        programName: isFlat ? "PickNormalsFlat" : "PickNormals",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        transformClipPos: clipTransformSetup.transformClipPos,
        appendFragmentOutputs: (src, vWorldPosition) => {
            const worldNormal = (isFlat
                                 ? `normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition})))`
                                 : vWorldNormal);
            src.push(`${outNormal} = ivec4(${worldNormal} * float(${math.MAX_INT}), 1.0);`);
        }
    };
};
