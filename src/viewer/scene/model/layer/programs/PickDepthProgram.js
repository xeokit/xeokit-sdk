export const PickDepthProgram = function(scene, clipTransformSetup, isPoints) {
    const gl = scene.canvas.gl;
    return {
        programName: "PickDepth",
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 3,  // PICK
        appendVertexDefinitions: (src) => {
            src.push("out vec4 vViewPosition;");
            clipTransformSetup.appendDefinitions(src);
        },
        transformClipPos: clipTransformSetup.transformClipPos,
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            src.push(`vViewPosition = ${view.viewPosition};`);
            if (isPoints) {
                src.push("gl_PointSize += 10.0;");
            }
        },
        appendFragmentDefinitions: (src) => {
            src.push("uniform float pickZNear;");
            src.push("uniform float pickZFar;");
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
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push("float zNormalizedDepth = abs((pickZNear + vViewPosition.z) / (pickZFar - pickZNear));");
            src.push("outPackedDepth = packDepth(zNormalizedDepth);"); // Must be linear depth
            // try: src.push("    outPackedDepth = vec4(zNormalizedDepth, fract(zNormalizedDepth * vec3(256.0, 256.0*256.0, 256.0*256.0*256.0)));");
        },
        setupInputs: (program) => {
            const uPickZNear = program.getLocation("pickZNear");
            const uPickZFar  = program.getLocation("pickZFar");
            const setClipTransformState = clipTransformSetup.setupInputs(program);
            return (frameCtx, layer, renderPass, rtcOrigin) => {
                gl.uniform1f(uPickZNear, frameCtx.pickZNear);
                gl.uniform1f(uPickZFar,  frameCtx.pickZFar);
                setClipTransformState(frameCtx);
            };
        },

        getViewParams: (frameCtx, camera) => ({
            viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
            projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
            eye: frameCtx.pickOrigin || camera.eye,
            far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
        })
    };
};
