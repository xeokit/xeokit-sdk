import {math} from "../../../math/math.js";
import {lazyShaderUniform} from "../LayerRenderer.js";

export const SnapProgram = function(geometryParameters, isSnapInit, isPoints) {
    const snapVectorA      = lazyShaderUniform("snapVectorA",     "vec2");
    const snapInvVectorAB  = lazyShaderUniform("snapInvVectorAB", "vec2");
    const layerNumber      = lazyShaderUniform("layerNumber",      "int");
    const coordinateScaler = lazyShaderUniform("coordinateScaler", "vec3");

    return {
        programName: isSnapInit ? "SnapInit" : "Snap",
        // Improves occlusion accuracy at distance
        getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
        renderPassFlag: 3,  // PICK
        usePickParams: true,
        appendVertexDefinitions: (src) => {
            snapVectorA.appendDefinitions(src);
            snapInvVectorAB.appendDefinitions(src);
            if (isSnapInit) {
                src.push("flat out vec4 vPickColor;");
            }
        },
        transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - ${snapVectorA}) * ${snapInvVectorAB} * ${clipPos}.w, ${clipPos}.zw)`,
        appendVertexOutputs: isSnapInit && ((src) => src.push(`vPickColor = ${geometryParameters.attributes.pickColor};`)),
        appendFragmentDefinitions: (src) => {
            layerNumber.appendDefinitions(src);
            coordinateScaler.appendDefinitions(src);
            if (isSnapInit) {
                src.push("flat in vec4 vPickColor;");
                src.push("layout(location = 0) out highp ivec4 outCoords;");
                src.push("layout(location = 1) out highp ivec4 outNormal;");
                src.push("layout(location = 2) out lowp uvec4 outPickColor;");
            } else {
                src.push("out highp ivec4 outCoords;");
            }
        },
        vertexCullX: (!isSnapInit) && "2.0",
        appendFragmentOutputs: (src, vWorldPosition) => {
            src.push(`outCoords = ivec4(${vWorldPosition} * ${coordinateScaler}.xyz, ${isSnapInit ? "-" : ""}${layerNumber});`);
            if (isSnapInit) {
                src.push(`outNormal = ${isPoints ? "ivec4(1.0)" : `ivec4(normalize(cross(dFdx(${vWorldPosition}), dFdy(${vWorldPosition}))) * float(${math.MAX_INT}), 1.0)`};`);
                src.push("outPickColor = uvec4(vPickColor);");
            }
        },
        setupInputs: (getUniformSetter) => {
            const setSnapVectorA      = snapVectorA.setupInputs(getUniformSetter);
            const setSnapInvVectorAB  = snapInvVectorAB.setupInputs(getUniformSetter);
            const setLayerNumber      = layerNumber.setupInputs(getUniformSetter);
            const setCoordinateScaler = coordinateScaler.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => {
                setSnapVectorA(frameCtx.snapVectorA);
                setSnapInvVectorAB(frameCtx.snapInvVectorAB);
                setLayerNumber(frameCtx.snapPickLayerNumber);
                setCoordinateScaler(frameCtx.snapPickCoordinateScale);
            };
        },

        dontCullOnAlphaZero: !isSnapInit
    };
};
