import {math} from "../../../math/math.js";

export const PickNormalsProgram = function(logarithmicDepthBufferEnabled, clipTransformSetup, isFlat) {
    return {
        programName: isFlat ? "PickNormalsFlat" : "PickNormals",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        appendVertexDefinitions: (src) => {
            if (! isFlat) {
                src.push("out vec3 vWorldNormal;");
            }
            clipTransformSetup.appendDefinitions(src);
        },
        transformClipPos: clipTransformSetup.transformClipPos,
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            if (! isFlat) {
                src.push(`vWorldNormal = ${worldNormal};`);
            }
        },
        appendFragmentDefinitions: (src) => {
            if (! isFlat) {
                src.push("in vec3 vWorldNormal;");
            }
            src.push("out highp ivec4 outNormal;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            const worldNormal = (isFlat
                                 ? `normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition})))`
                                 : "vWorldNormal");
            src.push(`outNormal = ivec4(${worldNormal} * float(${math.MAX_INT}), 1.0);`);
        },
        setupInputs: (program) => {
            const setClipTransformState = clipTransformSetup.setupInputs(program);
            return (frameCtx, textureSet) => setClipTransformState(frameCtx);
        }
    };
};
