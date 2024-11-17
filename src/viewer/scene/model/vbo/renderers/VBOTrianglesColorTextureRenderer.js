import {VBORenderer, createLightSetup, createSAOSetup} from "../VBORenderer.js";
import {WEBGL_INFO} from "../../../webglInfo.js";

/**
 * @private
 */
export class VBOTrianglesColorTextureRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO, useAlphaCutoff) {
        const inputs = { };
        const gl = scene.canvas.gl;
        const lightSetup = createLightSetup(gl, scene._lightsState, false);
        const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
        const sao = withSAO && createSAOSetup(gl, scene);
        const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.

        super(scene, instancing, primitive, {
            progMode: "colorTextureMode", incrementDrawState: true, useAlphaCutoff: useAlphaCutoff,

            getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", gammaOutput, useAlphaCutoff ? "alphaCutoffYes" : "alphaCutoffNo"],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform mat3 uvDecodeMatrix;");
                src.push("out vec4 vViewPosition;");
                src.push("out vec2 vUV;");
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needUV: true,
            needMetallicRoughness: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                src.push(`vUV = (uvDecodeMatrix * vec3(${uv}, 1.0)).xy;`);
                src.push(`vColor = vec4(${color}) / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("uniform sampler2D uColorMap;");

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
            slicedColorIfClipping: true,
            needvWorldPosition: false,
            needGl_FragCoord: sao,
            needViewMatrixInFragment: true,
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix, gl_PointCoord) => {
                src.push("vec3 viewNormal = normalize(cross(dFdx(vViewPosition.xyz), dFdy(vViewPosition.xyz)));");
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(viewMatrix, "vViewPosition").forEach(light => {
                    src.push(`reflectedColor += max(dot(-viewNormal, ${light.direction}), 0.0) * ${light.color};`);
                });

                src.push(`vec4 color = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${sliceColorOr("vColor")};`);

                src.push("vec4 sampleColor = sRGBToLinear(texture(uColorMap, vUV));");

                if (useAlphaCutoff) {
                    src.push("if (sampleColor.a < materialAlphaCutoff) { discard; }");
                }

                src.push("vec4 colorTexel = color * sampleColor;");
                src.push("outColor = vec4(colorTexel.rgb" + (sao ? (" * " + sao.getAmbient(gl_FragCoord)) : "") + ", color.a);");

                if (gammaOutput) {
                    src.push("outColor = linearToGamma(outColor, gammaFactor);");
                }
            },
            setupInputs: (program) => {
                inputs.uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
                inputs.uColorMap = program.getSampler("uColorMap");
                if (gammaOutput) {
                    inputs.uGammaFactor = program.getLocation("gammaFactor");
                }
                inputs.setLightsRenderState = lightSetup.setupInputs(program);
                inputs.setSAOState = sao && sao.setupInputs(program);
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                const state = layer._state;
                gl.uniformMatrix3fv(inputs.uUVDecodeMatrix, false, state.uvDecodeMatrix);
                const colorTexture = state.textureSet.colorTexture;
                if (colorTexture) {
                    inputs.uColorMap.bindTexture(colorTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (gammaOutput) {
                    gl.uniform1f(inputs.uGammaFactor, scene.gammaFactor);
                }
                inputs.setLightsRenderState(frameCtx);
                inputs.setSAOState && inputs.setSAOState(frameCtx);
            }
        });
    }

}
