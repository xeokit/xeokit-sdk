import {math} from "../../../math/math.js";

export const PickNormalsProgram = function(geometryParameters, logarithmicDepthBufferEnabled, clipTransformSetup, isFlat) {
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
        appendVertexOutputs: (src) => {
            if (! isFlat) {
                src.push(`vWorldNormal = ${geometryParameters.attributes.normal.world};`);
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
        setupInputs: (getUniformSetter) => {
            const setClipTransformState = clipTransformSetup.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => setClipTransformState(frameCtx);
        }
    };
};
