import {setup2dTexture} from "../LayerRenderer.js";

export const ColorTextureProgram = function(geometryParameters, scene, lightSetup, sao, useAlphaCutoff, gammaOutput) {
    const colorTexture = setup2dTexture("uColorMap", textureSet => textureSet.colorTexture);
    return {
        programName: "ColorTexture",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", gammaOutput, useAlphaCutoff ? "alphaCutoffYes" : "alphaCutoffNo"],
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => {
            src.push("out vec4 vViewPosition;");
            src.push("out vec2 vUV;");
            src.push("out vec4 vColor;");
        },
        appendVertexOutputs: (src) => {
            src.push(`vViewPosition = ${geometryParameters.attributes.position.view};`);
            src.push(`vUV = ${geometryParameters.attributes.uv};`);
            src.push(`vColor = ${geometryParameters.attributes.color};`);
        },
        appendFragmentDefinitions: (src) => {
            colorTexture.appendDefinitions(src);

            src.push("vec4 sRGBToLinear( in vec4 value ) {");
            src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
            src.push("}");
            if (gammaOutput) {
                src.push("uniform float gammaFactor;");
                src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                src.push("}");
            }

            lightSetup.appendDefinitions(src);
            sao && sao.appendDefinitions(src);

            if (useAlphaCutoff) {
                src.push("uniform float materialAlphaCutoff;");
            }

            src.push("in vec4 vViewPosition;");
            src.push("in vec2 vUV;");
            src.push("in vec4 vColor;");
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr) => {
            src.push("vec3 viewNormal = normalize(cross(dFdx(vViewPosition.xyz), dFdy(vViewPosition.xyz)));");
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            lightSetup.getDirectionalLights(geometryParameters.viewMatrix, "vViewPosition").forEach(light => {
                src.push(`reflectedColor += max(dot(-viewNormal, ${light.direction}), 0.0) * ${light.color};`);
            });

            src.push(`vec4 color = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${sliceColorOr("vColor")};`);

            src.push(`vec4 sampleColor = sRGBToLinear(${colorTexture.getValueExpression("vUV")});`);

            if (useAlphaCutoff) {
                src.push("if (sampleColor.a < materialAlphaCutoff) { discard; }");
            }

            src.push("vec4 colorTexel = color * sampleColor;");
            src.push("outColor = vec4(colorTexel.rgb" + (sao ? (" * " + sao.getAmbient(gl_FragCoord)) : "") + ", color.a);");

            if (gammaOutput) {
                src.push("outColor = linearToGamma(outColor, gammaFactor);");
            }
        },
        setupInputs: (getUniformSetter) => {
            const setColorMap          = colorTexture.setupInputs(getUniformSetter);
            const uGammaFactor         = gammaOutput && getUniformSetter("gammaFactor");
            const setLightsRenderState = lightSetup.setupInputs(getUniformSetter);
            const setSAOState          = sao && sao.setupInputs(getUniformSetter);
            const materialAlphaCutoff  = useAlphaCutoff && getUniformSetter("materialAlphaCutoff");

            return (frameCtx, textureSet) => {
                setColorMap(textureSet, frameCtx);
                uGammaFactor && uGammaFactor(scene.gammaFactor);
                setLightsRenderState(frameCtx);
                setSAOState && setSAOState(frameCtx);
                materialAlphaCutoff && materialAlphaCutoff(textureSet.alphaCutoff);
            };
        },

        incrementDrawState: true
    };
};
