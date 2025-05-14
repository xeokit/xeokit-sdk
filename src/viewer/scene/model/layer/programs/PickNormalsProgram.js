import {math} from "../../../math/math.js";

export const PickNormalsProgram = function(programVariables, geometry, logarithmicDepthBufferEnabled, isFlat) {
    const vWorldPosition = programVariables.createVarying("vec3", "vWorldPosition", () => `${geometry.attributes.position.world}.xyz`);
    const vWorldNormal = programVariables.createVarying("vec3", "vWorldNormal", () => geometry.attributes.normal.world);
    const outNormal = programVariables.createOutput("highp ivec4", "outNormal");
    return {
        programName: isFlat ? "PickNormalsFlat" : "PickNormals",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        appendFragmentOutputs: (src) => {
            const worldNormal = (isFlat
                                 ? `normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition})))`
                                 : vWorldNormal);
            src.push(`${outNormal} = ivec4(${worldNormal} * float(${math.MAX_INT}), 1.0);`);
        }
    };
};
