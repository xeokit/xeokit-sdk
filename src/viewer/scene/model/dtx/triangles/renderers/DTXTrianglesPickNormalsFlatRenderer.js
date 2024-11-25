import {math} from "../../../../math/math.js";

export const DTXTrianglesPickNormalsFlatRenderer = function(scene, clipTransformSetup) {
        return {
            programName: "PickNormalsFlat",
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            }),
            // flags.w = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            appendVertexDefinitions: (src) => {
                clipTransformSetup.appendDefinitions(src);
            },
            transformClipPos: clipTransformSetup.transformClipPos,
            appendFragmentDefinitions: (src) => src.push("out highp ivec4 outNormal;"),
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                // normalize(cross(xTangent, yTangent))
                src.push(`vec3 worldNormal = normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition})));`);
                src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
            },
            setupInputs: (program) => {
                const setClipTransformState = clipTransformSetup.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => setClipTransformState(frameCtx);
            }
        };
};
