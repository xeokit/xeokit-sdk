import {LinearEncoding, sRGBEncoding} from "../../../constants/constants.js";
import {setupTexture} from "../../../webgl/WebGLRenderer.js";

export const ColorTextureProgram = function(programVariables, geometry, scene, lightSetup, sao, useAlphaCutoff, gammaOutput) {
    const colorTexture = setupTexture(programVariables, "sampler2D", "uColorMap", sRGBEncoding, (set, state) => {
        const texture = state.layerTextureSet.colorTexture;
        texture && set(texture.texture);
    });
    const materialAlphaCutoff = useAlphaCutoff && programVariables.createUniform("float", "materialAlphaCutoff", (set, state) => set(state.layerTextureSet.alphaCutoff));

    const attributes = geometry.attributes;
    const vViewPosition = programVariables.createVarying("vec3", "vViewPosition", () => `${attributes.position.view}.xyz`);
    const vUV           = programVariables.createVarying("vec2", "vUV",           () => attributes.uv);
    const vColor        = programVariables.createVarying("vec4", "vColor",        () => attributes.color);

    const outColor = programVariables.createOutput("vec4", "outColor");

    return {
        programName: "ColorTexture",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", !!gammaOutput, useAlphaCutoff ? "alphaCutoffYes" : "alphaCutoffNo"],
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord, sliceColorOr) => {
            src.push(`vec3 viewNormal = normalize(cross(dFdx(${vViewPosition}), dFdy(${vViewPosition})));`);
            src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
            lightSetup.directionalLights.forEach(light => {
                src.push(`reflectedColor += max(dot(viewNormal, ${light.getDirection(geometry.viewMatrix, vViewPosition)}), 0.0) * ${light.getColor()};`);
            });

            src.push(`vec4 color = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${sliceColorOr(vColor)};`);

            src.push(`vec4 sampleColor = ${colorTexture(vUV)};`);

            if (materialAlphaCutoff) {
                src.push(`if (sampleColor.a < ${materialAlphaCutoff}) { discard; }`);
            }

            src.push("vec4 colorTexel = color * sampleColor;");
            src.push(`${outColor} = vec4(colorTexel.rgb${(sao ? (" * " + sao.getAmbient(gl_FragCoord)) : "")}, color.a);`);

            getGammaOutputExpression && src.push(`${outColor} = ${getGammaOutputExpression(outColor)};`);
        },

        incrementDrawState: true
    };
};
