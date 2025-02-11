import {lazyShaderUniform} from "../LayerRenderer.js";

export const PickDepthProgram = function(geometryParameters, logarithmicDepthBufferEnabled, clipTransformSetup, isPoints) {
    const pickZNear = lazyShaderUniform("pickZNear", "float");
    const pickZFar  = lazyShaderUniform("pickZFar",  "float");

    return {
        programName: "PickDepth",
        getLogDepth: logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        appendVertexDefinitions: (src) => {
            src.push("out vec4 vViewPosition;");
            clipTransformSetup.appendDefinitions(src);
        },
        transformClipPos: clipTransformSetup.transformClipPos,
        appendVertexOutputs: (src) => {
            src.push(`vViewPosition = ${geometryParameters.attributes.position.view};`);
            if (isPoints) {
                src.push("gl_PointSize += 10.0;");
            }
        },
        appendFragmentDefinitions: (src) => {
            pickZNear.appendDefinitions(src);
            pickZFar.appendDefinitions(src);
            src.push("in vec4 vViewPosition;");
            src.push("vec4 packDepth(const in float depth) {");
            src.push("  const vec4 bitShift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);");
            src.push("  const vec4 bitMask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);");
            src.push("  vec4 res = fract(depth * bitShift);");
            src.push("  res -= res.xxyz * bitMask;");
            src.push("  return res;");
            src.push("}");
            src.push("out vec4 outPackedDepth;");
        },
        appendFragmentOutputs: (src) => {
            src.push(`float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (${pickZFar} - ${pickZNear}));`);
            src.push("outPackedDepth = packDepth(zNormalizedDepth);"); // Must be linear depth
            // try: src.push("    outPackedDepth = vec4(zNormalizedDepth, fract(zNormalizedDepth * vec3(256.0, 256.0*256.0, 256.0*256.0*256.0)));");
        },
        setupInputs: (getUniformSetter) => {
            const setPickZNear = pickZNear.setupInputs(getUniformSetter);
            const setPickZFar  = pickZFar.setupInputs(getUniformSetter);
            const setClipTransformState = clipTransformSetup.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => {
                setPickZNear(frameCtx.pickZNear);
                setPickZFar(frameCtx.pickZFar);
                setClipTransformState(frameCtx);
            };
        }
    };
};
